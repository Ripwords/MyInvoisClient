// A very small utility that provides per-endpoint request queuing with rate-limits.
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

The docs state no limit for Get Document Types / Get Document Type /
Get Document Type Version / Get Notifications; those use the
`platform` category below with a conservative 60/min.
Source: https://sdk.myinvois.hasil.gov.my/integration-practices/
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
  | 'platform'
  | 'default'

type Task<T> = () => Promise<T>

/**
 * Pluggable backend for the rate-limit window, so multiple processes can
 * share one limiter (e.g. backed by Redis or Postgres).
 *
 * `tryAcquire` must atomically either record one request under `key` inside
 * the sliding window and return `{ ok: true }`, or — when the window already
 * holds `max` requests — return `{ ok: false, retryAfterMs }` without
 * recording anything, where `retryAfterMs` is how long until a slot frees up.
 */
export interface RateLimitStore {
  tryAcquire(
    key: string,
    max: number,
    windowMs: number,
  ): Promise<{ ok: true } | { ok: false; retryAfterMs: number }>
  /** Drop all recorded requests for a key. */
  reset?(key: string): void | Promise<void>
}

/**
 * Default store: an in-process sliding window of request timestamps. All
 * client instances in the same process share it, so instances with the same
 * clientId share rate limiters (the official limits are per clientId).
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, number[]>()

  tryAcquire(
    key: string,
    max: number,
    windowMs: number,
  ): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
    const now = Date.now()
    const timestamps = (this.windows.get(key) ?? []).filter(
      ts => now - ts < windowMs,
    )
    if (timestamps.length >= max) {
      this.windows.set(key, timestamps)
      const oldest = timestamps[0]!
      return Promise.resolve({
        ok: false,
        retryAfterMs: Math.max(0, oldest + windowMs - now),
      })
    }
    timestamps.push(now)
    this.windows.set(key, timestamps)
    return Promise.resolve({ ok: true })
  }

  reset(key: string): void {
    this.windows.delete(key)
  }
}

const defaultRateLimitStore = new InMemoryRateLimitStore()

interface Queue {
  running: number
  queue: Array<{ run: () => void; addedAt: number }>
  nextTimer: NodeJS.Timeout | null // Track scheduled timer to avoid pile-up
}

const queues: Record<string, Queue> = {}

// Rate limits: max requests per time window (in ms)
const LIMITS: Record<ApiCategory, { max: number; perMs: number }> = {
  loginTaxpayer: { max: 12, perMs: 60000 }, // 12 req/60s
  loginIntermediary: { max: 12, perMs: 60000 }, // 12 req/60s
  submitDocuments: { max: 100, perMs: 60000 }, // 100 req/60s
  getSubmission: { max: 300, perMs: 60000 }, // 300 req/60s
  cancelDocument: { max: 12, perMs: 60000 }, // 12 req/60s
  rejectDocument: { max: 12, perMs: 60000 }, // 12 req/60s
  getDocument: { max: 60, perMs: 60000 }, // 60 req/60s
  getDocumentDetails: { max: 125, perMs: 60000 }, // 125 req/60s
  getRecentDocuments: { max: 12, perMs: 60000 }, // 12 req/60s
  searchDocuments: { max: 12, perMs: 60000 }, // 12 req/60s
  searchTin: { max: 60, perMs: 60000 }, // 60 req/60s
  taxpayerQr: { max: 60, perMs: 60000 }, // 60 req/60s
  platform: { max: 60, perMs: 60000 }, // document types & notifications — no official limit, conservative 60/60s
  default: { max: 12, perMs: 60000 }, // 12 req/60s — most conservative bucket for unrecognised paths
}

/**
 * Public helper to schedule a request according to the category's limits.
 * Rate limits are enforced per clientId, so multiple instances with the same
 * clientId will share rate limiters, while different clientIds get separate limiters.
 *
 * The sliding window lives in the `store` (default: in-process). Pending-run
 * closures and retry timers always stay in-process; a shared store only
 * decides whether a slot is free right now.
 */
export function queueRequest<T>(
  clientId: string,
  category: ApiCategory,
  task: Task<T>,
  debug = false,
  store: RateLimitStore = defaultRateLimitStore,
): Promise<T> {
  const key = `${clientId}:${category}`
  if (!queues[key]) {
    queues[key] = {
      running: 0,
      queue: [],
      nextTimer: null,
    }
  }

  const queue = queues[key]!
  const { max, perMs } = LIMITS[category] ?? LIMITS.default

  return new Promise<T>((resolve, reject) => {
    const run = () => {
      store
        .tryAcquire(key, max, perMs)
        .then(acquired => {
          if (!acquired.ok) {
            if (debug) {
              console.log(
                `[apiQueue] 🚫 Rate limit reached (${category}, max ${max}/${perMs}ms). Queuing request. Need to wait ${acquired.retryAfterMs.toFixed(0)}ms. Queue size: ${queue.queue.length + 1}`,
              )
            }
            // Re-queue and let the scheduled timer retry when a slot frees up
            queue.queue.push({ run, addedAt: Date.now() })
            scheduleRetry(queue, acquired.retryAfterMs, () =>
              processQueue(key, debug, category, store),
            )
            return
          }

          queue.running++
          if (debug) {
            console.log(
              `[apiQueue] ▶️  Executing request (${category}). Running: ${queue.running}. Queue size: ${queue.queue.length}`,
            )
          }

          // The window may still have capacity for queued requests
          processQueue(key, debug, category, store)

          task()
            .then(resolve)
            .catch(reject)
            .finally(() => {
              queue.running--
              if (debug) {
                console.log(
                  `[apiQueue] ✅ Request completed (${category}). Running: ${queue.running}. Queue size: ${queue.queue.length}`,
                )
              }
              processQueue(key, debug, category, store)
            })
        })
        .catch(reject)
    }

    if (queue.queue.length > 0) {
      // Preserve FIFO order behind already-waiting requests
      queue.queue.push({ run, addedAt: Date.now() })
      if (debug) {
        console.log(
          `[apiQueue] ⏳ Queued request (${category}). Queue size: ${queue.queue.length}`,
        )
      }
      processQueue(key, debug, category, store)
    } else {
      run()
    }
  })
}

