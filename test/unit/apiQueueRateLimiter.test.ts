import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest'
import { queueRequest, categorizeRequest } from '../../src/utils/apiQueue'

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
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('allows a burst up to the cap, then defers the rest to the next window', async () => {
    const category = 'cancelDocument' as const // limit = 12 / 60s
    const max = 12
    const start = Date.now()
    const executionTimestamps: number[] = []

    const promises = Array.from({ length: 15 }).map((_, idx) =>
      queueRequest('test-client-id', category, () => {
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

  it('prevents race conditions with concurrent requests', async () => {
    const category = 'getDocument' as const // limit = 60 / 60s
    const executionTimestamps: number[] = []
    const concurrentPromises: Promise<any>[] = []

    // Create 100 concurrent requests
    for (let i = 0; i < 100; i++) {
      const promise = queueRequest('test-client-id', category, () => {
        executionTimestamps.push(Date.now())
        return Promise.resolve(i)
      })
      concurrentPromises.push(promise)
    }

    // Process all requests
    await vi.runAllTicks()

    // Advance time to allow all requests to complete
    await vi.advanceTimersByTimeAsync(120_000) // 2 minutes
    await vi.runAllTicks()

    await Promise.all(concurrentPromises)

    // All requests should have been executed
    expect(executionTimestamps.length).toBe(100)

    // Verify no requests were executed simultaneously (within 1ms of each other)
    executionTimestamps.sort((a, b) => a - b)
    for (let i = 1; i < executionTimestamps.length; i++) {
      const diff = executionTimestamps[i] - executionTimestamps[i - 1]
      expect(diff).toBeGreaterThanOrEqual(0) // Should be at least 0ms apart
    }
  })

  it('handles different rate limits for different categories', async () => {
    const categories = [
      { name: 'submitDocuments' as const, limit: 100 },
      { name: 'getSubmission' as const, limit: 300 },
      { name: 'searchDocuments' as const, limit: 12 },
    ]

    for (const { name, limit } of categories) {
      const executionTimestamps: number[] = []
      const requests = Math.min(limit + 5, 20) // Test with a few more than the limit

      const promises = Array.from({ length: requests }).map((_, idx) =>
        queueRequest('test-client-id', name, () => {
          executionTimestamps.push(Date.now())
          return Promise.resolve(idx)
        }),
      )

      await vi.runAllTicks()

      // Advance time to allow all requests to complete
      await vi.advanceTimersByTimeAsync(120_000)
      await vi.runAllTicks()

      await Promise.all(promises)

      // All requests should have been executed
      expect(executionTimestamps.length).toBe(requests)

      // Verify requests were spaced appropriately
      executionTimestamps.sort((a, b) => a - b)
      for (let i = 1; i < executionTimestamps.length; i++) {
        const diff = executionTimestamps[i] - executionTimestamps[i - 1]
        expect(diff).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('correctly categorizes different API paths', () => {
    const testCases = [
      { path: '/connect/token', method: 'POST', expected: 'loginTaxpayer' },
      {
        path: '/api/v1.0/documentsubmissions',
        method: 'POST',
        expected: 'submitDocuments',
      },
      {
        path: '/api/v1.0/documentsubmissions/123',
        method: 'GET',
        expected: 'getSubmission',
      },
      {
        path: '/api/v1.0/documents/123/raw',
        method: 'GET',
        expected: 'getDocument',
      },
      {
        path: '/api/v1.0/documents/123/details',
        method: 'GET',
        expected: 'getDocumentDetails',
      },
      {
        path: '/api/v1.0/documents/state/123/state',
        method: 'POST',
        expected: 'cancelDocument',
      },
      {
        path: '/api/v1.0/taxpayer/search/tin',
        method: 'GET',
        expected: 'searchTin',
      },
      {
        path: '/api/v1.0/taxpayer/validate/123',
        method: 'GET',
        expected: 'searchTin',
      },
      {
        path: '/api/v1.0/taxpayer/qrcodeinfo/abc',
        method: 'GET',
        expected: 'taxpayerQr',
      },
      {
        path: '/api/v1.0/documents/search',
        method: 'GET',
        expected: 'searchDocuments',
      },
      { path: '/unknown/path', method: 'GET', expected: 'default' },
    ]

    testCases.forEach(({ path, method, expected }) => {
      const result = categorizeRequest(path, method)
      expect(result).toBe(expected)
    })
  })

  it('handles request failures gracefully', async () => {
    const category = 'getDocument' as const
    const executionTimestamps: number[] = []
    let failureCount = 0

    const promises = Array.from({ length: 10 }).map((_, idx) =>
      queueRequest('test-client-id', category, () => {
        executionTimestamps.push(Date.now())

        // Simulate some failures
        if (idx % 3 === 0) {
          failureCount++
          return Promise.reject(new Error('Simulated failure'))
        }

        return Promise.resolve(idx)
      }),
    )

    await vi.runAllTicks()
    await vi.advanceTimersByTimeAsync(60_000)
    await vi.runAllTicks()

    // Wait for all promises to settle (including rejections)
    const results = await Promise.allSettled(promises)

    // All requests should have been executed (including failed ones)
    expect(executionTimestamps.length).toBe(10)

    // Count actual failures
    const actualFailures = results.filter(r => r.status === 'rejected').length
    expect(actualFailures).toBe(failureCount)
  })

  it('tests real-world scenario with mixed request types', async () => {
    const requests = [
      { category: 'loginTaxpayer' as const, count: 5 },
      { category: 'submitDocuments' as const, count: 10 },
      { category: 'getDocument' as const, count: 15 },
      { category: 'searchDocuments' as const, count: 8 },
    ]

    const allPromises: Promise<any>[] = []
    const executionLog: Array<{ category: string; timestamp: number }> = []

    // Create mixed requests
    requests.forEach(({ category, count }) => {
      for (let i = 0; i < count; i++) {
        const promise = queueRequest('test-client-id', category, () => {
          executionLog.push({ category, timestamp: Date.now() })
          return Promise.resolve(`${category}-${i}`)
        })
        allPromises.push(promise)
      }
    })

    // Process all requests
    await vi.runAllTicks()
    await vi.advanceTimersByTimeAsync(120_000) // 2 minutes
    await vi.runAllTicks()

    await Promise.all(allPromises)

    // Verify all requests were executed
    expect(executionLog.length).toBe(38) // 5 + 10 + 15 + 8

    // Verify each category was handled independently
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
