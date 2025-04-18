import { describe, it, expect } from 'vitest'
import { MyInvoisClient } from '../src/utils/MyInvoisClient'

describe('MyInvoisClientWithRealData', () => {
  it('should verify TIN with real data', async () => {
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
