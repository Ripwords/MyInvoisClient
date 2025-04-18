import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyInvoisClient } from '../src/utils/MyInvoisClient'
import { ofetch } from 'ofetch/node'

vi.mock('ofetch', () => ({
  ofetch: vi.fn(),
}))

vi.useFakeTimers()

describe('MyInvoisClient', () => {
  let client: MyInvoisClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new MyInvoisClient('test-id', 'test-secret', 'sandbox')
  })

  describe('constructor', () => {
    it('should set sandbox URL when environment is sandbox', () => {
      const sandboxClient = new MyInvoisClient(
        process.env.CLIENT_ID!,
        process.env.CLIENT_SECRET!,
        'sandbox',
      )
      expect((sandboxClient as any).baseUrl).toBe(
        'https://preprod-mytax.hasil.gov.my',
      )
    })

    it('should set production URL when environment is production', () => {
      const prodClient = new MyInvoisClient(
        process.env.CLIENT_ID!,
        process.env.CLIENT_SECRET!,
        'production',
      )
      expect((prodClient as any).baseUrl).toBe('https://mytax.hasil.gov.my')
    })
  })

  describe('token management', () => {
    it('should get a new token if token does not exist', async () => {
      const mockToken = {
        access_token: 'test-token',
        expires_in: 3600,
      }

      vi.mocked(ofetch).mockResolvedValueOnce(mockToken)

      await client.verifyTin('123', '456')

      expect(ofetch).toHaveBeenCalledWith(
        'https://preprod-mytax.hasil.gov.my/connect/token',
        expect.any(Object),
      )
    })

    it('should get a new token when token is expired', async () => {
      const mockToken = {
        access_token: 'test-token',
        expires_in: 3600,
      }
      vi.advanceTimersByTime(8000)
      vi.mocked(ofetch)
        .mockResolvedValueOnce(mockToken)
        .mockResolvedValueOnce(undefined)

      await client.verifyTin('123', '456')

      // Check first call (token request)
      expect(ofetch).toHaveBeenNthCalledWith(
        1,
        'https://preprod-mytax.hasil.gov.my/connect/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: {
            grant_type: 'client_credentials',
            client_id: 'test-id',
            client_secret: 'test-secret',
            scope: 'InvoicingAPI',
          },
        },
      )

      // Check second call (verifyTin request)
      expect(ofetch).toHaveBeenNthCalledWith(
        2,
        `https://preprod-mytax.hasil.gov.my/api/v1.0/taxpayer/validate/123?idType=NRIC&idValue=456`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockToken.access_token}`,
          },
          responseType: 'json',
        },
      )
    })

    it('should reuse existing token if not expired', async () => {
      const mockToken = {
        access_token: 'test-token',
        expires_in: 3600,
      }

      vi.mocked(ofetch).mockResolvedValueOnce(mockToken)

      // First call to get token
      await client.verifyTin(process.env.TIN_VALUE!, process.env.NRIC_VALUE!)

      vi.advanceTimersByTime(10)

      // Second call should reuse token
      await client.verifyTin(process.env.TIN_VALUE!, process.env.NRIC_VALUE!)

      // Token endpoint should only be called once
      expect(ofetch).toHaveBeenCalledWith(
        'https://preprod-mytax.hasil.gov.my/connect/token',
        expect.any(Object),
      )
    })
  })

  describe('verifyTin', () => {
    it('should return true when verification succeeds', async () => {
      const mockToken = {
        access_token: 'test-token',
        expires_in: 3600,
      }

      vi.mocked(ofetch)
        .mockResolvedValueOnce(mockToken) // Token call
        .mockResolvedValueOnce(undefined) // Verify call

      const result = await client.verifyTin('123', '456')
      expect(result).toBe(true)

      expect(ofetch).toHaveBeenCalledWith(
        `https://preprod-mytax.hasil.gov.my/api/v1.0/taxpayer/validate/123?idType=NRIC&idValue=456`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
          },
        }),
      )
    })

    it('should return false when verification fails', async () => {
      const mockToken = {
        access_token: 'test-token',
        expires_in: 3600,
      }

      vi.mocked(ofetch)
        .mockResolvedValueOnce(mockToken) // Token call
        .mockRejectedValueOnce(new Error('Invalid TIN')) // Verify call

      const result = await client.verifyTin(
        process.env.TIN_VALUE!,
        process.env.NRIC_VALUE!,
      )

      expect(result).toBe(false)
    })
  })
})
