import { describe, it, expect } from 'vitest'
import {
  createSignedProperties,
  calculateSignedPropertiesDigest,
  transformDocumentForHashing,
  calculateDocumentDigest,
} from '../src/utils/document'
import type { AllDocumentsV1_1 } from '../src/types'

describe('Signature Consistency Tests', () => {
  it('should produce consistent signed properties digest', () => {
    // Create test signed properties
    const signedProperties = createSignedProperties(
      'test-certificate-digest',
      '2024-01-01T00:00:00.000Z',
      'CN=Test Issuer, O=Test Org, C=MY',
      '123456789',
    )

    // Calculate digest using the function
    const digest1 = calculateSignedPropertiesDigest(signedProperties)
    const digest2 = calculateSignedPropertiesDigest(signedProperties)

    // Should be identical
    expect(digest1).toBe(digest2)
    expect(digest1).toBeTruthy()
    expect(digest1.length).toBeGreaterThan(0)
  })

  it('should produce consistent document transformation', () => {
    // Create a simple test invoice
    const testInvoice: AllDocumentsV1_1 = {
      eInvoiceCodeOrNumber: 'TEST001',
      eInvoiceDate: '2024-01-01',
      eInvoiceTime: '00:00:00Z',
      eInvoiceTypeCode: '01', // Invoice
      eInvoiceVersion: '1.1',
      invoiceCurrencyCode: 'MYR',
      supplier: {
        tin: '123456789',
        registrationNumber: '123456789',
        registrationType: 'NRIC' as const,
        name: 'Test Supplier',
        industryClassificationCode: '123456' as any, // Using any for test purposes
        industryClassificationDescription: 'Test Industry',
        address: {
          cityName: 'Kuala Lumpur',
          state: '14',
          addressLine0: 'Test Address',
          country: 'MYS',
        },
        contactNumber: '0123456789',
      },
      buyer: {
        tin: '987654321',
        registrationNumber: '987654321',
        registrationType: 'NRIC' as const,
        name: 'Test Buyer',
        sstRegistrationNumber: 'NA',
        address: {
          cityName: 'Kuala Lumpur',
          state: '14',
          addressLine0: 'Test Address',
          country: 'MYS',
        },
        contactNumber: '0987654321',
      },
      legalMonetaryTotal: {
        taxExclusiveAmount: 1000,
        taxInclusiveAmount: 1020,
        payableAmount: 1020,
      },
      taxTotal: {
        taxAmount: 20,
      },
      invoiceLineItems: [
        {
          itemClassificationCode: '022' as any, // Others
          itemDescription: 'Test Item',
          unitPrice: 1000,
          taxType: '01',
          taxRate: 2,
          taxAmount: 20,
          totalTaxableAmountPerLine: 1000,
          totalAmountPerLine: 1020,
        },
      ],
    }

    // Transform document
    const transformed1 = transformDocumentForHashing([testInvoice])
    const transformed2 = transformDocumentForHashing([testInvoice])

    // Should be identical
    expect(transformed1).toBe(transformed2)
    expect(transformed1).toBeTruthy()
    expect(transformed1.length).toBeGreaterThan(0)

    // Calculate digest
    const digest1 = calculateDocumentDigest([testInvoice])
    const digest2 = calculateDocumentDigest([testInvoice])

    // Should be identical
    expect(digest1).toBe(digest2)
    expect(digest1).toBeTruthy()
    expect(digest1.length).toBeGreaterThan(0)
  })

  it('should handle whitespace in JSON strings correctly', () => {
    const testJson = '{"key": "value with spaces", "number": 123}'
    const expectedMinified = '{"key":"value with spaces","number":123}'

    // Test our regex-based minification
    const minified = testJson.replace(
      /("(?:\\.|[^"\\])*")|\s+/g,
      (match, quotedString) => {
        if (quotedString) {
          return quotedString // Keep string content exactly as-is
        } else {
          return '' // Remove all other whitespace
        }
      },
    )

    expect(minified).toBe(expectedMinified)
  })
})
