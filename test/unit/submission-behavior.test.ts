import { createHash } from 'node:crypto'
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  submitDocument,
  getSubmissionStatus,
} from '../../src/api/documentSubmission'
import { platformLogin } from '../../src/api/platformLogin'
import { extractCertificateInfo } from '../../src/utils/certificate'
import { getTestCredentials } from '../fixtures/test-credentials'
import type {
  ClassificationCode,
  InvoiceV1_1,
  SigningCredentials,
  TaxTypeCode,
} from '../../src/types'

const buildSigningCredentials = (): SigningCredentials => {
  const { certificatePem, privateKeyPem } = getTestCredentials()
  const { issuerName, serialNumber } = extractCertificateInfo(certificatePem)
  return { privateKeyPem, certificatePem, issuerName, serialNumber }
}

const buildMinimalInvoice = (): InvoiceV1_1 => ({
  eInvoiceVersion: '1.1',
  eInvoiceTypeCode: '01',
  eInvoiceCodeOrNumber: 'TEST-INV-0001',
  eInvoiceDate: '2026-07-30',
  eInvoiceTime: '01:23:45Z',
  invoiceCurrencyCode: 'MYR',
  supplier: {
    name: 'Test Org Sdn Bhd',
    tin: 'C26135266000',
    registrationType: 'BRN',
    registrationNumber: '202001234567',
    contactNumber: '+60123456789',
    address: {
      addressLine0: '123 Test Street',
      cityName: 'Kuala Lumpur',
      state: '14',
      country: 'MYS',
    },
    industryClassificationCode: '41001',
    industryClassificationDescription: 'Test Industry',
  },
  buyer: {
    name: 'General Public',
    tin: 'EI00000000010',
    registrationType: 'NRIC',
    registrationNumber: 'NA',
    contactNumber: 'NA',
    address: {
      addressLine0: 'NA',
      cityName: 'KUALA LUMPUR',
      state: '14',
      country: 'MYS',
    },
  },
  invoiceLineItems: [
    {
      itemClassificationCode: '004' as ClassificationCode,
      itemDescription: 'Test Product',
      unitPrice: 100,
      taxType: '01' as TaxTypeCode,
      taxRate: 6,
      discountAmount: 10,
      discountRate: 0.1,
      totalTaxableAmountPerLine: 90,
      taxAmount: 5.4,
      totalAmountPerLine: 95.4,
    },
  ],
  legalMonetaryTotal: {
    taxExclusiveAmount: 90,
    taxInclusiveAmount: 95.4,
    payableRoundingAmount: 0,
    payableAmount: 95.4,
  },
  taxTotal: {
    taxAmount: 5.4,
  },
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('submitDocument', () => {
  it('signs, hashes and base64-encodes a document into the submission payload', async () => {
    const invoice = buildMinimalInvoice()
    const mockFetch = vi.fn().mockResolvedValue({
      status: 202,
      json: () =>
        Promise.resolve({
          submissionUid: 'SUB-1',
          acceptedDocuments: [],
          rejectedDocuments: [],
        }),
    } as Response)

    const result = await submitDocument(
      {
        fetch: mockFetch,
        debug: false,
        signingCredentials: buildSigningCredentials(),
      },
      [invoice],
    )

    expect(result.status).toBe(202)
    expect(result.data.submissionUid).toBe('SUB-1')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe('/api/v1.0/documentsubmissions')
    expect(options.method).toBe('POST')

    const payload = JSON.parse(String(options.body)) as {
      documents: {
        format: string
        document: string
        documentHash: string
        codeNumber: string
      }[]
    }
    expect(payload.documents).toHaveLength(1)

    const entry = payload.documents[0]!
    expect(entry.format).toBe('JSON')
    expect(entry.codeNumber).toBe(invoice.eInvoiceCodeOrNumber)

    // `document` must base64-decode to the signed document JSON
    const decoded = Buffer.from(entry.document, 'base64').toString('utf8')
    expect(() => JSON.parse(decoded)).not.toThrow()

    // and the hash must be the sha256 hex digest of that JSON string
    const expectedHash = createHash('sha256')
      .update(decoded, 'utf8')
      .digest('hex')
    expect(entry.documentHash).toBe(expectedHash)
  })
})

describe('getSubmissionStatus', () => {
  it('gives up after maxRetries with a Timeout error while still InProgress', async () => {
    vi.useFakeTimers()

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ overallStatus: 'InProgress' }),
    } as Response)

    const promise = getSubmissionStatus(
      { fetch: mockFetch, debug: false },
      'SUB-2',
      10, // pollInterval
      2, // maxRetries
    )

    // Two retries -> two poll waits before giving up
    await vi.advanceTimersByTimeAsync(10)
    await vi.advanceTimersByTimeAsync(10)
    const result = await promise

    expect(mockFetch).toHaveBeenCalledTimes(3)
    // Current behavior: the last known overallStatus is returned as the
    // status, with a synthesized Timeout error attached.
    expect(result.status).toBe('InProgress')
    expect(result.error?.code).toBe('Timeout')
    expect(result.error?.message).toBe('Submission timed out')
  })

  it('resolves with TimedOut after maxRetries of request errors', async () => {
    vi.useFakeTimers()

    const mockFetch = vi.fn().mockRejectedValue(new Error('network down'))

    const promise = getSubmissionStatus(
      { fetch: mockFetch, debug: false },
      'SUB-3',
      10,
      2,
    )

    await vi.advanceTimersByTimeAsync(10)
    await vi.advanceTimersByTimeAsync(10)
    const result = await promise

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(result.status).toBe('TimedOut')
    expect(result.error?.code).toBe('Timeout')
    expect(result.error?.message).toBe(
      'Submission timed out after request errors',
    )
  })
})

describe('platformLogin', () => {
  const credentials = {
    clientId: 'id',
    clientSecret: 'secret',
    baseUrl: 'https://preprod-api.myinvois.hasil.gov.my',
    debug: false,
  }

  it('throws the error_description from a 400 response body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error_description: 'invalid_client' }),
    } as Response)
    vi.stubGlobal('fetch', mockFetch)

    await expect(platformLogin(credentials)).rejects.toThrow('invalid_client')
  })

  it('throws a generic status message when the 400 body is unparseable', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.reject(new Error('invalid json')),
    } as Response)
    vi.stubGlobal('fetch', mockFetch)

    await expect(platformLogin(credentials)).rejects.toThrow(
      /Platform login failed with status 400/,
    )
  })

  it('throws when a 200 response has no access_token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ expires_in: 3600 }),
    } as Response)
    vi.stubGlobal('fetch', mockFetch)

    await expect(platformLogin(credentials)).rejects.toThrow(
      'Platform login response did not include an access_token',
    )
  })
})
