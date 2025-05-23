import { describe, it, expect } from 'vitest'
import { MyInvoisClient } from '../src/utils/MyInvoisClient'

describe('MyInvoisClientWithRealData', () => {
  it('should verify TIN with real data', async () => {
    // Skip the test if the environment variables are not set
    if (
      !process.env.CLIENT_ID ||
      !process.env.CLIENT_SECRET ||
      !process.env.TIN_VALUE ||
      !process.env.NRIC_VALUE
    ) {
      expect
        .soft(false, 'Skipping test: Missing required environment variables')
        .toBe(true)
      return
    }
    const client = new MyInvoisClient(
      process.env.CLIENT_ID!,
      process.env.CLIENT_SECRET!,
      'sandbox',
    )
    // @ts-ignore
    await client.refreshToken()
    const result = await client.verifyTin(
      process.env.TIN_VALUE!,
      process.env.NRIC_VALUE!,
    )
    expect(result).toBe(true)
  })
})
