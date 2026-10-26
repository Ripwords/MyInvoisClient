import { createHash } from 'node:crypto'
import { describe, it, expect } from 'vitest'
import {
  createSignedProperties,
  calculateSignedPropertiesDigest,
  transformDocumentForHashing,
  calculateDocumentDigest,
} from '../../src/utils/document'
import type { AllDocumentsV1_1, ClassificationCode } from '../../src/types'

type IndustryCode = AllDocumentsV1_1['supplier']['industryClassificationCode']

const sha256Base64 = (input: string): string =>
  createHash('sha256').update(input, 'utf8').digest('base64')

const buildTestInvoice = (): AllDocumentsV1_1 => ({
  eInvoiceCodeOrNumber: 'TEST001',
  eInvoiceDate: '2024-01-01',
  eInvoiceTime: '00:00:00Z',
  eInvoiceTypeCode: '01',
  eInvoiceVersion: '1.1',
  invoiceCurrencyCode: 'MYR',
  supplier: {
    tin: '123456789',
    registrationNumber: '123456789',
    registrationType: 'NRIC' as const,
    name: 'Test Supplier With  Double Spaces',
    industryClassificationCode: '41001' as IndustryCode,
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
    payableRoundingAmount: 0,
    payableAmount: 1020,
  },
  taxTotal: {
    taxAmount: 20,
  },
  invoiceLineItems: [
    {
      itemClassificationCode: '022' as ClassificationCode,
      itemDescription: 'Test Item',
      unitPrice: 1000,
      quantity: 1,
      taxType: '01',
      taxRate: 2,
      taxAmount: 20,
      totalTaxableAmountPerLine: 1000,
      totalAmountPerLine: 1020,
    },
  ],
})

describe('signature digest contracts', () => {
  it('signed-properties digest is SHA-256/base64 over the Target-wrapped minified JSON', () => {
    const signedProperties = createSignedProperties(
      'test-certificate-digest',
      '2024-01-01T00:00:00Z',
      'CN=Test Issuer, O=Test Org, C=MY',
      '123456789',
    )

    // Independent reference: the MyInvois validator hashes the exact embedded
    // structure wrapped as {"Target":"signature","SignedProperties":[...]}.
    const embedded = JSON.stringify({
      Target: 'signature',
      SignedProperties: signedProperties.SignedProperties,
    })
    expect(calculateSignedPropertiesDigest(signedProperties)).toBe(
      sha256Base64(embedded),
    )

    // The digest must be sensitive to its inputs.
    const differentTime = createSignedProperties(
      'test-certificate-digest',
      '2024-01-01T00:00:01Z',
      'CN=Test Issuer, O=Test Org, C=MY',
      '123456789',
    )
    expect(calculateSignedPropertiesDigest(differentTime)).not.toBe(
      calculateSignedPropertiesDigest(signedProperties),
    )
  })

  it('createSignedProperties places the inputs at the XAdES-mandated paths', () => {
    const props = createSignedProperties(
      'cert-digest-value',
      '2024-01-01T00:00:00Z',
      'CN=Issuer',
      '42',
    )
    const signedProps = props.SignedProperties[0]!
    expect(signedProps.Id).toBe('id-xades-signed-props')
    const sigProps = signedProps.SignedSignatureProperties[0]!
    expect(sigProps.SigningTime[0]!._).toBe('2024-01-01T00:00:00Z')
    const cert = sigProps.SigningCertificate[0]!.Cert[0]!
    expect(cert.CertDigest[0]!.DigestValue[0]!._).toBe('cert-digest-value')
    expect(cert.CertDigest[0]!.DigestMethod[0]!.Algorithm).toBe(
      'http://www.w3.org/2001/04/xmlenc#sha256',
    )
    expect(cert.IssuerSerial[0]!.X509IssuerName[0]!._).toBe('CN=Issuer')
    expect(cert.IssuerSerial[0]!.X509SerialNumber[0]!._).toBe('42')
  })

  it('transformDocumentForHashing strips signature nodes and minifies without touching string content', () => {
    const transformed = transformDocumentForHashing([buildTestInvoice()])

    const parsed = JSON.parse(transformed)
    expect(parsed._D).toBe(
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    )
    expect(parsed.Invoice).toHaveLength(1)
    expect(parsed.Invoice[0]).not.toHaveProperty('UBLExtensions')
    expect(parsed.Invoice[0]).not.toHaveProperty('Signature')

    // No whitespace outside quoted strings…
    const outsideStrings = transformed.replace(/"(?:\\.|[^"\\])*"/g, '""')
    expect(outsideStrings).not.toMatch(/\s/)
    // …but whitespace inside string values survives untouched.
    expect(transformed).toContain('"Test Supplier With  Double Spaces"')
  })

  it('document digest is SHA-256/base64 over exactly the transformed document string', () => {
    const invoice = buildTestInvoice()
    expect(calculateDocumentDigest([invoice])).toBe(
      sha256Base64(transformDocumentForHashing([invoice])),
    )
  })
})
