import { describe, it, expect } from 'vitest'
import QRCode from 'qrcode'
import { MyInvoisClient } from '../../src/index'
import type { InvoiceV1_1, ClassificationCode, TaxTypeCode } from '../../src/types'

/**
 * Live sandbox integration suite. Talks to the real MyInvois (LHDN) preprod
 * API using the PKCS#12 certificate, so it only runs when explicitly enabled:
 *
 *   RUN_INTEGRATION=true bun run test:integration
 *
 * Required .env variables (see .env.example):
 *   MYINVOIS_CLIENT_ID, MYINVOIS_CLIENT_SECRET,
 *   MYINVOIS_P12_PATH, MYINVOIS_P12_PASSPHRASE,
 *   MYINVOIS_SUPPLIER_NAME, MYINVOIS_SUPPLIER_TIN,
 *   MYINVOIS_SUPPLIER_ID_TYPE (BRN | NRIC), MYINVOIS_SUPPLIER_ID_VALUE
 */

const REQUIRED_VARS = [
  'MYINVOIS_CLIENT_ID',
  'MYINVOIS_CLIENT_SECRET',
  'MYINVOIS_P12_PATH',
  'MYINVOIS_P12_PASSPHRASE',
  'MYINVOIS_SUPPLIER_NAME',
  'MYINVOIS_SUPPLIER_TIN',
  'MYINVOIS_SUPPLIER_ID_TYPE',
  'MYINVOIS_SUPPLIER_ID_VALUE',
] as const

const missingVars = REQUIRED_VARS.filter(v => !process.env[v])
const enabled = !!process.env.RUN_INTEGRATION && missingVars.length === 0

const buildMinimalInvoice = (): InvoiceV1_1 => {
  const now = new Date()
  const currentDate = now.toISOString().split('T')[0]!
  const currentTime = now.toISOString().split('T')[1]!.split('.')[0] + 'Z'

  return {
    eInvoiceVersion: '1.1',
    eInvoiceTypeCode: '01',
    eInvoiceCodeOrNumber: `TEST-INV-${Date.now()}`,
    eInvoiceDate: currentDate,
    eInvoiceTime: currentTime,
    invoiceCurrencyCode: 'MYR',
    supplier: {
      name: process.env.MYINVOIS_SUPPLIER_NAME!,
      tin: process.env.MYINVOIS_SUPPLIER_TIN!,
      registrationType: process.env.MYINVOIS_SUPPLIER_ID_TYPE! as
        | 'BRN'
        | 'NRIC',
      registrationNumber: process.env.MYINVOIS_SUPPLIER_ID_VALUE!,
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
        quantity: 1,
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
  }
}

describe('MyInvois live sandbox (PKCS#12)', () => {
  if (!enabled) {
    const reason = process.env.RUN_INTEGRATION
      ? `missing env: ${missingVars.join(', ')}`
      : 'RUN_INTEGRATION not set'
    it.skip(`skipped — ${reason}`, () => {})
    return
  }

  const createClient = () =>
    MyInvoisClient.fromP12(
      process.env.MYINVOIS_CLIENT_ID!,
      process.env.MYINVOIS_CLIENT_SECRET!,
      'sandbox',
      process.env.MYINVOIS_P12_PATH!,
      process.env.MYINVOIS_P12_PASSPHRASE!,
      undefined,
      true,
    )

  it('constructs a client from the P12 bundle', () => {
    expect(createClient()).toBeInstanceOf(MyInvoisClient)
  })

  it(
    'signs, submits and validates a minimal invoice, then fetches its QR code',
    { timeout: 120_000 },
    async () => {
      const client = createClient()

      const { data, status } = await client.submitDocument([
        buildMinimalInvoice(),
      ])
      expect(status).toBe(202)
      expect(data.submissionUid).toBeTruthy()

      const statusResult = await client.getSubmissionStatus(
        data.submissionUid,
        10_000,
        5,
      )
      expect(statusResult.status).toBe('Valid')
      expect(statusResult.documentSummary?.length).toBeGreaterThan(0)

      const uuid = statusResult.documentSummary![0]!.uuid
      const qrCodeUrl = await client.getDocumentQrCode(uuid)
      expect(qrCodeUrl).toMatch(
        /^https:\/\/preprod\.myinvois\.hasil\.gov\.my\//,
      )
      console.log(
        // The toMatch assertion above guarantees qrCodeUrl is a non-null URL.
        await QRCode.toString(qrCodeUrl!, { type: 'terminal', small: true }),
      )
    },
  )

  it('lists recent documents', { timeout: 60_000 }, async () => {
    const client = createClient()
    const recent = await client.getRecentDocuments({ pageSize: 10 })
    expect(recent).toBeDefined()
  })
})
