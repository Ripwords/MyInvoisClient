import { describe, expect, it } from 'vitest'
import { getTaxpayerIdentity } from '../../src/index'

/**
 * Live check that LHDN's sandbox still puts the taxpayer in the token. Runs with
 * `RUN_INTEGRATION=true bun run test:integration` when TEST_CLIENT_ID,
 * TEST_CLIENT_SECRET and TEST_TIN_VALUE (a taxpayer-system login and its TIN) are set.
 */
const { TEST_CLIENT_ID, TEST_CLIENT_SECRET, TEST_TIN_VALUE } = process.env
const enabled =
  !!process.env.RUN_INTEGRATION && !!TEST_CLIENT_ID && !!TEST_CLIENT_SECRET && !!TEST_TIN_VALUE

describe.skipIf(!enabled)('getTaxpayerIdentity against the sandbox', () => {
  it('names the TIN that owns the credentials', async () => {
    const identity = await getTaxpayerIdentity({
      clientId: TEST_CLIENT_ID!,
      clientSecret: TEST_CLIENT_SECRET!,
      environment: 'sandbox',
    })
    expect(identity.tin).toBe(TEST_TIN_VALUE!.trim().toUpperCase())
    expect(identity.isIntermediary).toBe(false)
  })
})
