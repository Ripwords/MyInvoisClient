// A very small utility that provides per-endpoint request queuing with fixed-window rate-limits.
// The goal is to make sure that we never exceed the vendor-defined limits while also ensuring
// that every request is eventually executed.
//
// NOTE: This is intentionally minimal – no external dependencies are introduced.
// If you need more advanced features (persistence, jitter, etc.) consider a library such as `bottleneck`.

/*
Rate-limit specification (per 60-second window)
----------------------------------------------
Login as Taxpayer System         : 12
Login as Intermediary System     : 12
Submit Documents                 : 100
Get Submission                   : 300
Cancel Document                  : 12
Reject Document                  : 12
Get Document                     : 60
Get Document Details             : 125
Get Recent Documents             : 12
Search Documents                 : 12
Search Taxpayer's TIN            : 60
Taxpayer's QR Code               : 60
*/

export type ApiCategory =
  | 'loginTaxpayer'
  | 'loginIntermediary'
  | 'submitDocuments'
  | 'getSubmission'
  | 'cancelDocument'
  | 'rejectDocument'
  | 'getDocument'
  | 'getDocumentDetails'
  | 'getRecentDocuments'
  | 'searchDocuments'
  | 'searchTin'
  | 'taxpayerQr'
  | 'default'

interface RateLimitConfig {
  limit: number
  windowMs: number
}

const WINDOW = 60_000 // 60 seconds

// Hard-coded limits based on the specification above.
const RATE_LIMITS: Record<ApiCategory, RateLimitConfig> = {
  loginTaxpayer: { limit: 12, windowMs: WINDOW },
  loginIntermediary: { limit: 12, windowMs: WINDOW },
  submitDocuments: { limit: 100, windowMs: WINDOW },
  getSubmission: { limit: 300, windowMs: WINDOW },
  cancelDocument: { limit: 12, windowMs: WINDOW },
  rejectDocument: { limit: 12, windowMs: WINDOW },
  getDocument: { limit: 60, windowMs: WINDOW },
  getDocumentDetails: { limit: 125, windowMs: WINDOW },
  getRecentDocuments: { limit: 12, windowMs: WINDOW },
  searchDocuments: { limit: 12, windowMs: WINDOW },
  searchTin: { limit: 60, windowMs: WINDOW },
  taxpayerQr: { limit: 60, windowMs: WINDOW },
  default: { limit: 10_000, windowMs: WINDOW }, // effectively no limit
}

/**
 * A very small token-bucket style rate-limiter with queuing.
 * Instead of allowing a full-window burst (which could trigger a 429),
 * requests are spaced evenly so the throughput stays within the
 * <limit>/<window> budget at all times. Each category gets its own
 * instance so limits remain isolated.
 */
class RateLimiter {
  private readonly limit: number
  private readonly windowMs: number
  private readonly minInterval: number

  private queue: Array<() => void> = []
  private nextAvailable = 0 // timestamp (ms) when the next request can be executed
  private timer: NodeJS.Timeout | null = null

  constructor(config: RateLimitConfig) {
    this.limit = config.limit
    this.windowMs = config.windowMs
    const baseInterval = Math.ceil(this.windowMs / this.limit)
    const isTestEnv = process.env.NODE_ENV === 'test'
    const forceReal = process.env.APIQUEUE_REAL_INTERVAL === 'true'
    // In unit-test envs we collapse spacing unless explicitly forced back on.
    this.minInterval = isTestEnv && !forceReal ? 0 : baseInterval
  }

  private drainQueue() {
    if (this.queue.length === 0) {
      return
    }

    const now = Date.now()
    if (now < this.nextAvailable) {
      // Too early – schedule when we're allowed to execute next
      if (!this.timer) {
        this.timer = setTimeout(() => {
          this.timer = null
          this.drainQueue()
        }, this.nextAvailable - now)
      }
      return
    }

    // Execute the next queued task
    const next = this.queue.shift()!
    this.nextAvailable = Date.now() + this.minInterval
    next()

    // Attempt to drain further (may schedule another run if cannot execute immediately)
    this.drainQueue()
  }

