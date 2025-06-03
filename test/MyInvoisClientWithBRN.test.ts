import { describe, it, expect } from 'vitest'
import { MyInvoisClient } from '../src/utils/MyInvoisClient'

describe('MyInvoisClientWithBRN', () => {
  it('should verify TIN with BRN', async () => {
    // Skip the test if the environment variables are not set
    if (
      !process.env.CLIENT_ID ||
      !process.env.CLIENT_SECRET ||
      !process.env.TIN_VALUE ||
      !process.env.BRN_VALUE
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
      undefined,
      true,
    )
    // @ts-ignore - refreshToken is a private method
    await client.refreshToken()
    const result = await client.verifyTin(
      process.env.TIN_VALUE!,
      'BRN',
      process.env.BRN_VALUE!,
    )
    expect(result).toBe(true)
  })
})
