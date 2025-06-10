import { describe, it, expect } from 'vitest'
import { MyInvoisClient } from '../src'

/**
 * ⚠️ SECURITY NOTICE: This file uses environment variables for sensitive data.
 * Never hardcode actual TIN, NRIC, certificates, or API credentials in test files.
 * Use .env file for your actual values (already gitignored).
 */

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
      process.env.CERTIFICATE!,
      process.env.PRIVATE_KEY!,
    )
    // @ts-ignore - refreshToken is a private method
    await client.refreshToken()
    const result = await client.verifyTin(
      process.env.TIN_VALUE!,
      'NRIC',
      process.env.NRIC_VALUE!,
    )
    expect(result).toBe(true)
  })

  it('should search TIN with real data', async () => {
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
      process.env.CERTIFICATE!,
      process.env.PRIVATE_KEY!,
    )
    const result = await client.searchTin({
      idType: 'NRIC',
      idValue: process.env.NRIC_VALUE!,
    })
    expect(result).toBeDefined()
  })
})
