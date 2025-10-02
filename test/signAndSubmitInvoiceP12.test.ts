import { describe, expect, it } from 'vitest'
import { MyInvoisClient } from '../src/index'
import fs from 'fs'
import path from 'path'
import type { InvoiceV1_1, ClassificationCode, TaxTypeCode } from '../src/types'
import QRCode from 'qrcode'

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
// Helper: minimal invoice builder (matches mandatory MyInvois v1.1 fields)
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
        itemDescription: 'Test Product (Percentage Tax with Discount)',
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
      payableAmount: 95.4,
    },
    taxTotal: {
      taxAmount: 5.4,
    },
  }
}

// ---------------------------------------------------------------------------
// Test Suite – Only invoice submission is validated
// ---------------------------------------------------------------------------

describe('MyInvois Invoice Submission (PKCS#12)', () => {
  const requiredEnvVars = [
    'TEST_CLIENT_ID',
    'TEST_CLIENT_SECRET',
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

  const CLIENT_ID = process.env.TEST_CLIENT_ID!
  const CLIENT_SECRET = process.env.TEST_CLIENT_SECRET!
  const P12_PATH = process.env.TEST_P12_PATH!
  const P12_PASSPHRASE = process.env.TEST_P12_PASSPHRASE!

  it('submits a minimal invoice successfully', async () => {
    const invoice = createMinimalTestInvoice()

    const client = MyInvoisClient.fromP12(
      CLIENT_ID,
      CLIENT_SECRET,
      'sandbox',
      P12_PATH,
      P12_PASSPHRASE,
      undefined,
      true, // debug
    )

    const { data, status } = await client.submitDocument([invoice])
    expect(status).toBe(202)

    // Wait for submission to be Valid
    const submissionUid = data.submissionUid
    console.log('submissionUid', submissionUid)
    const statusResult = await client.getSubmissionStatus(
      submissionUid,
      10000,
      5,
    )
    expect(statusResult.status).toBe('Valid')
    expect(statusResult.documentSummary).toBeDefined()
    expect(Array.isArray(statusResult.documentSummary)).toBe(true)
    expect(statusResult.documentSummary!.length).toBeGreaterThan(0)

    // Get the document UUID
    const uuid = statusResult.documentSummary![0].uuid
    expect(typeof uuid).toBe('string')
    expect(uuid.length).toBeGreaterThan(0)

    // Fetch QR code URL
    const qrCodeUrl = await client.getDocumentQrCode(uuid)
    console.log(qrCodeUrl)
    expect(typeof qrCodeUrl).toBe('string')
    expect(qrCodeUrl).toMatch(/^https:\/\/preprod\.myinvois\.hasil\.gov\.my\//)

    // Generate and print QR code in terminal
    console.log('\n📱 QR Code for document:')
    if (qrCodeUrl) {
      const qrCodeString = await QRCode.toString(qrCodeUrl, {
        type: 'terminal',
        small: true,
      })
      console.log(qrCodeString)
    } else {
      console.log('No QR code URL returned')
    }
  }, 60000)
})
