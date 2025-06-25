import { describe, it, expect, vi, afterAll } from 'vitest'
import { queueRequest } from '../src/utils/apiQueue'

// Ensure the rate-limiter runs with real spacing (not the test shortcut)
const previousFlag = process.env.APIQUEUE_REAL_INTERVAL
process.env.APIQUEUE_REAL_INTERVAL = 'true'

// Restore after tests
afterAll(() => {
  if (previousFlag === undefined) {
    delete process.env.APIQUEUE_REAL_INTERVAL
  } else {
    process.env.APIQUEUE_REAL_INTERVAL = previousFlag
  }
})

describe('apiQueue Rate Limiter', () => {
  it('enforces per-category limits within a 60 s window', async () => {
    vi.useFakeTimers()

    const category = 'cancelDocument' as const // limit = 12 / 60s
    const start = Date.now()
    const executionTimestamps: number[] = []

    const promises = Array.from({ length: 15 }).map((_, idx) =>
      queueRequest(category, () => {
        executionTimestamps.push(Date.now() - start)
        return Promise.resolve(idx)
      }),
    )

    // Immediately process any tasks possible in the current tick
    await vi.runAllTicks()

    // With a token-bucket limiter, executions should be evenly spaced.
    // Cancel Document → 12 calls / 60 000 ms ⇒ 5 000 ms between calls.

    // Initially, only the first call can run immediately.
    expect(executionTimestamps.length).toBe(1)

    // Advance timers by 60 000 ms – we should now have executed 13 calls:
    // 12 within the first window (ending at 55s) plus the first call of the next window.
    await vi.advanceTimersByTimeAsync(60_000)
    await vi.runAllTicks()
    expect(executionTimestamps.length).toBe(13)

    // Advance another 10 000 ms to allow the remaining 2 calls (total 15).
    await vi.advanceTimersByTimeAsync(10_000)
    await vi.runAllTicks()
    expect(executionTimestamps.length).toBe(15)

    await Promise.all(promises)

    // Validate spacing: each subsequent execution ≥ 5 000 ms after the previous one.
    for (let i = 1; i < executionTimestamps.length; i++) {
      const diff = executionTimestamps[i] - executionTimestamps[i - 1]
      expect(diff).toBeGreaterThanOrEqual(4_999) // allow ±1 ms jitter
    }
  })
})
