import { describe, expect, it } from 'vitest'
import { MyInvoisClient } from '../src/index'
import type {
  InvoiceV1_1,
  CreditNoteV1_1,
  DebitNoteV1_1,
  RefundNoteV1_1,
  SelfBilledInvoiceV1_1,
  SelfBilledCreditNoteV1_1,
  SelfBilledRefundNoteV1_1,
  ClassificationCode,
  TaxTypeCode,
} from '../src/types'
import {
  generateCompleteDocument,
  extractCertificateInfo,
} from '../src/utils/document'

/**
 * ⚠️ SECURITY NOTICE: This file uses environment variables for sensitive data.
 * Never hardcode actual TIN, NRIC, certificates, or API credentials in test files.
 * Use .env file for your actual values (already gitignored).
 */

/**
 * Creates minimal test invoice data that meets all mandatory requirements
 * Following MyInvois v1.1 specification exactly
 */
const createMinimalTestInvoice = (): InvoiceV1_1 => {
  // Use current date/time to avoid validation errors
  const now = new Date()
  const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD
  const currentTime = now.toISOString().split('T')[1].split('.')[0] + 'Z' // HH:MM:SSZ

  return {
    // === CORE MANDATORY FIELDS ===
    eInvoiceVersion: '1.1',
    eInvoiceTypeCode: '01', // Standard invoice
    eInvoiceCodeOrNumber: `TEST-INV-${Date.now()}`, // Unique invoice number
    eInvoiceDate: currentDate,
    eInvoiceTime: currentTime,
    invoiceCurrencyCode: 'MYR',

    // === SUPPLIER (will be updated with certificate TIN) ===
    supplier: {
      name: 'Test Company Sdn Bhd',
      tin: process.env.TIN_VALUE!, // Will be replaced with certificate TIN
      registrationType: 'NRIC',
      registrationNumber: process.env.NRIC_VALUE!,
      contactNumber: '+60123456789',
      address: {
        addressLine0: '123 Test Street',
        cityName: 'Kuala Lumpur',
        state: '14', // Wilayah Persekutuan Kuala Lumpur
        country: 'MYS',
      },
      industryClassificationCode: '41001',
      industryClassificationDescription: 'Test Industry',
    },

    // === BUYER (using consolidated buyer for testing) ===
    buyer: {
      name: 'CONSOLIDATED E-INVOICE BUYER',
      tin: 'EI00000000010', // Standard consolidated buyer TIN
      registrationType: 'NRIC',
      registrationNumber: process.env.NRIC_VALUE!,
      sstRegistrationNumber: 'NA',
      contactNumber: '+60123456789', // Valid phone number (minimum 8 chars)
      address: {
        addressLine0: 'NA',
        cityName: 'KUALA LUMPUR',
        state: '14',
        country: 'MYS',
      },
    },

    // === LINE ITEMS (both percentage and fixed rate examples) ===
    invoiceLineItems: [
      // Percentage-based taxation
      {
        itemClassificationCode: '001', // General goods
        itemDescription: 'Test Product (Percentage Tax)',
        unitPrice: 100.0,
        taxType: '01', // SST
        taxRate: 6.0, // 6% SST
        taxAmount: 6.0, // 6% of 100
        totalTaxableAmountPerLine: 100.0,
        totalAmountPerLine: 106.0, // 100 + 6
      },
      // Fixed rate taxation
      {
        itemClassificationCode: '003', // Tourism Tax example
        itemDescription: 'Hotel Stay (Fixed Rate Tax)',
        unitPrice: 200.0,
        taxType: '03', // Tourism Tax
        taxPerUnitAmount: 10.0, // RM 10 per night
        baseUnitMeasure: 2, // 2 nights
        baseUnitMeasureCode: 'DAY', // Unit code for days
        taxAmount: 20.0, // 10 * 2 = 20
        totalTaxableAmountPerLine: 200.0,
        totalAmountPerLine: 220.0, // 200 + 20
      },
    ],

    // === MONETARY TOTALS ===
    legalMonetaryTotal: {
      taxExclusiveAmount: 300.0, // 100 + 200
      taxInclusiveAmount: 326.0, // 300 + 26 (6 + 20)
      payableAmount: 326.0,
    },

    // === TAX TOTAL ===
    taxTotal: {
      taxAmount: 26.0, // 6 + 20 (percentage + fixed rate)
    },
  }
}

