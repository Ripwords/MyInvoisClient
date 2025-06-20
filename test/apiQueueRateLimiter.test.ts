import { describe, it, expect, vi } from 'vitest'
import { queueRequest } from '../src/utils/apiQueue'

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

    // First window: only 12 executions allowed
    expect(executionTimestamps.length).toBe(12)

    // Advance fake timers by 60s to open a new window
    await vi.advanceTimersByTimeAsync(60_001)
    await vi.runAllTicks()

    expect(executionTimestamps.length).toBe(15)

    await Promise.all(promises)

    // Validate timing: the first 12 executions happened at ~0 ms, the rest >= 60 s
    const firstWindowDurations = executionTimestamps.slice(0, 12)
    const secondWindowDurations = executionTimestamps.slice(12)

    firstWindowDurations.forEach(d => expect(d).toBeLessThan(10))
    secondWindowDurations.forEach(d => expect(d).toBeGreaterThanOrEqual(60_000))
  })
})
