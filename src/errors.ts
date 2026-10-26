import type { StandardError } from './types'
import { parseRetryAfterMs } from './utils/retryAfter'

/**
 * Error thrown for non-OK MyInvois API responses, carrying the HTTP status
 * and raw body so callers can classify failures structurally instead of
 * parsing the message — e.g. `err.status === 404` for "not registered"
 * versus 429/5xx for "transient, retry later".
 *
 * Still an `Error` with a descriptive message, so existing `catch` blocks
 * keep working.
 */
export class MyInvoisApiError extends Error {
  /** HTTP status code of the failed response. */
  readonly status: number
  /** Raw response body text (often empty, e.g. searchTin 404). */
  readonly body: string
  /**
   * The LHDN error object when the body carries one (`{ error: {...} }` or a
   * bare `{ code, message, ... }`), e.g. `apiError.code === 'OperationPeriodOver'`
   * for a cancel attempted after 72 hours. Undefined for empty or non-JSON
   * bodies.
   */
  readonly apiError?: StandardError

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'MyInvoisApiError'
    this.status = status
    this.body = body
    this.apiError = parseStandardError(body)
  }
}

/**
 * A 429 that is still a 429 after the client's automatic back-off
 * (`retryOn429`) ran out, or with back-off disabled. `retryAfterMs` is the
 * server's `Retry-After` wait (5s when absent, capped at 60s).
 */
export class MyInvoisRateLimitError extends MyInvoisApiError {
  readonly retryAfterMs: number

  constructor(message: string, body: string, retryAfterMs: number) {
    super(message, 429, body)
    this.name = 'MyInvoisRateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

const parseStandardError = (body: string): StandardError | undefined => {
  try {
    const parsed = JSON.parse(body)
    const candidate = parsed?.error ?? parsed
    return typeof candidate === 'object' &&
      candidate !== null &&
      typeof candidate.code === 'string'
      ? (candidate as StandardError)
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Builds the typed error for a non-OK response. `action` completes the
 * message "Failed to <action> (HTTP <status>): <body>".
 */
export async function toApiError(
  response: Response,
  action: string,
): Promise<MyInvoisApiError> {
  const body = await response.text()
  const message = `Failed to ${action} (HTTP ${response.status}): ${body}`

  return response.status === 429
    ? new MyInvoisRateLimitError(
        message,
        body,
        parseRetryAfterMs(response.headers?.get?.('Retry-After')),
      )
    : new MyInvoisApiError(message, response.status, body)
}

/** Throws the typed error for a non-OK response; returns for 2xx. */
export async function ensureOk(
  response: Response,
  action: string,
): Promise<void> {
  if (!response.ok) throw await toApiError(response, action)
}
