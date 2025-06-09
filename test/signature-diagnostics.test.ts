import { describe, it } from 'vitest'
import type { InvoiceV1_1 } from '../src/types'
import {
  diagnoseSignatureIssues,
  printDiagnostics,
} from '../src/utils/signature-diagnostics'

/**
 * ⚠️ SECURITY NOTICE: This file uses environment variables for sensitive data.
 * Never hardcode actual TIN, NRIC, certificates, or API credentials in test files.
 * Use .env file for your actual values (already gitignored).
 */

describe('Signature Diagnostics', () => {
  it('should analyze current certificate and signature implementation', () => {
    const CLIENT_ID = process.env.CLIENT_ID
    const CLIENT_SECRET = process.env.CLIENT_SECRET
    const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY
    const CERTIFICATE = process.env.TEST_CERTIFICATE

    if (!CLIENT_ID || !CLIENT_SECRET || !PRIVATE_KEY || !CERTIFICATE) {
      console.log('⚠️  Skipping diagnostics - Missing environment variables')
      return
    }

    // Create test invoice
    const testInvoice: InvoiceV1_1 = {
      eInvoiceVersion: '1.1',
      eInvoiceTypeCode: '01',
      eInvoiceCodeOrNumber: `DIAG-${Date.now()}`,
      eInvoiceDate: new Date().toISOString().split('T')[0],
      eInvoiceTime: new Date().toISOString().split('T')[1].split('.')[0] + 'Z',
      invoiceCurrencyCode: 'MYR',

      supplier: {
        name: 'Test Company Sdn Bhd',
        tin: process.env.TIN_VALUE || 'IG00000000000', // Replace with your TIN
        registrationType: 'NRIC',
        registrationNumber: process.env.NRIC_VALUE || '123456789012',
        contactNumber: '+60123456789',
        email: 'test@company.com',
        address: {
          addressLine0: '123 Test Street',
          cityName: 'Kuala Lumpur',
          postalZone: '50000',
          state: '14',
          country: 'MYS',
        },
      },

      buyer: {
        name: 'CONSOLIDATED E-INVOICE BUYER',
        tin: 'EI00000000010',
        registrationType: 'NRIC',
        registrationNumber: process.env.BUYER_NRIC_VALUE || '000000000000', // Replace with test NRIC
        sstRegistrationNumber: 'NA',
        contactNumber: '+60123456789',
        address: {
          addressLine0: 'NA',
          cityName: 'KUALA LUMPUR',
          postalZone: '50000',
          state: '14',
          country: 'MYS',
        },
      },

      invoiceLineItems: [
        {
          itemClassificationCode: '001',
          itemDescription: 'Test Product',
          unitPrice: 100.0,
          quantity: 1,
          measurement: 'C62',
          taxType: '01',
          taxRate: 6.0,
          taxAmount: 6.0,
          totalTaxableAmountPerLine: 100.0,
          totalAmountPerLine: 106.0,
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

      issuerDigitalSignature: {} as any,
    }

    console.log('🔍 Running MyInvois Signature Diagnostics...\n')

    try {
      const diagnosticResult = diagnoseSignatureIssues(
        [testInvoice],
        CERTIFICATE,
      )

      printDiagnostics(diagnosticResult)

      // Summary
      const certificateIssues =
        diagnosticResult.certificateAnalysis.issues.length
      const signatureIssues = diagnosticResult.signatureAnalysis.issues.length

      console.log('\n📊 SUMMARY:')
      console.log(`   Certificate Issues: ${certificateIssues}`)
      console.log(`   Signature Issues: ${signatureIssues}`)
      console.log(`   Total Issues: ${certificateIssues + signatureIssues}`)

      if (certificateIssues > 0) {
        console.log('\n🚨 PRIMARY ACTION REQUIRED:')
        console.log(
          '   Obtain official business certificate from MyInvois-approved CA',
        )
        console.log(
          '   Self-generated certificates cannot pass MyInvois validation',
        )
      }

      if (signatureIssues > 0) {
        console.log('\n⚙️  SECONDARY ACTION:')
        console.log('   Review and optimize signature implementation')
      }
    } catch (error) {
      console.error('❌ Diagnostic failed:', error)
    }
  })
})
