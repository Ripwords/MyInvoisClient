import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyInvoisClient } from '../../src'
import { getTestCredentials } from '../fixtures/test-credentials'

const { certificatePem, privateKeyPem } = getTestCredentials()

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.useFakeTimers()

const mockToken = {
  access_token: 'test-token',
  expires_in: 3600,
}

const tokenResponse = () =>
  ({
    ok: true,
    json: () => Promise.resolve(mockToken),
  }) as Response

const jsonResponse = (body: unknown) =>
  ({
    ok: true,
    json: () => Promise.resolve(body),
  }) as Response

const BASE = 'https://preprod-api.myinvois.hasil.gov.my'

describe('MyInvoisClient API coverage', () => {
  let client: MyInvoisClient

  beforeEach(() => {
    // mockReset (not clearAllMocks) also drops queued mockResolvedValueOnce
    // values, so responses can't leak between tests.
    mockFetch.mockReset()
    client = new MyInvoisClient(
      'api-coverage-test-id',
      'test-secret',
      'sandbox',
      certificatePem,
      privateKeyPem,
      undefined,
      true,
    )
  })

  describe('getDocument / getDocumentDetails', () => {
    it('fetches the raw document route and normalises longID to longId', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(
          jsonResponse({ uuid: 'doc-1', longID: 'X', document: '<xml/>' }),
        )

      const result = await client.getDocument('doc-1')

      const docCall = mockFetch.mock.calls.find(c =>
        String(c[0]).includes('/documents/doc-1/raw'),
      )
      expect(docCall).toBeDefined()
      expect(String(docCall![0])).toBe(`${BASE}/api/v1.0/documents/doc-1/raw`)
      expect(result.longId).toBe('X')
      expect(result.document).toBe('<xml/>')
    })

    it('fetches the details route and normalises longID to longId', async () => {
      mockFetch.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
        jsonResponse({
          uuid: 'doc-2',
          longID: 'X',
          validationResults: { status: 'Valid', validationSteps: [] },
        }),
      )

      const result = await client.getDocumentDetails('doc-2')

      const detailsCall = mockFetch.mock.calls.find(c =>
        String(c[0]).includes('/documents/doc-2/details'),
      )
      expect(detailsCall).toBeDefined()
      expect(String(detailsCall![0])).toBe(
        `${BASE}/api/v1.0/documents/doc-2/details`,
      )
      expect(result.longId).toBe('X')
      expect(result.validationResults.status).toBe('Valid')
    })
  })

  describe('getDocumentQrCode', () => {
    it('builds a preprod share URL from the fetched longId in sandbox', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(
          jsonResponse({ uuid: 'doc-qr', longID: 'LONG-1' }),
        )

      const url = await client.getDocumentQrCode('doc-qr')

      expect(url).toBe(
        'https://preprod.myinvois.hasil.gov.my/doc-qr/share/LONG-1',
      )
    })

    it('returns null when the document has no longId and none is provided', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ uuid: 'doc-qr' }))

      const url = await client.getDocumentQrCode('doc-qr')

      expect(url).toBeNull()
    })

    it('uses an explicitly provided longId without fetching the document', async () => {
      const url = await client.getDocumentQrCode('doc-qr', 'EXPLICIT')

      expect(url).toBe(
        'https://preprod.myinvois.hasil.gov.my/doc-qr/share/EXPLICIT',
      )
      // The longId was supplied, so no API round-trip should happen at all.
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('getNotifications', () => {
    it('passes all provided params in the query string', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(
          jsonResponse({ notifications: [], metadata: { hasNext: false } }),
        )

      await client.getNotifications({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        type: 6,
        language: 'en',
        status: 1,
        pageNo: 2,
        pageSize: 50,
      })

      const notifCall = mockFetch.mock.calls.find(c =>
        String(c[0]).includes('/notifications/taxpayer'),
      )
      expect(notifCall).toBeDefined()
      const url = String(notifCall![0])
      expect(url).toContain(`${BASE}/api/v1.0/notifications/taxpayer?`)
      expect(url).toContain('dateFrom=2024-01-01')
      expect(url).toContain('dateTo=2024-01-31')
      expect(url).toContain('type=6')
      expect(url).toContain('language=en')
      expect(url).toContain('status=1')
      expect(url).toContain('pageNo=2')
      expect(url).toContain('pageSize=50')
    })
  })

  describe('document types', () => {
    it('fetches the documenttypes list, single type and version routes', async () => {
      const typesBody = { result: [{ id: 5 }] }
      const typeBody = { id: 5, name: 'Invoice' }
      const versionBody = { id: 2, versionNumber: 1.1 }

      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(typesBody))
        .mockResolvedValueOnce(jsonResponse(typeBody))
        .mockResolvedValueOnce(jsonResponse(versionBody))

      const types = await client.getDocumentTypes()
      const type = await client.getDocumentType(5)
      const version = await client.getDocumentTypeVersion(5, 2)

      const urls = mockFetch.mock.calls.map(c => String(c[0]))
      expect(urls).toContain(`${BASE}/api/v1.0/documenttypes`)
      expect(urls).toContain(`${BASE}/api/v1.0/documenttypes/5`)
      expect(urls).toContain(`${BASE}/api/v1.0/documenttypes/5/versions/2`)

      // JSON payloads are passed through untouched
      expect(types).toEqual(typesBody)
      expect(type).toEqual(typeBody)
      expect(version).toEqual(versionBody)
    })
  })

  describe('searchTin validation', () => {
    it('throws when idType is provided without idValue', async () => {
      await expect(client.searchTin({ idType: 'NRIC' })).rejects.toThrow(
        'idType and idValue must be provided together',
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws when fileType is provided without idType and idValue', async () => {
      await expect(
        client.searchTin({ taxpayerName: 'Test', fileType: '1' }),
      ).rejects.toThrow(
        'fileType can only be provided together with idType and idValue',
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws when neither taxpayerName nor an id pair is provided', async () => {
      await expect(client.searchTin({})).rejects.toThrow(
        'Either taxpayerName must be provided, or both idType and idValue must be provided',
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends taxpayerName (not idName) for name-only searches', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ tin: 'C1234567890' }))

      const result = await client.searchTin({ taxpayerName: 'ACME SDN BHD' })

      const searchCall = mockFetch.mock.calls.find(c =>
        String(c[0]).includes('/taxpayer/search/tin'),
      )
      expect(searchCall).toBeDefined()
      const url = String(searchCall![0])
      expect(url).toContain('taxpayerName=ACME+SDN+BHD')
      expect(url).not.toContain('idName=')
      expect(result).toEqual({ tin: 'C1234567890' })
    })
  })

  describe('updateOnBehalfOf', () => {
    it('refreshes the token with an onbehalfof header', async () => {
      mockFetch.mockResolvedValueOnce(tokenResponse())

      await client.updateOnBehalfOf('C123')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]! as [string, RequestInit]
      expect(url).toBe(`${BASE}/connect/token`)
      expect(options.headers).toMatchObject({ onbehalfof: 'C123' })
    })
  })

  describe('token refresh on expiry', () => {
    it('fetches /connect/token again after expires_in has elapsed', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(undefined))
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(undefined))

      await client.verifyTin('123', 'NRIC', '456')

      // Move past the token's expires_in window (3600s)
      vi.setSystemTime(new Date(Date.now() + (mockToken.expires_in + 10) * 1000))

      await client.verifyTin('123', 'NRIC', '456')

      const tokenCalls = mockFetch.mock.calls.filter(c =>
        String(c[0]).endsWith('/connect/token'),
      )
      expect(tokenCalls).toHaveLength(2)
    })
  })

  describe('verifyTin', () => {
    it('returns false when the response resolves with ok: false', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce({ ok: false, status: 400 } as Response)

      const result = await client.verifyTin('123', 'NRIC', '456')

      expect(result).toBe(false)
    })
  })
})
