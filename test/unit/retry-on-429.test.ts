import { describe, it, expect, vi, afterEach } from 'vitest'
import { MyInvoisClient, MyInvoisApiError, InMemoryTokenStore } from '../../src'
import { parseRetryAfterMs } from '../../src/utils/retryAfter'
import { getTestCredentials } from '../fixtures/test-credentials'

const buildClient = (
  retryOn429?: false | { maxRetries?: number; maxDelayMs?: number },
) => {
  const { certificatePem, privateKeyPem } = getTestCredentials()
  const tokenStore = new InMemoryTokenStore()
  const client = MyInvoisClient.create({
    clientId: `retry-client-${Math.random().toString(36).slice(2)}`,
    clientSecret: 'secret',
    environment: 'sandbox',
    certificatePem,
    privateKeyPem,
    debug: false,
    tokenStore,
    ...(retryOn429 !== undefined ? { retryOn429 } : {}),
  })
  return { client, tokenStore }
}

const loginResponse = (token = 'token') =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ access_token: token, expires_in: 3600 }),
  }) as Response

const apiResponse = (status: number, retryAfter?: string) =>
  ({
    ok: status < 400,
    status,
    headers: { get: (name: string) => (name === 'Retry-After' ? (retryAfter ?? null) : null) },
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
  }) as unknown as Response

/** Stub global fetch with a queue of API responses; logins always succeed. */
const stubFetch = (apiResponses: Response[]) => {
  const mockFetch = vi.fn().mockImplementation((url: string) => {
    if (String(url).includes('/connect/token')) {
      return Promise.resolve(loginResponse())
    }
    return Promise.resolve(apiResponses.shift() ?? apiResponse(200))
  })
  vi.stubGlobal('fetch', mockFetch)
  return mockFetch
}

const apiCalls = (mockFetch: ReturnType<typeof vi.fn>) =>
  mockFetch.mock.calls.filter(
    ([url]) => !String(url).includes('/connect/token'),
  )

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('parseRetryAfterMs', () => {
  it('parses delay-seconds', () => {
    expect(parseRetryAfterMs('2')).toBe(2000)
    expect(parseRetryAfterMs('0')).toBe(0)
  })

  it('clamps negative seconds to zero', () => {
    expect(parseRetryAfterMs('-5')).toBe(0)
  })

  it('parses an HTTP-date relative to now', () => {
    const ms = parseRetryAfterMs(new Date(Date.now() + 10_000).toUTCString())
    expect(ms).toBeGreaterThan(8_000)
    expect(ms).toBeLessThanOrEqual(10_000)
  })

  it('treats a past HTTP-date as zero wait', () => {
    expect(parseRetryAfterMs(new Date(Date.now() - 10_000).toUTCString())).toBe(
      0,
    )
  })

  it('falls back to 5s on missing or garbage headers', () => {
    expect(parseRetryAfterMs(null)).toBe(5000)
    expect(parseRetryAfterMs(undefined)).toBe(5000)
    expect(parseRetryAfterMs('soon™')).toBe(5000)
  })

  it('caps at maxDelayMs', () => {
    expect(parseRetryAfterMs('120')).toBe(60_000)
    expect(parseRetryAfterMs('120', 10_000)).toBe(10_000)
  })
})

