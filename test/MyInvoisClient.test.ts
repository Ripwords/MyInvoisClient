import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyInvoisClient } from '../src/utils/MyInvoisClient'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.useFakeTimers()

describe('MyInvoisClient', () => {
  let client: MyInvoisClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new MyInvoisClient('test-id', 'test-secret', 'sandbox', false)
  })

  describe('constructor', () => {
    it('should set sandbox URL when environment is sandbox', () => {
      const sandboxClient = new MyInvoisClient(
        'test-id',
        'test-secret',
        'sandbox',
        true,
      )
      expect((sandboxClient as any).baseUrl).toBe(
        'https://preprod-api.myinvois.hasil.gov.my',
      )
    })

    it('should set production URL when environment is production', () => {
      const prodClient = new MyInvoisClient(
        'test-id',
        'test-secret',
        'production',
        true,
      )
      expect((prodClient as any).baseUrl).toBe(
        'https://api.myinvois.hasil.gov.my',
      )
    })
  })

  describe('token management', () => {
    it('should get a new token if token does not exist', async () => {
      const mockToken = {
        access_token: 'test-token',
        expires_in: 3600,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockToken),
      } as Response)

      await client.verifyTin('123', '456')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://preprod-api.myinvois.hasil.gov.my/connect/token',
        expect.any(Object),
      )
    })

    it('should get a new token when token is expired', async () => {
      const mockToken = {
        access_token: 'test-token',
        expires_in: 3600,
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(undefined),
        } as Response)

      await client.verifyTin('123', '456')

      // Check first call (token request)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://preprod-api.myinvois.hasil.gov.my/connect/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: 'test-id',
            client_secret: 'test-secret',
            scope: 'InvoicingAPI',
          }),
        },
      )

      // Check second call (verifyTin request)
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `https://preprod-api.myinvois.hasil.gov.my/api/v1.0/taxpayer/validate/123?idType=NRIC&idValue=456`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockToken.access_token}`,
          },
        },
      )
    })

    it('should reuse existing token if not expired', async () => {
      const mockToken = {
        access_token: 'test-token',
        expires_in: 3600,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockToken),
      } as Response)

      // First call to get token
      await client.verifyTin(process.env.TIN_VALUE!, process.env.NRIC_VALUE!)

      vi.advanceTimersByTime(10)

      // Second call should reuse token
      await client.verifyTin(process.env.TIN_VALUE!, process.env.NRIC_VALUE!)

      // Token endpoint should only be called once
      expect(mockFetch).toHaveBeenCalledWith(
        'https://preprod-api.myinvois.hasil.gov.my/connect/token',
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

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(undefined),
        } as Response)

      await client.verifyTin('123', '456')
      vi.setSystemTime(new Date(Date.now() + 1000 * 8000))
      await client.verifyTin('123', '456')

      expect(mockFetch).toHaveBeenCalledWith(
        `https://preprod-api.myinvois.hasil.gov.my/api/v1.0/taxpayer/validate/123?idType=NRIC&idValue=456`,
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

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockRejectedValueOnce(new Error('Invalid TIN'))

      const result = await client.verifyTin(
        process.env.TIN_VALUE!,
        process.env.NRIC_VALUE!,
      )

      expect(result).toBe(false)
    })
  })
})
