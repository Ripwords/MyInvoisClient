import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyInvoisClient } from '../../src'
import { getTestCredentials } from '../fixtures/test-credentials'

const { certificatePem, privateKeyPem } = getTestCredentials()

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.useFakeTimers()

describe('MyInvoisClient', () => {
  let client: MyInvoisClient

  beforeEach(() => {
    // mockReset (not clearAllMocks) also drops queued mockResolvedValueOnce
    // values, so responses can't leak between tests.
    mockFetch.mockReset()
    client = new MyInvoisClient(
      'test-id',
      'test-secret',
      'sandbox',
      certificatePem,
      privateKeyPem,
      undefined,
      true,
    )
  })

  describe('constructor', () => {
    it('should set sandbox URL when environment is sandbox', () => {
      const sandboxClient = new MyInvoisClient(
        'test-id',
        'test-secret',
        'sandbox',
        certificatePem,
        privateKeyPem,
        undefined,
        true,
      )
      expect((sandboxClient as unknown as { baseUrl: string }).baseUrl).toBe(
        'https://preprod-api.myinvois.hasil.gov.my',
      )
    })

    it('should set production URL when environment is production', () => {
      const prodClient = new MyInvoisClient(
        'test-id',
        'test-secret',
        'production',
        certificatePem,
        privateKeyPem,
        undefined,
        true,
      )
      expect((prodClient as unknown as { baseUrl: string }).baseUrl).toBe(
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

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(undefined),
        } as Response)

      await client.verifyTin('123', 'NRIC', '456')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://preprod-api.myinvois.hasil.gov.my/connect/token',
        expect.any(Object),
      )
    })

    it('should request a token before the API call, then refresh once expired', async () => {
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

      await client.verifyTin('123', 'NRIC', '456')

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

      // A later call after expiry must hit the token endpoint again.
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ access_token: 'token-2', expires_in: 3600 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(undefined),
        } as Response)
      vi.setSystemTime(new Date(Date.now() + 3601 * 1000))
      await client.verifyTin('123', 'NRIC', '456')

      const tokenCalls = mockFetch.mock.calls.filter(c =>
        String(c[0]).endsWith('/connect/token'),
      )
      expect(tokenCalls).toHaveLength(2)
    })

    it('should reuse existing token if not expired', async () => {
      const mockToken = {
        access_token: 'test-token',
        expires_in: 3600,
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(undefined),
        } as Response)

      // First call to get token
      await client.verifyTin('123', 'NRIC', '456')

      vi.setSystemTime(new Date(Date.now() + 1000))

      // Second call should reuse token
      await client.verifyTin('123', 'NRIC', '456')

      // Token endpoint should only be called once
      const tokenCalls = mockFetch.mock.calls.filter(c =>
        String(c[0]).endsWith('/connect/token'),
      )
      expect(tokenCalls).toHaveLength(1)
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

      const result = await client.verifyTin('123', 'NRIC', '456')

      expect(result).toBe(true)
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

    it('should return false when the API answers 404 (TIN not registered)', async () => {
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
          ok: false,
          status: 404,
          text: () => Promise.resolve(''),
        } as Response)

      const result = await client.verifyTin('123', 'NRIC', '456')

      expect(result).toBe(false)
    })

    it('should throw (not return false) when the request itself fails', async () => {
      const mockToken = {
        access_token: 'test-token',
        expires_in: 3600,
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockRejectedValueOnce(new Error('network down'))

      await expect(client.verifyTin('123', 'NRIC', '456')).rejects.toThrow(
        'network down',
      )
    })
  })

  describe('searchDocuments', () => {
    // The live MyInvois API returns documents wrapped in
    // `{ result: [...], metadata: { totalPages, totalCount } }`,
    // not a bare array. searchDocuments must read `data.result`.
    it('should return the documents from the result array', async () => {
      const mockToken = { access_token: 'test-token', expires_in: 3600 }
      const apiResponse = {
        result: [
          { uuid: 'doc-1', longId: 'long-1', status: 'Valid' },
          { uuid: 'doc-2', longID: 'long-2', status: 'Submitted' },
        ],
        metadata: { totalPages: 1, totalCount: 2 },
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(apiResponse),
        } as Response)

      const result = await client.searchDocuments({
        submissionDateFrom: '2024-01-01T00:00:00Z',
        submissionDateTo: '2024-01-31T23:59:59Z',
      })

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0]!.uuid).toBe('doc-1')
      // longID (API casing) should be normalised to longId
      expect(result[1]!.longId).toBe('long-2')
    })

  })

  describe('getSubmissionStatus', () => {
    // The MyInvois pagination is 1-indexed; pageNo=0 returns HTTP 400,
    // which made the default poll always time out.
    it('should request pageNo=1 by default', async () => {
      const mockToken = { access_token: 'test-token', expires_in: 3600 }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ overallStatus: 'Valid', documentSummary: [] }),
        } as Response)

      await client.getSubmissionStatus('SUB-123')

      const submissionCall = mockFetch.mock.calls.find(c =>
        String(c[0]).includes('/documentsubmissions/SUB-123'),
      )
      expect(submissionCall).toBeDefined()
      expect(String(submissionCall![0])).toContain('pageNo=1')
      expect(String(submissionCall![0])).not.toContain('pageNo=0')
    })

    it('should preserve a custom pageNo across poll retries', async () => {
      const mockToken = { access_token: 'test-token', expires_in: 3600 }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        // first poll: still processing -> triggers a retry
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ overallStatus: 'InProgress' }),
        } as Response)
        // second poll: done
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ overallStatus: 'Valid', documentSummary: [] }),
        } as Response)

      const promise = client.getSubmissionStatus('SUB-9', 1000, 3, 2, 5)
      await vi.advanceTimersByTimeAsync(1000)
      await promise

      const submissionCalls = mockFetch.mock.calls.filter(c =>
        String(c[0]).includes('/documentsubmissions/SUB-9'),
      )
      expect(submissionCalls).toHaveLength(2)
      for (const call of submissionCalls) {
        expect(String(call[0])).toContain('pageNo=2')
        expect(String(call[0])).toContain('pageSize=5')
      }
    })
  })

  describe('getTaxpayerQRCode', () => {
    // The documented route is /api/v1.0/taxpayers/qrcodeinfo/ (plural).
    // The singular form returns a generic 404 "Resource not found".
    it('should call the plural taxpayers qrcodeinfo route', async () => {
      const mockToken = { access_token: 'test-token', expires_in: 3600 }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tin: 'C123', name: 'Test' }),
        } as Response)

      await client.getTaxpayerQRCode('some-qr-text')

      const qrCall = mockFetch.mock.calls.find(c =>
        String(c[0]).includes('qrcodeinfo'),
      )
      expect(qrCall).toBeDefined()
      expect(String(qrCall![0])).toContain('/api/v1.0/taxpayers/qrcodeinfo/')
    })
  })

  describe('searchTin', () => {
    // The documented query param for name-based search is `taxpayerName`;
    // `idName` gets HTTP 400 "Invalid request parameters" (verified live).
    it('should send the name as the taxpayerName query param', async () => {
      const mockToken = { access_token: 'test-token', expires_in: 3600 }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tin: 'C26135266000' }),
        } as Response)

      await client.searchTin({ taxpayerName: 'INNHOUSE SDN BHD' })

      const searchCall = mockFetch.mock.calls.find(c =>
        String(c[0]).includes('/taxpayer/search/tin'),
      )
      expect(searchCall).toBeDefined()
      const url = String(searchCall![0])
      expect(url).toContain('taxpayerName=INNHOUSE+SDN+BHD')
      expect(url).not.toContain('idName=')
    })
  })

  describe('searchDocuments extra', () => {
    it('should return an empty array when no documents match', async () => {
      const mockToken = { access_token: 'test-token', expires_in: 3600 }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: [],
              metadata: { totalPages: 0, totalCount: 0 },
            }),
        } as Response)

      const result = await client.searchDocuments({
        submissionDateFrom: '2024-01-01T00:00:00Z',
        submissionDateTo: '2024-01-31T23:59:59Z',
      })

      expect(result).toEqual([])
    })
  })
})
