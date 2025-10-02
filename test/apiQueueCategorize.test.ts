import { describe, it, expect } from 'vitest'
import { categorizeRequest } from '../src/utils/apiQueue'

describe('categorizeRequest', () => {
  it('maps document submission endpoints', () => {
    expect(categorizeRequest('/api/v1.0/documentsubmissions', 'POST')).toBe(
      'submitDocuments',
    )
    expect(categorizeRequest('/api/v1.0/documentsubmissions/abc123')).toBe(
      'getSubmission',
    )
  })

  it('maps document endpoints', () => {
    expect(categorizeRequest('/api/v1.0/documents/abc/raw')).toBe('getDocument')
    expect(categorizeRequest('/api/v1.0/documents/abc/details')).toBe(
      'getDocumentDetails',
    )
    expect(categorizeRequest('/api/v1.0/documents/search?status=Valid')).toBe(
      'searchDocuments',
    )
    expect(categorizeRequest('/api/v1.0/documents/recent')).toBe(
      'getRecentDocuments',
    )
    expect(
      categorizeRequest('/api/v1.0/documents/recent?pageNo=1&pageSize=20'),
    ).toBe('getRecentDocuments')
  })

  it('maps document state endpoints (cancel/reject)', () => {
    // Both cancel and reject use the same endpoint path
    expect(
      categorizeRequest(
        '/api/v1.0/documents/state/F9D425P6DS7D8IU/state',
        'POST',
      ),
    ).toBe('cancelDocument')
    expect(
      categorizeRequest(
        '/api/v1.0/documents/state/F9D425P6DS7D8IU/state',
        'PUT',
      ),
    ).toBe('cancelDocument')
    // Both use the same rate limit bucket (12 RPM)
  })

  it('maps taxpayer endpoints', () => {
    expect(categorizeRequest('/api/v1.0/taxpayer/search/tin?abc')).toBe(
      'searchTin',
    )
    expect(
      categorizeRequest(
        '/api/v1.0/taxpayer/validate/123?idType=NRIC&idValue=000',
      ),
    ).toBe('searchTin')
    expect(categorizeRequest('/api/v1.0/taxpayer/qrcodeinfo/xyz')).toBe(
      'taxpayerQr',
    )
  })

  it('maps login endpoint', () => {
    expect(categorizeRequest('/connect/token', 'POST')).toBe('loginTaxpayer')
  })
})
