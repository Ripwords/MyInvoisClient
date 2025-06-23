import { describe, expect, it } from 'vitest'
import { MyInvoisClient } from '../src/index'
import fs from 'fs'
import path from 'path'
import type {
  InvoiceV1_1,
  CreditNoteV1_1,
  DebitNoteV1_1,
  RefundNoteV1_1,
  SelfBilledInvoiceV1_1,
  ClassificationCode,
  TaxTypeCode,
} from '../src/types'
import {
  generateCompleteDocument,
  extractCertificateInfo,
} from '../src/utils/document'
import { getPemFromP12 } from '../src/utils/certificate'

/**
 * ⚠️ SECURITY NOTICE: This test relies on environment variables for sensitive data.
 * Provide the following in a .env file (git-ignored):
 *   CLIENT_ID
 *   CLIENT_SECRET
 *   TEST_P12_PATH          – absolute or relative path to .p12 file
 *   TEST_P12_PASSPHRASE    – PIN / pass-phrase protecting the .p12
 *   (optionally) TIN_VALUE, NRIC_VALUE, etc. – same as the PEM-based tests
 */

// ---------------------------------------------------------------------------
// Helper builders (copied from signAndSubmitInvoice.test.ts with minimal edits)
// ---------------------------------------------------------------------------

const createMinimalTestInvoice = (): InvoiceV1_1 => {
  const now = new Date()
  const currentDate = now.toISOString().split('T')[0]
  const currentTime = now.toISOString().split('T')[1].split('.')[0] + 'Z'

  return {
    eInvoiceVersion: '1.1',
    eInvoiceTypeCode: '01',
    eInvoiceCodeOrNumber: `TEST-INV-${Date.now()}`,
    eInvoiceDate: currentDate,
    eInvoiceTime: currentTime,
    invoiceCurrencyCode: 'MYR',
    supplier: {
      name: process.env.TEST_COMPANY_NAME!,
      tin: process.env.TEST_TIN_VALUE!,
      registrationType: 'BRN',
      registrationNumber: process.env.TEST_BRN_VALUE!,
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
      name: 'CONSOLIDATED E-INVOICE BUYER',
      tin: 'EI00000000010',
      registrationType: 'NRIC',
      registrationNumber: 'NA',
      sstRegistrationNumber: 'NA',
      contactNumber: '+60123456789',
      address: {
        addressLine0: 'NA',
        cityName: 'KUALA LUMPUR',
        state: '14',
        country: 'MYS',
      },
    },
    invoiceLineItems: [
      {
        itemClassificationCode: '001',
        itemDescription: 'Test Product (Percentage Tax)',
        unitPrice: 100,
        taxType: '01',
        taxRate: 6,
        taxAmount: 6,
        totalTaxableAmountPerLine: 100,
        totalAmountPerLine: 106,
      },
      {
        itemClassificationCode: '003',
        itemDescription: 'Hotel Stay (Fixed Rate Tax)',
        unitPrice: 200,
        taxType: '03',
        taxPerUnitAmount: 10,
        baseUnitMeasure: 2,
        baseUnitMeasureCode: 'DAY',
        taxAmount: 20,
        totalTaxableAmountPerLine: 200,
        totalAmountPerLine: 220,
      },
    ],
    legalMonetaryTotal: {
      taxExclusiveAmount: 300,
      taxInclusiveAmount: 326,
      payableAmount: 326,
    },
    taxTotal: {
      taxAmount: 26,
    },
  }
}

const sampleLineItems = [
  {
    itemClassificationCode: '001' as ClassificationCode,
    itemDescription: 'Sample % tax item',
    unitPrice: 50,
    taxType: '01' as TaxTypeCode,
    taxRate: 6,
    taxAmount: 3,
    totalTaxableAmountPerLine: 50,
    totalAmountPerLine: 53,
  },
]

const createMinimalCreditNote = (): CreditNoteV1_1 => {
  const now = new Date()
  const currentDate = now.toISOString().split('T')[0]
  const currentTime = now.toISOString().split('T')[1].split('.')[0] + 'Z'

  return {
    eInvoiceVersion: '1.1',
    eInvoiceTypeCode: '02',
    eInvoiceCodeOrNumber: `TEST-CN-${Date.now()}`,
    originalEInvoiceReferenceNumber: '12345678901234567890123456',
    eInvoiceDate: currentDate,
    eInvoiceTime: currentTime,
    invoiceCurrencyCode: 'MYR',
    supplier: createMinimalTestInvoice().supplier,
    buyer: createMinimalTestInvoice().buyer,
    creditNoteLineItems: sampleLineItems,
    legalMonetaryTotal: {
      taxExclusiveAmount: 50,
      taxInclusiveAmount: 53,
      payableAmount: 53,
    },
    taxTotal: { taxAmount: 3 },
  }
}

const createMinimalDebitNote = (): DebitNoteV1_1 => {
  const base = createMinimalCreditNote()
  return {
    ...base,
    eInvoiceTypeCode: '03',
    eInvoiceCodeOrNumber: `TEST-DN-${Date.now()}`,
    debitNoteLineItems: sampleLineItems,
  }
}

const createMinimalRefundNote = (): RefundNoteV1_1 => {
  const base = createMinimalCreditNote()
  return {
    ...base,
    eInvoiceTypeCode: '04',
    eInvoiceCodeOrNumber: `TEST-RN-${Date.now()}`,
    refundNoteLineItems: sampleLineItems,
  }
}

