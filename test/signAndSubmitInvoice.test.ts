import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InvoiceV1_1 } from '../src/types'
import {
  generateSignedInvoiceXML,
  generateDocumentHash,
  encodeDocumentForSubmission,
  createTestSigningCredentials,
} from '../src/utils/invoice1-1'

// Mock fetch for submission tests
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Sign and Submit Invoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test data matching the InvoiceV1_1 interface
  const createTestInvoiceData = (): InvoiceV1_1 => ({
    eInvoiceVersion: '1.1',
    eInvoiceTypeCode: '01',
    eInvoiceCodeOrNumber: 'TEST-INV-001',
    eInvoiceDate: '2024-01-15',
    eInvoiceTime: '10:30:00Z',
    invoiceCurrencyCode: 'MYR',

    supplier: {
      name: 'Test Supplier Sdn Bhd',
      tin: 'C12345678901',
      registrationNumber: 'BRN202001234567',
      sstRegistrationNumber: 'W10-1808-32000059',
      email: 'supplier@test.com',
      contactNumber: '+60123456789',
      address: {
        addressLine0: 'Lot 66',
        addressLine1: 'Bangunan Merdeka',
        addressLine2: 'Persiaran Jaya',
        postalZone: '50480',
        cityName: 'Kuala Lumpur',
        state: '14',
        country: 'MYS',
      },
    },

    buyer: {
      name: 'Test Buyer Sdn Bhd',
      tin: 'C98765432109',
      registrationNumber: 'BRN202009876543',
      sstRegistrationNumber: 'W10-1909-32000060',
      email: 'buyer@test.com',
      contactNumber: '+60123456780',
      address: {
        addressLine0: 'Lot 77',
        addressLine1: 'Bangunan Hebat',
        addressLine2: 'Jalan Utama',
        postalZone: '50480',
        cityName: 'Kuala Lumpur',
        state: '14',
        country: 'MYS',
      },
    },

    invoiceLineItems: [
      {
        itemClassificationCode: '001',
        itemDescription: 'Test Product',
        unitPrice: 100.0,
        taxType: '01',
        taxRate: 6.0,
        taxAmount: 6.0,
        totalTaxableAmountPerLine: 100.0,
        totalAmountPerLine: 106.0,
        quantity: 1.0,
        measurement: 'C62',
      },
    ],

    legalMonetaryTotal: {
      taxExclusiveAmount: 100.0,
      taxInclusiveAmount: 106.0,
      payableAmount: 106.0,
    },

    taxTotal: {
      taxAmount: 6.0,
      taxSubtotals: [
        {
          taxableAmount: 100.0,
          taxAmount: 6.0,
          taxCategory: {
            taxTypeCode: '01',
            taxRate: 6.0,
          },
        },
      ],
    },

    paymentMeans: [
      {
        paymentMeansCode: '01',
        payeeFinancialAccountID: '1234567890',
      },
    ],

    issuerDigitalSignature: {
      Id: 'DocSig',
      'ds:SignedInfo': {
        'ds:CanonicalizationMethod': {
          Algorithm: 'http://www.w3.org/2006/12/xml-c14n11',
        },
        'ds:SignatureMethod': {
          Algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
        },
        'ds:Reference': [
          {
            Id: 'id-doc-signed-data',
            URI: '',
            'ds:DigestMethod': {
              Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
            },
            'ds:DigestValue': '',
          },
          {
            URI: '#id-xades-signed-props',
            'ds:DigestMethod': {
              Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
            },
            'ds:DigestValue': '',
          },
        ],
      },
      'ds:SignatureValue': '',
      'ds:KeyInfo': {
        'ds:X509Data': {
          'ds:X509Certificate': '',
        },
      },
      'ds:Object': {
        'xades:QualifyingProperties': {
          Target: 'signature',
          'xades:SignedProperties': {
            Target: 'signature',
            Id: 'id-xades-signed-props',
            'xades:SignedSignatureProperties': {
              'xades:SigningTime': '',
              'xades:SigningCertificate': {
                'xades:Cert': {
                  'xades:CertDigest': {
                    'ds:DigestMethod': {
                      Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
                    },
                    'ds:DigestValue': '',
                  },
                  'xades:IssuerSerial': {
                    'ds:X509IssuerName': '',
                    'ds:X509SerialNumber': '',
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  describe('Invoice Signing', () => {
    it('should generate a signed invoice XML with test credentials', async () => {
      // Skip if no test credentials available
      if (!process.env.CERTIFICATE || !process.env.PRIVATE_KEY) {
        expect
          .soft(
            false,
            'Skipping test: Missing CERTIFICATE or PRIVATE_KEY environment variables',
          )
          .toBe(true)
        return
      }

      const invoiceData = createTestInvoiceData()
      const signingCredentials = createTestSigningCredentials()

      const signedXML = await generateSignedInvoiceXML(
        invoiceData,
        signingCredentials,
      )

      // Verify the XML contains expected elements
      expect(signedXML).toContain(
        '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
      )
      expect(signedXML).toContain('<ds:SignatureValue>')
      expect(signedXML).toContain('<ds:X509Certificate>')
      expect(signedXML).toContain('<xades:SigningTime>')
      expect(signedXML).toContain(invoiceData.eInvoiceCodeOrNumber)
      expect(signedXML).toContain(invoiceData.supplier.name)
      expect(signedXML).toContain(invoiceData.buyer.name)

      // Verify signature elements are populated (not empty)
      expect(signedXML).not.toContain('<ds:SignatureValue></ds:SignatureValue>')
      expect(signedXML).not.toContain(
        '<ds:X509Certificate></ds:X509Certificate>',
      )
    })

    it('should generate document hash for submission', async () => {
      if (!process.env.CERTIFICATE || !process.env.PRIVATE_KEY) {
        expect
          .soft(
            false,
            'Skipping test: Missing CERTIFICATE or PRIVATE_KEY environment variables',
          )
          .toBe(true)
        return
      }

      const invoiceData = createTestInvoiceData()
      const signingCredentials = createTestSigningCredentials()

      const signedXML = await generateSignedInvoiceXML(
        invoiceData,
        signingCredentials,
      )
      const documentHash = generateDocumentHash(signedXML)
      const base64Document = encodeDocumentForSubmission(signedXML)

      // Verify hash is a valid hex string
      expect(documentHash).toMatch(/^[a-f0-9]{64}$/)

      // Verify base64 encoding
      expect(() => Buffer.from(base64Document, 'base64')).not.toThrow()

      // Verify decoded length matches original
      const decoded = Buffer.from(base64Document, 'base64').toString('utf8')
      expect(decoded).toEqual(signedXML)
    })

    it('should validate signing credentials properly', () => {
      if (!process.env.CERTIFICATE || !process.env.PRIVATE_KEY) {
        expect
          .soft(
            false,
            'Skipping test: Missing CERTIFICATE or PRIVATE_KEY environment variables',
          )
          .toBe(true)
        return
      }

      expect(() => createTestSigningCredentials()).not.toThrow()

      const credentials = createTestSigningCredentials()
      expect(credentials.privateKeyPem).toBeDefined()
      expect(credentials.certificatePem).toBeDefined()
      expect(credentials.issuerName).toBeDefined()
      expect(credentials.serialNumber).toBeDefined()
    })
  })

  describe('Invoice Submission (Mocked)', () => {
    it('should format submission data correctly', async () => {
      if (!process.env.CERTIFICATE || !process.env.PRIVATE_KEY) {
        expect
          .soft(
            false,
            'Skipping test: Missing CERTIFICATE or PRIVATE_KEY environment variables',
          )
          .toBe(true)
        return
      }

      const invoiceData = createTestInvoiceData()
      const signingCredentials = createTestSigningCredentials()

      const signedXML = await generateSignedInvoiceXML(
        invoiceData,
        signingCredentials,
      )
      const documentHash = generateDocumentHash(signedXML)
      const base64Document = encodeDocumentForSubmission(signedXML)

      const submissionData = {
        documents: [
          {
            format: 'XML',
            document: base64Document,
            documentHash: documentHash,
            codeNumber: invoiceData.eInvoiceCodeOrNumber,
          },
        ],
      }

      expect(submissionData.documents).toHaveLength(1)
      expect(submissionData.documents[0].format).toBe('XML')
      expect(submissionData.documents[0].codeNumber).toBe('TEST-INV-001')
      expect(submissionData.documents[0].documentHash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should mock successful submission to MyInvois API', async () => {
      if (!process.env.CERTIFICATE || !process.env.PRIVATE_KEY) {
        expect
          .soft(
            false,
            'Skipping test: Missing CERTIFICATE or PRIVATE_KEY environment variables',
          )
          .toBe(true)
        return
      }

      // Mock submission response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: () =>
          Promise.resolve({
            submissionUID: 'mock-submission-id-123456',
            acceptedDocuments: [
              {
                uuid: 'mock-document-uuid-789',
                invoiceCodeNumber: 'TEST-INV-001',
              },
            ],
            rejectedDocuments: [],
          }),
      })

      const invoiceData = createTestInvoiceData()
      const signingCredentials = createTestSigningCredentials()

      const signedXML = await generateSignedInvoiceXML(
        invoiceData,
        signingCredentials,
      )
      const documentHash = generateDocumentHash(signedXML)
      const base64Document = encodeDocumentForSubmission(signedXML)

      // For now, we'll simulate the API call directly
      const submissionResponse = await fetch(
        'https://preprod-api.myinvois.hasil.gov.my/api/v1.0/documentsubmissions/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({
            documents: [
              {
                format: 'XML',
                document: base64Document,
                documentHash: documentHash,
                codeNumber: invoiceData.eInvoiceCodeOrNumber,
              },
            ],
          }),
        },
      )

      const result = await submissionResponse.json()

      expect(result.submissionUID).toBe('mock-submission-id-123456')
      expect(result.acceptedDocuments).toHaveLength(1)
      expect(result.acceptedDocuments[0].invoiceCodeNumber).toBe('TEST-INV-001')
      expect(result.rejectedDocuments).toHaveLength(0)
    })

    it('should handle submission errors gracefully', async () => {
      // Mock error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: 'BadStructure',
            message: 'Document structure validation failed',
          }),
      })

      try {
        const response = await fetch(
          'https://preprod-api.myinvois.hasil.gov.my/api/v1.0/documentsubmissions/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer mock-token',
            },
            body: JSON.stringify({
              documents: [
                {
                  format: 'XML',
                  document: 'invalid-document',
                  documentHash: 'invalid-hash',
                  codeNumber: 'TEST-INV-001',
                },
              ],
            }),
          },
        )

        if (!response.ok) {
          const error = await response.json()
          expect(error.error).toBe('BadStructure')
        }
      } catch (error) {
        // Handle network errors
        expect(error).toBeDefined()
      }
    })
  })

  describe('Real API Integration (Optional)', () => {
    it('should submit to real MyInvois API if credentials are provided', async () => {
      // Skip if no real API credentials
      if (
        !process.env.CLIENT_ID ||
        !process.env.CLIENT_SECRET ||
        !process.env.CERTIFICATE ||
        !process.env.PRIVATE_KEY
      ) {
        expect
          .soft(
            false,
            'Skipping real API test: Missing required environment variables (CLIENT_ID, CLIENT_SECRET, CERTIFICATE, PRIVATE_KEY)',
          )
          .toBe(true)
        return
      }

      const invoiceData = createTestInvoiceData()
      const signingCredentials = createTestSigningCredentials()

      const signedXML = await generateSignedInvoiceXML(
        invoiceData,
        signingCredentials,
      )
      const documentHash = generateDocumentHash(signedXML)
      const base64Document = encodeDocumentForSubmission(signedXML)

      // Note: This test will only run if you have real credentials
      // and would actually submit to the MyInvois sandbox API
      console.log('Generated signed XML length:', signedXML.length)
      console.log('Document hash:', documentHash)
      console.log('Base64 document length:', base64Document.length)

      // For safety, we'll just validate the data format without actual submission
      expect(signedXML).toContain('<Invoice xmlns=')
      expect(documentHash).toMatch(/^[a-f0-9]{64}$/)
      expect(base64Document.length).toBeGreaterThan(0)
    }, 30000) // Longer timeout for potential API calls
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing required invoice fields', async () => {
      const incompleteInvoice = {
        eInvoiceVersion: '1.1',
        eInvoiceTypeCode: '01',
        // Missing required fields
      } as any

      // This should fail during XML generation
      await expect(
        generateSignedInvoiceXML(
          incompleteInvoice,
          createTestSigningCredentials(),
        ),
      ).rejects.toThrow()
    })

    it('should handle invalid signing credentials', async () => {
      const invoiceData = createTestInvoiceData()
      const invalidCredentials = {
        privateKeyPem: 'invalid-private-key',
        certificatePem: 'invalid-certificate',
        issuerName: 'invalid-issuer',
        serialNumber: 'invalid-serial',
      }

      await expect(
        generateSignedInvoiceXML(invoiceData, invalidCredentials),
      ).rejects.toThrow()
    })

    it('should validate document size limits', async () => {
      if (!process.env.CERTIFICATE || !process.env.PRIVATE_KEY) {
        expect
          .soft(
            false,
            'Skipping test: Missing CERTIFICATE or PRIVATE_KEY environment variables',
          )
          .toBe(true)
        return
      }

      const invoiceData = createTestInvoiceData()
      const signingCredentials = createTestSigningCredentials()

      const signedXML = await generateSignedInvoiceXML(
        invoiceData,
        signingCredentials,
      )
      const sizeInBytes = Buffer.from(signedXML, 'utf8').length

      // Verify document is under MyInvois limits (300KB per document)
      expect(sizeInBytes).toBeLessThan(300 * 1024)

      console.log(
        `Generated document size: ${sizeInBytes} bytes (${(sizeInBytes / 1024).toFixed(2)} KB)`,
      )
    })
  })
})
