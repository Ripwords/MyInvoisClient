import { describe, it, expect, vi, beforeEach } from 'vitest'
import { queueRequest } from '../../src/utils/apiQueue'

describe('apiQueue Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('allows a burst up to the cap, then defers the rest to the next window', async () => {
    const category = 'cancelDocument' as const // limit = 12 / 60s
    const max = 12
    const start = Date.now()
    const executionTimestamps: number[] = []

    const promises = Array.from({ length: 15 }).map((_, idx) =>
      queueRequest('burst-client', category, () => {
        executionTimestamps.push(Date.now() - start)
        return Promise.resolve(idx)
      }),
    )

    // Up to `max` may run immediately (sliding-window limiter — a burst within
    // the cap is allowed); the remaining 3 are queued.
    await vi.runAllTicks()
    expect(executionTimestamps.length).toBe(max)

    // Once the window rolls over, the queued remainder runs (timer fires at
    // oldest + window + buffer, so advance a little past the window).
    await vi.advanceTimersByTimeAsync(61_000)
    await vi.runAllTicks()
    await Promise.all(promises)
    expect(executionTimestamps.length).toBe(15)

    // The cap is never exceeded within any 60s window.
    for (let i = 0; i < executionTimestamps.length; i++) {
      const inWindow = executionTimestamps.filter(
        t => t >= executionTimestamps[i]! && t < executionTimestamps[i]! + 60_000,
      ).length
      expect(inWindow).toBeLessThanOrEqual(max)
    }
  })

  it('caps concurrent requests at the window limit before letting the rest through', async () => {
    const category = 'getDocument' as const // limit = 60 / 60s
    let executed = 0

    const promises = Array.from({ length: 100 }).map((_, idx) =>
      queueRequest('concurrency-client', category, () => {
        executed++
        return Promise.resolve(idx)
      }),
    )

    // Only the first window's worth may run immediately.
    await vi.runAllTicks()
    expect(executed).toBe(60)

    // After the window rolls over, the queued remainder completes.
    await vi.advanceTimersByTimeAsync(120_000)
    await vi.runAllTicks()
    await Promise.all(promises)
    expect(executed).toBe(100)
  })

  it('applies each category its own limit', async () => {
    const categories = [
      { name: 'submitDocuments' as const, limit: 100 },
      { name: 'getSubmission' as const, limit: 300 },
      { name: 'searchDocuments' as const, limit: 12 },
    ]

    for (const { name, limit } of categories) {
      let executed = 0
      const requests = Math.min(limit + 5, 20)

      const promises = Array.from({ length: requests }).map((_, idx) =>
        queueRequest(`limits-client-${name}`, name, () => {
          executed++
          return Promise.resolve(idx)
        }),
      )

      // Immediately, only the per-category cap may have run.
      await vi.runAllTicks()
      expect(executed).toBe(Math.min(requests, limit))

      await vi.advanceTimersByTimeAsync(120_000)
      await vi.runAllTicks()
      await Promise.all(promises)
      expect(executed).toBe(requests)
    }
  })

  it('handles request failures gracefully', async () => {
    const category = 'getDocument' as const
    let executed = 0
    let failureCount = 0

    const promises = Array.from({ length: 10 }).map((_, idx) =>
      queueRequest('failures-client', category, () => {
        executed++

        // Simulate some failures
        if (idx % 3 === 0) {
          failureCount++
          return Promise.reject(new Error('Simulated failure'))
        }

        return Promise.resolve(idx)
      }),
    )

    // Attach settlement handlers before advancing timers so rejections are
    // never left dangling (vitest reports those as unhandled errors).
    const settled = Promise.allSettled(promises)

    await vi.runAllTicks()
    await vi.advanceTimersByTimeAsync(60_000)
    await vi.runAllTicks()

    const results = await settled

    // All requests should have been executed (including failed ones)
    expect(executed).toBe(10)

    // Count actual failures
    const actualFailures = results.filter(r => r.status === 'rejected').length
    expect(actualFailures).toBe(failureCount)
  })

  it('tracks categories independently in a mixed workload', async () => {
    const requests = [
      { category: 'loginTaxpayer' as const, count: 5 },
      { category: 'submitDocuments' as const, count: 10 },
      { category: 'getDocument' as const, count: 15 },
      { category: 'searchDocuments' as const, count: 8 },
    ]

    const allPromises: Promise<unknown>[] = []
    const executionLog: Array<{ category: string; timestamp: number }> = []

    requests.forEach(({ category, count }) => {
      for (let i = 0; i < count; i++) {
        const promise = queueRequest('mixed-client', category, () => {
          executionLog.push({ category, timestamp: Date.now() })
          return Promise.resolve(`${category}-${i}`)
        })
        allPromises.push(promise)
      }
    })

    await vi.runAllTicks()
    await vi.advanceTimersByTimeAsync(120_000)
    await vi.runAllTicks()

    await Promise.all(allPromises)

    expect(executionLog.length).toBe(38) // 5 + 10 + 15 + 8

    const categoryCounts = executionLog.reduce(
      (acc, { category }) => {
        acc[category] = (acc[category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    expect(categoryCounts.loginTaxpayer).toBe(5)
    expect(categoryCounts.submitDocuments).toBe(10)
    expect(categoryCounts.getDocument).toBe(15)
    expect(categoryCounts.searchDocuments).toBe(8)
  })
})