  get queueSize() {
    return this.queue.length
  }

  schedule<T>(
    fn: () => Promise<T>,
    debug: boolean = false,
    category?: ApiCategory,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = () => {
        if (debug && category) {
          console.log(
            `[apiQueue] ▶️  Executing request (${category}). Remaining queue: ${this.queue.length}`,
          )
        }
        try {
          const result = fn()
          if (result && typeof (result as any).then === 'function') {
            ;(result as Promise<T>).then(resolve).catch(reject)
          } else {
            resolve(result as T)
          }
        } catch (err) {
          reject(err)
        }
      }

      if (debug && category) {
        console.log(
          `[apiQueue] ⏳ Queued request (${category}). Queue length before push: ${this.queue.length}`,
        )
      }

      this.queue.push(execute)
      this.drainQueue()
    })
  }
}

// A shared registry of limiters keyed by category
const limiterRegistry = new Map<ApiCategory, RateLimiter>()

function getLimiter(category: ApiCategory): RateLimiter {
  if (!limiterRegistry.has(category)) {
    limiterRegistry.set(category, new RateLimiter(RATE_LIMITS[category]))
  }
  // Non-null because we just set it if missing.
  return limiterRegistry.get(category) as RateLimiter
}

/**
 * Public helper to schedule a request according to the category's limits.
 */
export function queueRequest<T>(
  category: ApiCategory,
  fn: () => Promise<T>,
  debug: boolean = false,
): Promise<T> {
  const limiter = getLimiter(category)
  return limiter.schedule(fn, debug, category)
}

/**
 * Very naive path-based category detection. If no matcher fits, the `default` category
 * (effectively unlimited) is returned. Adjust these heuristics as your API surface evolves.
 */
export function categorizeRequest(
  path: string,
  method: string = 'GET',
): ApiCategory {
  const cleanPath = path.toLowerCase()
  const isPost = method?.toUpperCase() === 'POST'

  if (cleanPath.includes('/documentsubmissions')) {
    return isPost ? 'submitDocuments' : 'getSubmission'
  }

  if (cleanPath.includes('/documentmanagement')) {
    if (cleanPath.endsWith('/cancel')) return 'cancelDocument'
    if (cleanPath.endsWith('/reject')) return 'rejectDocument'
    if (cleanPath.endsWith('/details')) return 'getDocumentDetails'
    if (cleanPath.includes('/recent')) return 'getRecentDocuments'
    // Fallbacks inside document management
    return method === 'GET' ? 'getDocument' : 'searchDocuments'
  }

  if (cleanPath.includes('/searchtin')) return 'searchTin'
  if (cleanPath.includes('/qrcode')) return 'taxpayerQr'
  if (cleanPath.includes('/connect/token')) {
    // Distinguish between taxpayer & intermediary based on path hint if possible
    return 'loginTaxpayer'
  }

  // -----------------------------
  // New path matchers (v1.0 endpoints)
  // -----------------------------

  // Search Documents
  if (cleanPath.includes('/documents/search')) {
    return 'searchDocuments'
  }

  // Document raw content
  if (/\/documents\/[^/]+\/raw$/.test(cleanPath)) {
    return 'getDocument'
  }

  // Document details
  if (/\/documents\/[^/]+\/details$/.test(cleanPath)) {
    return 'getDocumentDetails'
  }

  // Document state actions (cancel/reject)
  if (cleanPath.includes('/documents/state/')) {
    return isPost ? 'cancelDocument' : 'getDocument'
  }

  // Taxpayer TIN search & validation share same limit bucket
  if (cleanPath.includes('/taxpayer/search/tin')) return 'searchTin'
  if (cleanPath.includes('/taxpayer/validate/')) return 'searchTin'

  // Taxpayer QR code info
  if (cleanPath.includes('/taxpayer/qrcode')) return 'taxpayerQr'

  return 'default'
}