const createMinimalSelfBilledInvoice = (): SelfBilledInvoiceV1_1 => {
  const base = createMinimalTestInvoice()
  return {
    ...base,
    eInvoiceTypeCode: '11',
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('MyInvois Document Generation & Submission (PKCS#12)', () => {
  const requiredEnvVars = [
    'CLIENT_ID',
    'CLIENT_SECRET',
    'TEST_P12_PATH',
    'TEST_P12_PASSPHRASE',
    'TEST_COMPANY_NAME',
    'TEST_TIN_VALUE',
    'TEST_BRN_VALUE',
  ]

  const missingVars = requiredEnvVars.filter(v => !process.env[v])
  if (missingVars.length > 0) {
    it.skip(`Skipping tests – Missing env: ${missingVars.join(', ')}`, () => {
      expect.soft(false).toBe(true)
    })
    return
  }

  const CLIENT_ID = process.env.CLIENT_ID!
  const CLIENT_SECRET = process.env.CLIENT_SECRET!
  const P12_PATH = process.env.TEST_P12_PATH!
  const P12_PASSPHRASE = process.env.TEST_P12_PASSPHRASE!

  // Read & extract PEMs once
  const p12Buffer = fs.readFileSync(path.resolve(P12_PATH))
  const { certificatePem: CERTIFICATE, privateKeyPem: PRIVATE_KEY } =
    getPemFromP12(p12Buffer, P12_PASSPHRASE)

  it('should extract certificate information correctly from p12', () => {
    const certInfo = extractCertificateInfo(CERTIFICATE)
    expect(certInfo.issuerName).toBeDefined()
    expect(certInfo.serialNumber).toBeDefined()
  })

  it('should instantiate client via fromP12()', () => {
    const client = MyInvoisClient.fromP12(
      CLIENT_ID,
      CLIENT_SECRET,
      'sandbox',
      p12Buffer,
      P12_PASSPHRASE,
      undefined,
      true,
    )
    expect(client).toBeInstanceOf(MyInvoisClient)
  })

  it('should generate valid document structure', () => {
    const invoice = createMinimalTestInvoice()
    invoice.supplier.tin = process.env.TEST_TIN_VALUE || 'C00000000000'

    const certInfo = extractCertificateInfo(CERTIFICATE)
    const document = generateCompleteDocument([invoice], {
      privateKeyPem: PRIVATE_KEY,
      certificatePem: CERTIFICATE,
      issuerName: certInfo.issuerName,
      serialNumber: certInfo.serialNumber,
    })

    expect(document.Invoice).toHaveLength(1)
    expect(document.Invoice[0].Signature).toBeDefined()
    ;(globalThis as any).testInvoice = invoice
  })

  it('should submit document successfully', async () => {
    const invoice = (globalThis as any).testInvoice as InvoiceV1_1
    expect(invoice).toBeDefined()

    const client = MyInvoisClient.fromP12(
      CLIENT_ID,
      CLIENT_SECRET,
      'sandbox',
      p12Buffer,
      P12_PASSPHRASE,
      undefined,
      true,
    )

    const { status } = await client.submitDocument([invoice])
    expect(status).toBe(202)
  }, 60000)

  // Additional structural test for fixed-rate taxation
  it('should create correct UBL for fixed-rate tax', () => {
    const invoice = createMinimalTestInvoice()
    invoice.supplier.tin = process.env.VALID_SUPPLIER_TIN || 'IG50752733100'

    const certInfo = extractCertificateInfo(CERTIFICATE)
    const document = generateCompleteDocument([invoice], {
      privateKeyPem: PRIVATE_KEY,
      certificatePem: CERTIFICATE,
      issuerName: certInfo.issuerName,
      serialNumber: certInfo.serialNumber,
    })

    const fixedRateLine = document.Invoice[0].InvoiceLine[1]
    const subtotal = fixedRateLine.TaxTotal[0].TaxSubtotal[0]
    expect(subtotal.PerUnitAmount![0]._).toBe(10)
    expect(subtotal.BaseUnitMeasure![0]._).toBe(2)
  })

  // Document variant submission tests (optional – gate by env to save quota)
  // const variants: [string, () => any][] = [
  //   ['Credit Note', createMinimalCreditNote],
  //   ['Debit Note', createMinimalDebitNote],
  //   ['Refund Note', createMinimalRefundNote],
  //   ['Self-Billed Invoice', createMinimalSelfBilledInvoice],
  // ]

  // describe.each(variants)('Submission (variant: %s)', (name, builder) => {
  //   it.skipIf(!process.env.RUN_VARIANT_SUBMISSIONS)(
  //     `submits ${name}` as any,
  //     async () => {
  //       const doc = builder()
  //       if ('supplier' in doc) {
  //         doc.supplier.tin = process.env.VALID_SUPPLIER_TIN || ''
  //       }
  //       const client = MyInvoisClient.fromP12(
  //         CLIENT_ID,
  //         CLIENT_SECRET,
  //         'sandbox',
  //         p12Buffer,
  //         P12_PASSPHRASE,
  //         undefined,
  //         true,
  //       )
  //       const { status } = await client.submitDocument([doc])
  //       expect(status).toBe(202)
  //     },
  //     60000,
  //   )
  // })
})
