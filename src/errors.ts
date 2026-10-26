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

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'MyInvoisApiError'
    this.status = status
    this.body = body
  }
}
