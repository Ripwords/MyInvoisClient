import { describe, it, expect } from 'vitest'
import { MyInvoisClient } from '../src/index'

// This is an integration test that demonstrates rate limiting in action
// It requires real credentials and will make actual API calls
describe('Rate Limiting Integration Test', () => {
  // Skip this test by default since it requires real credentials
  it.skip('demonstrates rate limiting with real API calls', async () => {
    // Set up real credentials (you'll need to provide these)
    const client = new MyInvoisClient(
      process.env.MYINVOIS_CLIENT_ID!,
      process.env.MYINVOIS_CLIENT_SECRET!,
      'sandbox',
      process.env.MYINVOIS_CERTIFICATE_PEM!,
      process.env.MYINVOIS_PRIVATE_KEY_PEM!,
      undefined, // onBehalfOf
      true, // debug mode
    )

    console.log('🚀 Starting rate limiting test...')
    console.log('This will make multiple rapid API calls to test rate limiting')

    const startTime = Date.now()
    const results: Array<{
      timestamp: number
      success: boolean
      error?: string
    }> = []

    // Make 20 rapid requests to test rate limiting
    const promises = Array.from({ length: 20 }).map(async (_, index) => {
      try {
        const result = await client.getDocumentTypes()
        results.push({
          timestamp: Date.now() - startTime,
          success: true,
        })
        console.log(
          `✅ Request ${index + 1} completed at ${Date.now() - startTime}ms`,
        )
        return result
      } catch (error) {
        results.push({
          timestamp: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        console.log(
          `❌ Request ${index + 1} failed at ${Date.now() - startTime}ms: ${error}`,
        )
        throw error
      }
    })

    // Wait for all requests to complete
    await Promise.allSettled(promises)

    const endTime = Date.now()
    const totalTime = endTime - startTime

    console.log(`\n📊 Rate Limiting Test Results:`)
    console.log(`Total time: ${totalTime}ms`)
    console.log(`Total requests: ${results.length}`)
    console.log(`Successful requests: ${results.filter(r => r.success).length}`)
    console.log(`Failed requests: ${results.filter(r => !r.success).length}`)

    // Analyze timing
    const successfulResults = results.filter(r => r.success)
    if (successfulResults.length > 1) {
      const intervals = []
      for (let i = 1; i < successfulResults.length; i++) {
        intervals.push(
          successfulResults[i].timestamp - successfulResults[i - 1].timestamp,
        )
      }

      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length
      const minInterval = Math.min(...intervals)
      const maxInterval = Math.max(...intervals)

      console.log(
        `Average interval between requests: ${avgInterval.toFixed(2)}ms`,
      )
      console.log(`Minimum interval: ${minInterval}ms`)
      console.log(`Maximum interval: ${maxInterval}ms`)

      // Verify that requests were properly spaced (should be at least 100ms apart for document types)
      expect(minInterval).toBeGreaterThan(50) // Should have some spacing
    }

    // Should not have any 429 errors if rate limiting is working
    const rateLimitErrors = results.filter(
      r => !r.success && r.error?.includes('429'),
    )

    if (rateLimitErrors.length > 0) {
      console.log(`⚠️  Found ${rateLimitErrors.length} rate limit errors:`)
      rateLimitErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. At ${error.timestamp}ms: ${error.error}`)
      })
    }

    // Rate limiting should prevent 429 errors
    expect(rateLimitErrors.length).toBe(0)
  }, 60000) // 60 second timeout

  it('can be run manually with: npm test -- --run rateLimitingIntegration.test.ts', () => {
    console.log(`
🧪 To run the rate limiting integration test manually:

1. Set up your environment variables:
   export MYINVOIS_CLIENT_ID="your_client_id"
   export MYINVOIS_CLIENT_SECRET="your_client_secret"
   export MYINVOIS_CERTIFICATE_PEM="your_certificate_pem"
   export MYINVOIS_PRIVATE_KEY_PEM="your_private_key_pem"

2. Run the test:
   npm test -- --run rateLimitingIntegration.test.ts

3. Or uncomment the test by removing .skip and run:
   npm test rateLimitingIntegration.test.ts

This test will make 20 rapid API calls and verify that:
- No 429 (rate limit) errors occur
- Requests are properly spaced according to rate limits
- The rate limiting system works correctly
`)
  })
})
