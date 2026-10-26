import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  MyInvoisClient,
  MyInvoisApiError,
  MyInvoisRateLimitError,
  InMemoryTokenStore,
} from '../../src'
import { getTestCredentials } from '../fixtures/test-credentials'

// Every non-OK MyInvois answer must surface as a typed MyInvoisApiError so
// callers can tell "rate-limited, retry later" from "rejected" from "outage"
// without parsing messages — and never as a JSON SyntaxError or as an error
// body dressed up as a successful return value.

const buildClient = () => {
  const { certificatePem, privateKeyPem } = getTestCredentials()
  return MyInvoisClient.create({
    clientId: `errors-client-${Math.random().toString(36).slice(2)}`,
    clientSecret: 'secret',
    environment: 'sandbox',
    certificatePem,
    privateKeyPem,
    debug: false,
    tokenStore: new InMemoryTokenStore(),
    retryOn429: false,
  })
}

const response = (
  status: number,
  body: string,
  headers: Record<string, string> = {},
) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name] ?? null },
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
  }) as unknown as Response

const login = () =>
  response(200, JSON.stringify({ access_token: 'token', expires_in: 3600 }))

/** Logins succeed; API calls get the queued responses in order. */
const stubApi = (...apiResponses: Response[]) => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          String(url).includes('/connect/token')
            ? login()
            : (apiResponses.shift() ??
                response(500, 'no more stubbed responses')),
        ),
      ),
  )
}

const prebuilt = {
  format: 'JSON' as const,
  document: 'e30=',
  documentHash: 'hash',
  codeNumber: 'INV-1',
  signedDocument: {} as never,
}

const caught = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected the call to throw')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('non-OK responses become typed errors', () => {
  it('a 429 with an empty body on submit throws MyInvoisRateLimitError with the Retry-After wait', async () => {
    stubApi(response(429, '', { 'Retry-After': '7' }))

    const err = await caught(buildClient().submitDocument([prebuilt]))

    expect(err).toBeInstanceOf(MyInvoisRateLimitError)
    expect(err).toBeInstanceOf(MyInvoisApiError)
    expect((err as MyInvoisRateLimitError).status).toBe(429)
    expect((err as MyInvoisRateLimitError).retryAfterMs).toBe(7000)
  })

  it('a 400 on submit throws with the parsed LHDN error instead of returning it as data', async () => {
    const lhdnError = {
      error: {
        code: 'BadStructure',
        message: 'Submission structure is invalid',
        target: 'documents',
        details: [],
      },
    }
    stubApi(response(400, JSON.stringify(lhdnError)))

    const err = await caught(buildClient().submitDocument([prebuilt]))

    expect(err).toBeInstanceOf(MyInvoisApiError)
    expect(err).not.toBeInstanceOf(MyInvoisRateLimitError)
    expect((err as MyInvoisApiError).status).toBe(400)
    expect((err as MyInvoisApiError).apiError?.code).toBe('BadStructure')
  })

  it('a 500 with a non-JSON body throws MyInvoisApiError keeping the raw body', async () => {
    stubApi(response(500, '<html>Service Unavailable</html>'))

    const err = await caught(buildClient().getDocumentDetails('doc-1'))

    expect(err).toBeInstanceOf(MyInvoisApiError)
    expect((err as MyInvoisApiError).status).toBe(500)
    expect((err as MyInvoisApiError).body).toBe(
      '<html>Service Unavailable</html>',
    )
    expect((err as MyInvoisApiError).apiError).toBeUndefined()
  })

  it('a refused cancel (past 72 h) throws with the LHDN error code', async () => {
    stubApi(
      response(
        400,
        JSON.stringify({
          error: {
            code: 'OperationPeriodOver',
            message: 'The time limit for cancellation has expired',
            target: 'doc-1',
            details: [],
          },
        }),
      ),
    )

    const err = await caught(
      buildClient().cancelDocument('doc-1', 'Wrong buyer'),
    )

    expect((err as MyInvoisApiError).status).toBe(400)
    expect((err as MyInvoisApiError).apiError?.code).toBe('OperationPeriodOver')
  })

  it('verifyTin still answers false for a 404', async () => {
    stubApi(response(404, ''))

    await expect(
      buildClient().verifyTin('C1234567890', 'BRN', '201901234567'),
    ).resolves.toBe(false)
  })

  it('a failed login throws MyInvoisApiError with the error description', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(
          400,
          JSON.stringify({
            error: 'invalid_client',
            error_description: 'invalid_client',
          }),
        ),
      ),
    )

    const err = await caught(buildClient().getDocumentTypes())

    expect(err).toBeInstanceOf(MyInvoisApiError)
    expect((err as MyInvoisApiError).status).toBe(400)
    expect((err as MyInvoisApiError).message).toContain('invalid_client')
  })
})

describe('getSubmissionStatus error classification', () => {
  it('throws a 401 instead of reporting it as TimedOut', async () => {
    stubApi(response(401, ''))

    const err = await caught(buildClient().getSubmissionStatus('sub-1', 1, 3))

    expect(err).toBeInstanceOf(MyInvoisApiError)
    expect((err as MyInvoisApiError).status).toBe(401)
  })

  it('retries a 404 for a just-accepted submission (preprod lags behind the 202)', async () => {
    stubApi(
      response(
        404,
        JSON.stringify({
          error: {
            code: 'NotFound',
            message: null,
            target: 'GetSubmissionDetailsQueryHandler',
            details: [],
          },
        }),
      ),
      response(
        200,
        JSON.stringify({ overallStatus: 'Valid', documentSummary: [] }),
      ),
    )

    const result = await buildClient().getSubmissionStatus('sub-1', 1, 3)

    expect(result.status).toBe('Valid')
  })

  it('still retries through a 5xx and returns the terminal status', async () => {
    stubApi(
      response(503, 'busy'),
      response(
        200,
        JSON.stringify({ overallStatus: 'Valid', documentSummary: [] }),
      ),
    )

    const result = await buildClient().getSubmissionStatus('sub-1', 1, 3)

    expect(result.status).toBe('Valid')
  })

  it('still retries through a 429 and returns the terminal status', async () => {
    stubApi(
      response(429, '', { 'Retry-After': '0' }),
      response(
        200,
        JSON.stringify({ overallStatus: 'Invalid', documentSummary: [] }),
      ),
    )

    const result = await buildClient().getSubmissionStatus('sub-1', 1, 3)

    expect(result.status).toBe('Invalid')
  })
})