function scheduleRetry(queue: Queue, delayMs: number, retry: () => void) {
  // Only schedule a timer if one isn't already scheduled — prevents
  // timer pile-up during bursts.
  if (queue.nextTimer) return
  queue.nextTimer = setTimeout(
    () => {
      queue.nextTimer = null
      retry()
    },
    Math.max(0, delayMs) + 50, // +50ms buffer for timer precision
  )
}

function processQueue(
  key: string,
  debug: boolean,
  category: ApiCategory,
  store: RateLimitStore,
) {
  const queue = queues[key]
  if (!queue || queue.queue.length === 0) return
  // A retry timer is pending; let it drain the queue when it fires so we
  // don't hammer the store while the window is known to be full.
  if (queue.nextTimer) return

  const next = queue.queue.shift()
  if (next) {
    if (debug) {
      const waitTime = Date.now() - next.addedAt
      console.log(
        `[apiQueue] 🚀 Processing queued request (${category}). Waited: ${waitTime.toFixed(0)}ms. Queue size: ${queue.queue.length}`,
      )
    }
    // run() either executes (and chains the next processQueue) or re-queues
    // itself and schedules the retry timer.
    next.run()
  }
}

/**
 * Cleanup function to clear all queues and timers for a specific client.
 * Useful for testing or cleanup on application shutdown.
 */
export function clearQueue(clientId: string, category?: ApiCategory): void {
  if (category) {
    const key = `${clientId}:${category}`
    const queue = queues[key]
    if (queue) {
      if (queue.nextTimer) {
        clearTimeout(queue.nextTimer)
        queue.nextTimer = null
      }
      queue.queue = []
      queue.running = 0
    }
    defaultRateLimitStore.reset(key)
  } else {
    // Clear all queues for this client
    Object.keys(queues).forEach(key => {
      if (key.startsWith(`${clientId}:`)) {
        const queue = queues[key]
        if (queue?.nextTimer) {
          clearTimeout(queue.nextTimer)
          queue.nextTimer = null
        }
        delete queues[key]
        defaultRateLimitStore.reset(key)
      }
    })
  }
}

/**
 * Very naive path-based category detection. If no matcher fits, the
 * conservative `default` category (12 requests/minute) is returned.
 * Adjust these heuristics as your API surface evolves.
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

  // -----------------------------
  // v1.0 API endpoint matchers
  // -----------------------------

  // Get Recent Documents - /api/v1.0/documents/recent
  if (cleanPath.includes('/documents/recent')) {
    return 'getRecentDocuments'
  }

  // Search Documents - /api/v1.0/documents/search
  if (cleanPath.includes('/documents/search')) {
    return 'searchDocuments'
  }

  // Document state actions (cancel/reject) - PUT /api/v1.0/documents/state/{uuid}/state
  // Both cancel and reject use the same endpoint, differentiated only by request body
  if (cleanPath.includes('/documents/state/') && cleanPath.endsWith('/state')) {
    // Both cancelDocument and rejectDocument share the same rate limit (12 RPM)
    // Use cancelDocument category for both since they share the same bucket
    return 'cancelDocument'
  }

  // Document raw content - /api/v1.0/documents/{uuid}/raw
  if (/\/documents\/[^/]+\/raw$/.test(cleanPath)) {
    return 'getDocument'
  }

  // Document details - /api/v1.0/documents/{uuid}/details
  if (/\/documents\/[^/]+\/details$/.test(cleanPath)) {
    return 'getDocumentDetails'
  }

  // Taxpayer TIN search & validation share same limit bucket
  if (cleanPath.includes('/taxpayer/search/tin')) return 'searchTin'
  if (cleanPath.includes('/taxpayer/validate/')) return 'searchTin'

  // Taxpayer QR code info — the live route is plural `/taxpayers/qrcodeinfo`
  if (cleanPath.includes('/taxpayers/qrcodeinfo')) return 'taxpayerQr'
  if (cleanPath.includes('/taxpayer/qrcode')) return 'taxpayerQr'

  // Platform APIs (document types, notifications) — no documented limit
  if (cleanPath.includes('/documenttypes')) return 'platform'
  if (cleanPath.includes('/notifications/')) return 'platform'

  // Legacy matchers (kept for backward compatibility)
  if (cleanPath.includes('/searchtin')) return 'searchTin'
  if (cleanPath.includes('/qrcode')) return 'taxpayerQr'
  if (cleanPath.includes('/connect/token')) {
    return 'loginTaxpayer'
  }

  return 'default'
}