describe('429 Retry-After back-off', () => {
  it('waits the Retry-After seconds, then retries and succeeds', async () => {
    vi.useFakeTimers()
    const { client } = buildClient()
    const mockFetch = stubFetch([apiResponse(429, '2'), apiResponse(200)])

    const promise = client.verifyTin('C26135266000', 'BRN', '201901030382')

    await vi.advanceTimersByTimeAsync(0)
    expect(apiCalls(mockFetch)).toHaveLength(1)

    // Not yet — Retry-After says 2s
    await vi.advanceTimersByTimeAsync(1_000)
    expect(apiCalls(mockFetch)).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(1_100)
    await expect(promise).resolves.toBe(true)
    expect(apiCalls(mockFetch)).toHaveLength(2)
  })

  it('honours an HTTP-date Retry-After', async () => {
    vi.useFakeTimers()
    const { client } = buildClient()
    const retryAt = new Date(Date.now() + 10_000).toUTCString()
    const mockFetch = stubFetch([apiResponse(429, retryAt), apiResponse(200)])

    const promise = client.verifyTin('C26135266000', 'BRN', '201901030382')

    await vi.advanceTimersByTimeAsync(5_000)
    expect(apiCalls(mockFetch)).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(6_000)
    await expect(promise).resolves.toBe(true)
    expect(apiCalls(mockFetch)).toHaveLength(2)
  })

  it('caps the wait at maxDelayMs', async () => {
    vi.useFakeTimers()
    const { client } = buildClient({ maxDelayMs: 1_000 })
    const mockFetch = stubFetch([apiResponse(429, '120'), apiResponse(200)])

    const promise = client.verifyTin('C26135266000', 'BRN', '201901030382')

    // 120s requested, but capped at 1s
    await vi.advanceTimersByTimeAsync(1_100)
    await expect(promise).resolves.toBe(true)
    expect(apiCalls(mockFetch)).toHaveLength(2)
  })

  it('gives up after maxRetries and returns the final 429', async () => {
    vi.useFakeTimers()
    const { client } = buildClient({ maxRetries: 2 })
    const mockFetch = stubFetch([
      apiResponse(429, '1'),
      apiResponse(429, '1'),
      apiResponse(429, '1'),
      apiResponse(200), // must never be reached
    ])

    // verifyTin surfaces the raw 429 as a MyInvoisApiError once retries are spent
    const promise = client.verifyTin('C26135266000', 'BRN', '201901030382')
    promise.catch(() => {}) // settle handler before timers advance
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(promise).rejects.toThrow(MyInvoisApiError)
    await promise.catch((err: MyInvoisApiError) => expect(err.status).toBe(429))
    expect(apiCalls(mockFetch)).toHaveLength(3) // initial + 2 retries
  })

  it('retryOn429: false surfaces the 429 without retrying', async () => {
    const { client } = buildClient(false)
    const mockFetch = stubFetch([apiResponse(429, '1'), apiResponse(200)])

    const failure = client.verifyTin('C26135266000', 'BRN', '201901030382')
    await expect(failure).rejects.toThrow(MyInvoisApiError)
    await failure.catch((err: MyInvoisApiError) => expect(err.status).toBe(429))
    expect(apiCalls(mockFetch)).toHaveLength(1)
  })
})

describe('token refresh across updateOnBehalfOf (regression)', () => {
  it('a login in flight during the switch is cached under its own key, and the new TIN gets its own login', async () => {
    const { certificatePem, privateKeyPem } = getTestCredentials()
    const tokenStore = new InMemoryTokenStore()
    const client = MyInvoisClient.create({
      clientId: 'switch-client',
      clientSecret: 'secret',
      environment: 'sandbox',
      certificatePem,
      privateKeyPem,
      debug: false,
      tokenStore,
    })

    // Logins resolve only when released, and each returns a token naming the
    // TIN it was requested for (taken from the onbehalfof header).
    const release: Array<() => void> = []
    const mockFetch = vi.fn().mockImplementation((url: string, options) => {
      if (String(url).includes('/connect/token')) {
        const obo =
          (options?.headers as Record<string, string>)?.onbehalfof ?? ''
        return new Promise(resolve => {
          release.push(() =>
            resolve(loginResponse(`token-for-${obo || 'self'}`)),
          )
        })
      }
      return Promise.resolve(apiResponse(200))
    })
    vi.stubGlobal('fetch', mockFetch)

    // Start a request that triggers a login for the base identity…
    const firstCall = client.verifyTin('C26135266000', 'BRN', '201901030382')
    await Promise.resolve()

    // …then switch taxpayer while that login is still in flight.
    const switchPromise = client.updateOnBehalfOf('C9876543210')
    await Promise.resolve()

    release.forEach(fn => fn())
    await Promise.all([firstCall, switchPromise])

    // Each login landed under the key it was started for.
    expect((await tokenStore.get('switch-client:'))?.token).toBe(
      'token-for-self',
    )
    expect((await tokenStore.get('switch-client:C9876543210'))?.token).toBe(
      'token-for-C9876543210',
    )
  })
})
