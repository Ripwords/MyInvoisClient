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

type Task<T> = () => Promise<T>

interface Queue {
  running: number
  queue: Array<{ run: () => void; addedAt: number }>
  requestTimestamps: number[] // Track all request timestamps in the sliding window
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
  default: { max: 12, perMs: 60000 }, // 12 req/60s (minimum limit)
}

/**
 * Clean up old timestamps outside the sliding window
 */
function cleanupTimestamps(
  timestamps: number[],
  windowMs: number,
  now: number,
): number[] {
  return timestamps.filter(ts => now - ts < windowMs)
}

/**
 * Calculate when we can make the next request without exceeding the rate limit
 */
function getNextAvailableTime(
  timestamps: number[],
  max: number,
  windowMs: number,
  now: number,
): number {
  if (timestamps.length < max) {
    return now // Can execute immediately
  }

  // We're at the limit. Find when the oldest request will expire
  const oldestTimestamp = timestamps[0]
  if (!oldestTimestamp) {
    return now // Shouldn't happen, but fallback to now
  }
  return oldestTimestamp + windowMs
}

/**
 * Public helper to schedule a request according to the category's limits.
 * Rate limits are enforced per clientId, so multiple instances with the same
 * clientId will share rate limiters, while different clientIds get separate limiters.
 *
 * This implementation uses a sliding window to track all requests within the time window.
 */
export function queueRequest<T>(
  clientId: string,
  category: ApiCategory,
  task: Task<T>,
  debug = false,
): Promise<T> {
  const key = `${clientId}:${category}`
  if (!queues[key]) {
    queues[key] = {
      running: 0,
      queue: [],
      requestTimestamps: [],
      nextTimer: null,
    }
  }

  const queue = queues[key]!
  const { max, perMs } = LIMITS[category] ?? LIMITS.default

  return new Promise<T>((resolve, reject) => {
    const run = () => {
      const now = Date.now()

      // Clean up old timestamps before checking
      queue.requestTimestamps = cleanupTimestamps(
        queue.requestTimestamps,
        perMs,
        now,
      )

      // Check if we can execute now
      if (queue.requestTimestamps.length >= max) {
        // We've hit the rate limit, need to wait
        const nextAvailable = getNextAvailableTime(
          queue.requestTimestamps,
          max,
          perMs,
          now,
        )
        const waitTime = nextAvailable - now

        if (debug) {
          console.log(
            `[apiQueue] 🚫 Rate limit reached (${queue.requestTimestamps.length}/${max} in last ${perMs}ms). Queuing request. Need to wait ${waitTime.toFixed(0)}ms. Queue size: ${queue.queue.length + 1}`,
          )
        }

        // Re-queue this request to try again later
        queue.queue.push({ run, addedAt: now })
        // Don't call processQueue here - let the scheduled timer handle it
        // to avoid potential requeue loops
        return
      }

      // Record this request timestamp
      queue.requestTimestamps.push(now)
      queue.running++

      if (debug) {
        console.log(
          `[apiQueue] ▶️  Executing request (${category}). Requests in window: ${queue.requestTimestamps.length}/${max}. Running: ${queue.running}. Queue size: ${queue.queue.length}`,
        )
      }

      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          queue.running--
          if (debug) {
            console.log(
              `[apiQueue] ✅ Request completed (${category}). Requests in window: ${queue.requestTimestamps.length}/${max}. Running: ${queue.running}. Queue size: ${queue.queue.length}`,
            )
          }
          processQueue(key, debug, category)
        })
    }

    // Add to queue or run immediately
    const now = Date.now()
    queue.requestTimestamps = cleanupTimestamps(
      queue.requestTimestamps,
      perMs,
      now,
    )

    if (queue.queue.length > 0 || queue.requestTimestamps.length >= max) {
      // Either there's already a queue, or we're at the rate limit
      queue.queue.push({ run, addedAt: now })
      if (debug) {
        console.log(
          `[apiQueue] ⏳ Queued request (${category}). Requests in window: ${queue.requestTimestamps.length}/${max}. Queue size: ${queue.queue.length}`,
        )
      }
      processQueue(key, debug, category)
    } else {
      // Can run immediately
      run()
    }
  })
}

function processQueue(key: string, debug: boolean, category: ApiCategory) {
  const queue = queues[key]
  if (!queue || queue.queue.length === 0) return

  const { max, perMs } = LIMITS[category] ?? LIMITS.default
  const now = Date.now()

  // Clean up old timestamps
  queue.requestTimestamps = cleanupTimestamps(
    queue.requestTimestamps,
    perMs,
    now,
  )

  // Check if we can process the next request
  if (queue.requestTimestamps.length < max) {
    // We have capacity, process immediately
    const next = queue.queue.shift()
    if (next) {
      if (debug) {
        const waitTime = Date.now() - next.addedAt
        console.log(
          `[apiQueue] 🚀 Processing queued request (${category}). Waited: ${waitTime.toFixed(0)}ms. Queue size: ${queue.queue.length}`,
        )
      }
      next.run()
    }
    // After one runs, immediately try again (in case there's more space)
    if (queue.queue.length > 0) {
      processQueue(key, debug, category)
    }
  } else {
    // We're at capacity, schedule for when the oldest request expires
    const nextAvailable = getNextAvailableTime(
      queue.requestTimestamps,
      max,
      perMs,
      now,
    )
    const delay = Math.max(0, nextAvailable - now + 50) // +50ms buffer for timer precision

    if (debug) {
      console.log(
        `[apiQueue] ⏸️  Delaying queue processing (${category}). Will retry in ${delay.toFixed(0)}ms. Queue size: ${queue.queue.length}`,
      )
    }

    // Only schedule a timer if one isn't already scheduled
    // This prevents timer pile-up during bursts
    if (!queue.nextTimer) {
      queue.nextTimer = setTimeout(() => {
        queue.nextTimer = null
        processQueue(key, debug, category)
      }, delay)
    }
  }
}

/**
 * Cleanup function to clear all queues and timers for a specific client.
 * Useful for testing or cleanup on application shutdown.
 */
export function clearQueue(clientId: string, category?: ApiCategory) {
  if (category) {
    const key = `${clientId}:${category}`
    const queue = queues[key]
    if (queue) {
      if (queue.nextTimer) {
        clearTimeout(queue.nextTimer)
        queue.nextTimer = null
      }
      queue.queue = []
      queue.requestTimestamps = []
      queue.running = 0
    }
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
      }
    })
  }
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

  // Taxpayer QR code info
  if (cleanPath.includes('/taxpayer/qrcode')) return 'taxpayerQr'

  // Legacy matchers (kept for backward compatibility)
  if (cleanPath.includes('/searchtin')) return 'searchTin'
  if (cleanPath.includes('/qrcode')) return 'taxpayerQr'
  if (cleanPath.includes('/connect/token')) {
    return 'loginTaxpayer'
  }

  return 'default'
}