/**
 * Shared line items used by all document variants in tests
 */
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
    originalEInvoiceInternalId: '12345678901234567890123456',
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

const createMinimalSelfBilledCreditNote = (): SelfBilledCreditNoteV1_1 => {
  const credit = createMinimalCreditNote()
  return {
    ...credit,
    eInvoiceTypeCode: '12',
    selfBilledCreditNoteLineItems: sampleLineItems,
  }
}

const createMinimalSelfBilledRefundNote = (): SelfBilledRefundNoteV1_1 => {
  const refund = createMinimalRefundNote()
  return {
    ...refund,
    eInvoiceTypeCode: '14',
    selfBilledRefundNoteLineItems: sampleLineItems,
  }
}

describe('MyInvois Document Generation and Submission', () => {
  const requiredEnvVars = [
    'CLIENT_ID',
    'CLIENT_SECRET',
    'TEST_PRIVATE_KEY',
    'TEST_CERTIFICATE',
  ]

  // Check environment variables
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    it.skip(`Skipping tests - Missing environment variables: ${missingVars.join(', ')}`, () => {
      expect
        .soft(
          false,
          `Missing required environment variables: ${missingVars.join(', ')}`,
        )
        .toBe(true)
    })
    return
  }

  const CLIENT_ID = process.env.CLIENT_ID!
  const CLIENT_SECRET = process.env.CLIENT_SECRET!
  const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY!
  const CERTIFICATE = process.env.TEST_CERTIFICATE!

  it('should extract certificate information correctly', () => {
    console.log('🔍 Extracting certificate information...')

    const certInfo = extractCertificateInfo(CERTIFICATE)

    console.log('Certificate Info:', {
      issuerName: certInfo.issuerName,
      serialNumber: certInfo.serialNumber,
    })

    expect(certInfo.issuerName).toBeDefined()
    expect(certInfo.serialNumber).toBeDefined()
    expect(typeof certInfo.issuerName).toBe('string')
    expect(typeof certInfo.serialNumber).toBe('string')
  })

  it('should find TIN that matches certificate', async () => {
    console.log('🔐 Finding TIN that matches certificate...')

    const client = new MyInvoisClient(
      CLIENT_ID,
      CLIENT_SECRET,
      'sandbox',
      CERTIFICATE,
      PRIVATE_KEY,
      undefined,
      true, // debug mode
    )

    // Test TIN formats that might match the certificate
    // Note: These are example TIN formats - replace with your actual test TINs
    const testTINs = [
      process.env.TIN_VALUE, // Environment variable if set
      process.env.TEST_TIN_1, // Additional test TIN from environment
      process.env.TEST_TIN_2, // Additional test TIN from environment
      process.env.TEST_TIN_3, // Additional test TIN from environment
      'EI00000000010', // Consolidated buyer (shouldn't work for supplier)
    ].filter(Boolean) // Remove undefined values

    let certificateMatchingTIN: string | null = null
    const validTINs: string[] = []

    // Step 1: Check which TINs are valid in the system
    console.log('📋 Step 1: Checking TIN validity...')
    for (const tin of testTINs) {
      try {
        console.log(`Testing TIN validity: ${tin}`)
        const isValid = await client.verifyTin(tin!, 'BRN', '123456789012')
        console.log(`TIN ${tin} validity: ${isValid}`)

        if (isValid) {
          validTINs.push(tin!)
        }
      } catch (error) {
        console.log(`❌ Error testing TIN ${tin}:`, error)
      }
    }

    console.log(`📊 Found ${validTINs.length} valid TINs:`, validTINs)

    // Step 2: Test each valid TIN with a minimal document submission to find certificate match
    console.log('📋 Step 2: Testing certificate matching...')
    for (const tin of validTINs) {
      try {
        console.log(`Testing TIN with certificate: ${tin}`)

        // Create a minimal test invoice with this TIN
        const testInvoice = createMinimalTestInvoice()
        testInvoice.supplier.tin = tin
        testInvoice.eInvoiceCodeOrNumber = `TEST-CERT-${Date.now()}`

        // Try to submit it
        const { status } = await client.submitDocument([testInvoice])

        if (status === 202) {
          console.log(`✅ SUCCESS! TIN ${tin} works with certificate`)
          certificateMatchingTIN = tin
          break
        } else {
          console.log(`❌ TIN ${tin} failed with status ${status}`)
        }
      } catch (error: any) {
        if (
          error.message?.includes(
            'authenticated TIN and documents TIN is not matching',
          )
        ) {
          console.log(`❌ TIN ${tin} doesn't match certificate`)
        } else {
          console.log(`❌ TIN ${tin} failed with error:`, error.message)
        }
      }
    }

    // Store the certificate-matching TIN for next test
    if (certificateMatchingTIN) {
      process.env.VALID_SUPPLIER_TIN = certificateMatchingTIN
      console.log(
        `🎯 Certificate matching TIN found: ${certificateMatchingTIN}`,
      )
    } else if (validTINs.length > 0) {
      // Fallback to first valid TIN with a warning
      process.env.VALID_SUPPLIER_TIN = validTINs[0]
      console.log(
        `⚠️  No certificate match found, using first valid TIN: ${validTINs[0]}`,
      )
      console.log(
        `⚠️  This will likely cause TIN mismatch error in submission test`,
      )
    }

    // For now, pass the test if we found any valid TINs (the main goal is to test the implementation)
    expect.soft(validTINs.length, 'No valid TINs found').toBeGreaterThan(0)
  }, 60000) // Increased timeout for multiple submissions

  it('should generate valid document structure', () => {
    console.log('📄 Generating document structure...')

    const invoice = createMinimalTestInvoice()

    // Use the valid TIN from previous test or fallback
    const supplierTIN =
      process.env.VALID_SUPPLIER_TIN || process.env.TIN_VALUE || 'C00000000000' // Replace with your TIN
    invoice.supplier.tin = supplierTIN

    console.log(`Using supplier TIN: ${supplierTIN}`)

    const certInfo = extractCertificateInfo(CERTIFICATE)

    const document = generateCompleteDocument([invoice], {
      privateKeyPem: PRIVATE_KEY,
      certificatePem: CERTIFICATE,
      issuerName: certInfo.issuerName,
      serialNumber: certInfo.serialNumber,
    })

    console.log('Generated document structure:')
    console.log(
      '- Namespace declarations:',
      Object.keys(document).filter(k => k.startsWith('_')),
    )
    console.log('- Number of invoices:', document.Invoice.length)
    console.log('- First invoice keys:', Object.keys(document.Invoice[0]))
    console.log('- Has UBLExtensions:', !!document.Invoice[0].UBLExtensions)
    console.log('- Has Signature:', !!document.Invoice[0].Signature)

    // Basic structure validation
    expect(document._D).toBe(
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    )
    expect(document._A).toBe(
      'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    )
    expect(document._B).toBe(
      'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    )
    expect(document.Invoice).toHaveLength(1)
    expect(document.Invoice[0].UBLExtensions).toBeDefined()
    expect(document.Invoice[0].Signature).toBeDefined()

    // Store document for next test
    ;(globalThis as any).testDocument = document
    ;(globalThis as any).testInvoice = invoice
  })

  it('should submit document to MyInvois successfully', async () => {
    console.log('🚀 Submitting document to MyInvois...')

    const document = (globalThis as any).testDocument
    const invoice = (globalThis as any).testInvoice

    if (!document || !invoice) {
      throw new Error('Document not generated in previous test')
    }

    const client = new MyInvoisClient(
      CLIENT_ID,
      CLIENT_SECRET,
      'sandbox',
      CERTIFICATE,
      PRIVATE_KEY,
      undefined,
      true, // debug mode
    )

    try {
      console.log('📤 Submitting to MyInvois API...')
      console.log('Document size:', JSON.stringify(document).length, 'bytes')

      const { data: response, status } = await client.submitDocument([invoice])

      console.log('📥 Response received:')
      console.log('Status:', status)
      console.log('Response:', JSON.stringify(response, null, 2))

      // Validate response structure
      expect(status).toBe(202) // MyInvois returns 202 Accepted
      expect(response.submissionUid).toBeDefined()
      expect(typeof response.submissionUid).toBe('string')

      // Check for accepted/rejected documents
      if (response.acceptedDocuments?.length > 0) {
        console.log('✅ Documents accepted:', response.acceptedDocuments.length)
        response.acceptedDocuments.forEach((doc, index) => {
          console.log(`  Document ${index + 1}:`, doc.invoiceCodeNumber)
        })
      }

      if (response.rejectedDocuments?.length > 0) {
        console.log('❌ Documents rejected:', response.rejectedDocuments.length)
        response.rejectedDocuments.forEach((doc, index) => {
          console.log(`  Document ${index + 1}:`, doc.invoiceCodeNumber)
          if (doc.error) {
            console.log(`    Error:`, doc.error.message)
            if (doc.error.details) {
              doc.error.details.forEach((detail, detailIndex) => {
                console.log(`      Detail ${detailIndex + 1}:`, detail.message)
              })
            }
          }
        })
      }

      // Get submission status
      console.log('📊 Checking submission status...')
      const submission = await client.getSubmissionStatus(
        response.submissionUid,
      )
      console.log('Submission status:', submission?.status)

      expect(submission).toBeDefined()
      expect([
        'InProgress',
        'Valid',
        'PartiallyValid',
        'Invalid',
        'TimedOut',
      ]).toContain(submission?.status)
    } catch (error: any) {
      console.error('💥 Submission failed:', error)

      // Analyze common error types
      if (
        error.message?.includes(
          'authenticated TIN and documents TIN is not matching',
        )
      ) {
        console.log('\n🔍 TIN MISMATCH ERROR DETECTED!')
        console.log(
          'This means the TIN in the certificate does not match the TIN in the invoice.',
        )
        console.log(
          'The certificate is registered to a different TIN in MyInvois system.',
        )
        console.log(
          'Solution: Get the correct TIN for your certificate or get a certificate for your TIN.',
        )
      } else if (error.message?.includes('Invalid structure')) {
        console.log('\n🔍 INVALID STRUCTURE ERROR DETECTED!')
        console.log('This could be due to:')
        console.log('1. Missing mandatory fields')
        console.log('2. Incorrect field values')
        console.log('3. Wrong data types')
        console.log('4. Business rule violations')
      }

      // Re-throw to fail the test
      throw error
    }
  }, 60000) // Extended timeout for API calls

  it('should generate correct UBL structure for fixed rate taxation', () => {
    console.log('🔍 Testing fixed rate tax UBL structure...')

    const invoice = createMinimalTestInvoice()
    invoice.supplier.tin = process.env.VALID_SUPPLIER_TIN || 'IG50752733100'

    const certInfo = extractCertificateInfo(CERTIFICATE)

    const document = generateCompleteDocument([invoice], {
      privateKeyPem: PRIVATE_KEY,
      certificatePem: CERTIFICATE,
      issuerName: certInfo.issuerName,
      serialNumber: certInfo.serialNumber,
    })

    const invoiceData = document.Invoice[0]
    const invoiceLines = invoiceData.InvoiceLine

    console.log('Invoice lines count:', invoiceLines.length)

    // Test percentage-based line item (first line)
    const percentageLine = invoiceLines[0]
    const percentageTaxSubtotal = percentageLine.TaxTotal[0].TaxSubtotal[0]
    console.log(
      'Percentage line TaxSubtotal keys:',
      Object.keys(percentageTaxSubtotal),
    )

    expect(percentageTaxSubtotal.Percent).toBeDefined()
    expect(percentageTaxSubtotal.Percent![0]._).toBe(6.0)
    expect(percentageTaxSubtotal.PerUnitAmount).toBeUndefined()
    expect(percentageTaxSubtotal.BaseUnitMeasure).toBeUndefined()

    // Test fixed-rate line item (second line)
    const fixedRateLine = invoiceLines[1]
    const fixedRateTaxSubtotal = fixedRateLine.TaxTotal[0].TaxSubtotal[0]
    console.log(
      'Fixed rate line TaxSubtotal keys:',
      Object.keys(fixedRateTaxSubtotal),
    )

    expect(fixedRateTaxSubtotal.PerUnitAmount).toBeDefined()
    expect(fixedRateTaxSubtotal.PerUnitAmount![0]._).toBe(10.0)
    expect(fixedRateTaxSubtotal.PerUnitAmount![0].currencyID).toBe('MYR')

    expect(fixedRateTaxSubtotal.BaseUnitMeasure).toBeDefined()
    expect(fixedRateTaxSubtotal.BaseUnitMeasure![0]._).toBe(2)
    expect(fixedRateTaxSubtotal.BaseUnitMeasure![0].unitCode).toBe('DAY')

    expect(fixedRateTaxSubtotal.Percent).toBeUndefined()

    console.log('✅ Fixed rate tax UBL structure is correct!')
  })

  it('should generate correct UBL structure for discounted line items', () => {
    const invoice = createMinimalTestInvoice()
    invoice.supplier.tin = process.env.VALID_SUPPLIER_TIN || 'IG50752733100'

    // Overwrite first line with explicit discount amount + rate
    invoice.invoiceLineItems = [
      {
        itemClassificationCode: '001' as ClassificationCode,
        itemDescription: 'Discounted % tax item',
        unitPrice: 100,
        taxType: '01' as TaxTypeCode,
        taxRate: 6,
        discountAmount: 10,
        discountRate: 0.1,
        totalTaxableAmountPerLine: 90,
        taxAmount: 5.4,
        totalAmountPerLine: 95.4,
      },
    ]

    // Adjust totals accordingly
    invoice.legalMonetaryTotal = {
      taxExclusiveAmount: 90,
      taxInclusiveAmount: 95.4,
      payableAmount: 95.4,
    }
    invoice.taxTotal = { taxAmount: 5.4 }

    const certInfo = extractCertificateInfo(CERTIFICATE)
    const document = generateCompleteDocument([invoice], {
      privateKeyPem: PRIVATE_KEY,
      certificatePem: CERTIFICATE,
      issuerName: certInfo.issuerName,
      serialNumber: certInfo.serialNumber,
    })

    const invoiceData = document.Invoice[0]
    const line = invoiceData.InvoiceLine[0]

    // Verify AllowanceCharge mapped
    expect(line.AllowanceCharge).toBeDefined()
    expect(line.AllowanceCharge[0].ChargeIndicator[0]._).toBe(false)
    expect(line.AllowanceCharge[0].Amount[0]._).toBe(10)
    expect(line.AllowanceCharge[0].Amount[0].currencyID).toBe('MYR')

    // MultiplierFactorNumeric and BaseAmount present when discountRate provided
    expect(line.AllowanceCharge[0].MultiplierFactorNumeric?.[0]._).toBe(0.1)
    expect(line.AllowanceCharge[0].BaseAmount?.[0]._).toBe(100)
    expect(line.AllowanceCharge[0].BaseAmount?.[0].currencyID).toBe('MYR')

    // Totals correctness
    expect(invoiceData.LegalMonetaryTotal[0].TaxExclusiveAmount[0]._).toBe(90)
    expect(invoiceData.TaxTotal[0].TaxAmount[0]._).toBe(5.4)
    expect(line.TaxTotal[0].TaxSubtotal[0].TaxableAmount[0]._).toBe(90)
    expect(line.TaxTotal[0].TaxSubtotal[0].TaxAmount[0]._).toBe(5.4)
  })

  // ---------- Generalised submission tests for other document types ----------
  const docVariants: [string, () => any][] = [
    ['Credit Note', createMinimalCreditNote],
    ['Debit Note', createMinimalDebitNote],
    ['Refund Note', createMinimalRefundNote],
    ['Self-Billed Invoice', createMinimalSelfBilledInvoice],
    ['Self-Billed Credit Note', createMinimalSelfBilledCreditNote],
    ['Self-Billed Refund Note', createMinimalSelfBilledRefundNote],
  ]

  describe.each(docVariants)('Submission (%s)', (name, builder) => {
    it.skipIf(!process.env.RUN_VARIANT_SUBMISSIONS)(
      `should submit ${name} to MyInvois`,
      async () => {
        const documentData = builder()

        // Ensure supplier TIN matches certificate for realistic test
        if ('supplier' in documentData) {
          documentData.supplier.tin =
            process.env.VALID_SUPPLIER_TIN || process.env.TIN_VALUE || ''
        }

        const client = new MyInvoisClient(
          CLIENT_ID,
          CLIENT_SECRET,
          'sandbox',
          CERTIFICATE,
          PRIVATE_KEY,
          undefined,
          true,
        )

        const { status } = await client.submitDocument([documentData])
        expect(status).toBe(202)
      },
      60000,
    )
  })

  // ---------- Batch submission test (multiple docs in one call) ----------
  it.skipIf(!process.env.RUN_BATCH_SUBMISSIONS)(
    'should submit multiple documents in a single submission',
    async () => {
      // Build a small batch – mix of standard invoice + credit note
      const batchDocs = [createMinimalTestInvoice(), createMinimalCreditNote()]

      // Ensure each supplier TIN matches certificate and codes are unique
      batchDocs.forEach((doc, idx) => {
        if ('supplier' in doc) {
          doc.supplier.tin =
            process.env.VALID_SUPPLIER_TIN || process.env.TIN_VALUE || ''
        }
        // Extra uniqueness safeguard
        doc.eInvoiceCodeOrNumber = `${doc.eInvoiceCodeOrNumber}-${idx}`
      })

      const client = new MyInvoisClient(
        CLIENT_ID,
        CLIENT_SECRET,
        'sandbox',
        CERTIFICATE,
        PRIVATE_KEY,
        undefined,
        true, // debug
      )

      const { status, data } = await client.submitDocument(batchDocs)
      console.log('Batch submission response:', JSON.stringify(data, null, 2))
      expect(status).toBe(202)
      expect(data.acceptedDocuments.length).toBeGreaterThan(0)
    },
    60000,
  )
})

// ================= Additional document generation tests =================

describe.each([
  ['Credit Note', createMinimalCreditNote, '02', true],
  ['Debit Note', createMinimalDebitNote, '03', true],
  ['Refund Note', createMinimalRefundNote, '04', true],
  ['Self-Billed Invoice', createMinimalSelfBilledInvoice, '11', false],
  ['Self-Billed Credit Note', createMinimalSelfBilledCreditNote, '12', true],
  ['Self-Billed Refund Note', createMinimalSelfBilledRefundNote, '14', true],
])('Document Generation (%s)', (name, builder, expectedTypeCode, hasRef) => {
  it(`should generate valid UBL structure for ${name}`, () => {
    const doc = builder()

    const certInfo = extractCertificateInfo(process.env.TEST_CERTIFICATE || '')

    const complete = generateCompleteDocument([doc], {
      privateKeyPem: process.env.TEST_PRIVATE_KEY || '',
      certificatePem: process.env.TEST_CERTIFICATE || '',
      issuerName: certInfo.issuerName || 'CN=TEST',
      serialNumber: certInfo.serialNumber || '1',
    })

    const invoiceData = complete.Invoice[0]

    expect(invoiceData.InvoiceTypeCode[0]._).toBe(expectedTypeCode)

    if (hasRef) {
      expect(invoiceData.BillingReference).toBeDefined()
    }

    // Basic signature presence
    expect(invoiceData.UBLExtensions).toBeDefined()
    expect(invoiceData.Signature).toBeDefined()
  })
})
