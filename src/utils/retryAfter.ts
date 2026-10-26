/**
 * Parse an HTTP `Retry-After` header into a wait in milliseconds.
 *
 * Accepts both header forms: delay-seconds (`"120"`) and HTTP-date
 * (`"Wed, 21 Oct 2026 07:28:00 GMT"`). A missing or unparseable header
 * falls back to 5 seconds; the result is capped at `maxDelayMs`.
 */
export function parseRetryAfterMs(
  header: string | null | undefined,
  maxDelayMs = 60_000,
): number {
  const FALLBACK_MS = 5_000
  let ms = FALLBACK_MS

  if (header) {
    const seconds = Number(header)
    if (Number.isFinite(seconds)) {
      ms = Math.max(0, seconds * 1000)
    } else {
      const date = Date.parse(header)
      ms = isNaN(date) ? FALLBACK_MS : Math.max(0, date - Date.now())
    }
  }

  return Math.min(ms, maxDelayMs)
}
