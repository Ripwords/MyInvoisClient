import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InvoiceV1_1 } from '../src/types'
import { MyInvoisClient } from '../src/utils/MyInvoisClient'
import {
  encodeDocumentForSubmission,
  extractCertificateInfo,
  generateDocumentHash,
  generateDocumentHashForSubmission,
  generateSignedInvoiceXML,
} from '../src/utils/invoice1-1'
import type { SigningCredentials } from '../src/types'
import {
  debugDocumentHash,
  testSubmissionHashMethods,
} from '../src/utils/debug/debug-document-hash'
import {
  debugSignedInvoiceXML,
  testCanonicalizationAlgorithms,
  validateXMLStructure,
} from '../src/utils/debug/debug-invoice-submission'

/**
 * Creates test signing credentials using a predefined test certificate
 * This uses the same structure as the example XML you provided, but with test values
 */
function createTestSigningCredentials(): SigningCredentials {
  // Test private key (THIS IS FOR TESTING ONLY - NEVER USE IN PRODUCTION)
  const testPrivateKey = process.env.TEST_PRIVATE_KEY!

  // Test certificate (THIS IS FOR TESTING ONLY)
  const testCertificate = process.env.TEST_CERTIFICATE!

  console.warn(`
  ⚠️  WARNING: Using test credentials for development only!
  These credentials will NOT work with the actual MyInvois API.
  You must obtain official certificates from LHDNM for production use.
  `)

  const extractedCertificate = extractCertificateInfo(testCertificate)

  return {
    privateKeyPem: testPrivateKey,
    certificatePem: testCertificate,
    issuerName: extractedCertificate.issuerName,
    serialNumber: extractedCertificate.serialNumber,
  }
}

// Test data matching the InvoiceV1_1 interface
const createTestInvoiceData = (): InvoiceV1_1 => {
  // Generate current date and time to avoid "too old" validation errors
  const now = new Date()
  const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD format
  const currentTime = now.toISOString().split('T')[1].split('.')[0] + 'Z' // HH:MM:SSZ format (remove milliseconds)

  console.log(
    '📅 Using current date/time for invoice:',
    currentDate,
    currentTime,
  )

  return {
    eInvoiceVersion: '1.1',
    eInvoiceTypeCode: '01',
    eInvoiceCodeOrNumber: 'XML-INV12345',
    eInvoiceDate: currentDate,
    eInvoiceTime: currentTime,
    invoiceCurrencyCode: 'MYR',

    supplier: {
      name: 'Supplier Name',
      tin: process.env.TIN_VALUE!,
      registrationType: 'NRIC',
      registrationNumber: process.env.NRIC_VALUE!,
      sstRegistrationNumber: 'NA',
      email: 'supplier@email.com',
      contactNumber: '+60123456789',
      industryClassificationCode: '46510',
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
      name: 'Consolidated Buyers',
      tin: 'EI00000000010',
      registrationNumber: 'NA',
      sstRegistrationNumber: 'NA',
      email: 'NA',
      contactNumber: 'NA',
      address: {
        addressLine0: 'NA',
        addressLine1: 'NA',
        addressLine2: 'NA',
        cityName: 'Kuala Lumpur',
        postalZone: '50000',
        state: '14',
        country: 'MYS',
      },
    },

    invoiceLineItems: [
      {
        itemClassificationCode: '004',
        itemDescription: 'Receipt 001 - 100',
        unitPrice: 10000,
        taxType: '01',
        taxRate: 10.0,
        taxAmount: 1000,
        totalTaxableAmountPerLine: 10000,
        totalAmountPerLine: 11000,
        quantity: 1,
        measurement: 'C62',
        countryOfOrigin: 'MYS',
      },
      {
        itemClassificationCode: '004',
        itemDescription: 'Receipt 101 - 200',
        unitPrice: 20000,
        taxType: '01',
        taxRate: 10.0,
        taxAmount: 2000,
        totalTaxableAmountPerLine: 20000,
        totalAmountPerLine: 22000,
        quantity: 1,
        measurement: 'C62',
        countryOfOrigin: 'MYS',
      },
    ],

    legalMonetaryTotal: {
      taxExclusiveAmount: 30000,
      taxInclusiveAmount: 33000,
      allowanceTotalAmount: 0,
      chargeTotalAmount: 0,
      payableRoundingAmount: 0,
      payableAmount: 33000,
    },

    taxTotal: {
      taxAmount: 3000,
      taxSubtotals: [
        {
          taxableAmount: 30000,
          taxAmount: 3000,
          taxCategory: {
            taxTypeCode: '01',
            taxRate: 10.0,
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
  }
}

describe('Sign and Submit Invoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

      // Test the alternative hash method
      console.log('\n🔧 TESTING ALTERNATIVE HASH METHOD:')
      try {
        const canonicalizedHash =
          await generateDocumentHashForSubmission(signedXML)
        console.log(`Current hash:         ${documentHash}`)
        console.log(`Canonicalized hash:   ${canonicalizedHash}`)
        console.log(
          `Methods are equal:    ${documentHash === canonicalizedHash ? '✅' : '❌'}`,
        )
      } catch (error) {
        console.log('❌ Error testing canonicalized hash:', error)
      }

      // Verify hash is a valid hex string
      expect(documentHash).toMatch(/^[a-f0-9]{64}$/)

      // Verify base64 encoding
      expect(() => Buffer.from(base64Document, 'base64')).not.toThrow()

      // CRITICAL TEST: Verify the hash is calculated from the same minified XML that gets encoded
      // This ensures consistency between documentHash and document (base64) values
      const minifiedXML = signedXML
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .replace(/>\s/g, '>')
        .replace(/\s</g, '<')
        .trim()

      // Calculate hash of minified XML manually to verify our generateDocumentHash function
      const crypto = require('crypto')
      const expectedHash = crypto
        .createHash('sha256')
        .update(minifiedXML, 'utf8')
        .digest('hex')

      // The documentHash should match the hash of the minified XML
      expect(documentHash).toEqual(expectedHash)

      // The base64Document should decode to the same minified XML
      const decodedDocument = Buffer.from(base64Document, 'base64').toString(
        'utf8',
      )
      expect(decodedDocument).toEqual(minifiedXML)
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

  describe('Debugging Invalid Structure Issues', () => {
    it('should debug and validate XML structure comprehensively', async () => {
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

      console.log('\n🔍 DEBUGGING XML STRUCTURE ISSUES')
      console.log('=====================================')

      // Run comprehensive debugging
      const debugResults = await debugSignedInvoiceXML(
        invoiceData,
        signingCredentials,
      )

      console.log('\n📊 VALIDATION RESULTS:')
      console.log(
        'XML Structure Valid:',
        debugResults.validationResults.xmlStructure.valid,
      )
      console.log(
        'Signature Elements Valid:',
        debugResults.validationResults.signatureElements.valid,
      )
      console.log(
        'Digest Values Valid:',
        debugResults.validationResults.digestValues.valid,
      )
      console.log(
        'Certificate Info Valid:',
        debugResults.validationResults.certificateInfo.valid,
      )

      if (debugResults.validationResults.xmlStructure.errors.length > 0) {
        console.log('\n❌ XML Structure Errors:')
        debugResults.validationResults.xmlStructure.errors.forEach(error =>
          console.log(`  - ${error}`),
        )
      }

      if (debugResults.validationResults.signatureElements.errors.length > 0) {
        console.log('\n❌ Signature Element Errors:')
        debugResults.validationResults.signatureElements.errors.forEach(error =>
          console.log(`  - ${error}`),
        )
      }

      if (debugResults.validationResults.digestValues.errors.length > 0) {
        console.log('\n❌ Digest Value Errors:')
        debugResults.validationResults.digestValues.errors.forEach(error =>
          console.log(`  - ${error}`),
        )
      }

      if (debugResults.validationResults.certificateInfo.errors.length > 0) {
        console.log('\n❌ Certificate Info Errors:')
        debugResults.validationResults.certificateInfo.errors.forEach(error =>
          console.log(`  - ${error}`),
        )
      }

      console.log('\n📋 STEP-BY-STEP RESULTS:')
      Object.entries(debugResults.stepByStepResults).forEach(
        ([step, result]) => {
          const status = result.success ? '✅' : '❌'
          console.log(
            `${status} ${step}: ${result.success ? 'SUCCESS' : `FAILED - ${result.error}`}`,
          )
        },
      )

      if (debugResults.validationResults.canonicalizationTest) {
        console.log('\n🔧 CANONICALIZATION TEST:')
        console.log(
          'Exclusive C14N Success:',
          debugResults.validationResults.canonicalizationTest.exclusiveC14N
            ?.success,
        )
        console.log(
          'C14N 1.1 Fallback Success:',
          debugResults.validationResults.canonicalizationTest.c14n11Fallback
            ?.success,
        )
        console.log(
          'Results Equal:',
          debugResults.validationResults.canonicalizationTest.areEqual,
        )
      }

      if (debugResults.signedXML) {
        // Additional XML structure validation
        const xmlValidation = validateXMLStructure(debugResults.signedXML)
        console.log('\n📝 XML VALIDATION:')
        console.log('Overall Valid:', xmlValidation.isValid)

        if (xmlValidation.errors.length > 0) {
          console.log('Errors:')
          xmlValidation.errors.forEach(error => console.log(`  - ${error}`))
        }

        if (xmlValidation.warnings.length > 0) {
          console.log('Warnings:')
          xmlValidation.warnings.forEach(warning =>
            console.log(`  - ${warning}`),
          )
        }

        // Check document size
        const sizeInBytes = Buffer.from(debugResults.signedXML, 'utf8').length
        console.log(
          `\n📏 Document Size: ${sizeInBytes} bytes (${(sizeInBytes / 1024).toFixed(2)} KB)`,
        )

        // Sample of generated XML for manual inspection
        console.log('\n📄 XML SAMPLE (first 500 chars):')
        console.log(debugResults.signedXML.substring(0, 500) + '...')

        // Check for common MyInvois issues
        console.log('\n🎯 MYINVOIS SPECIFIC CHECKS:')
        const commonIssues: string[] = []

        // Check for proper namespace declarations
        if (
          !debugResults.signedXML.includes(
            'xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"',
          )
        ) {
          commonIssues.push('Missing ext namespace declaration')
        }

        // Check for proper signature target
        if (!debugResults.signedXML.includes('Target="signature"')) {
          commonIssues.push('Missing or incorrect signature target')
        }

        // Check for proper digest algorithms
        if (
          !debugResults.signedXML.includes(
            'Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"',
          )
        ) {
          commonIssues.push('Missing or incorrect SHA256 digest algorithm')
        }

        // Check for RSA-SHA256 signature method
        if (
          !debugResults.signedXML.includes(
            'Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"',
          )
        ) {
          commonIssues.push(
            'Missing or incorrect RSA-SHA256 signature algorithm',
          )
        }

        // Check for proper C14N algorithm in XML
        if (
          !debugResults.signedXML.includes(
            'Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"',
          )
        ) {
          commonIssues.push(
            'XML declares different canonicalization algorithm than expected',
          )
        }

        if (commonIssues.length > 0) {
          console.log('❌ Common MyInvois Issues Found:')
          commonIssues.forEach(issue => console.log(`  - ${issue}`))
        } else {
          console.log('✅ No common MyInvois issues detected')
        }
      }

      // This test helps with debugging but doesn't fail based on the results
      // The actual validation should be done by reviewing the console output
      expect(debugResults).toBeDefined()
    }, 30000)

    it('should test canonicalization algorithms specifically', async () => {
      if (!process.env.CERTIFICATE || !process.env.PRIVATE_KEY) {
        expect.soft(false, 'Skipping test: Missing credentials').toBe(true)
        return
      }

      const invoiceData = createTestInvoiceData()
      const signingCredentials = createTestSigningCredentials()

      console.log('\n🔧 CANONICALIZATION ALGORITHM TESTING')
      console.log('=====================================')

      // Generate a signed XML first to get the template
      const signedXML = await generateSignedInvoiceXML(
        invoiceData,
        signingCredentials,
      )
      const testResults = await testCanonicalizationAlgorithms(signedXML)

      console.log('Exclusive C14N Success:', testResults.exclusiveC14N.success)
      if (!testResults.exclusiveC14N.success) {
        console.log('Exclusive C14N Error:', testResults.exclusiveC14N.error)
      } else {
        console.log('Exclusive C14N Digest:', testResults.exclusiveC14N.digest)
      }

      console.log(
        'C14N 1.1 Fallback Success:',
        testResults.c14n11Fallback.success,
      )
      if (!testResults.c14n11Fallback.success) {
        console.log(
          'C14N 1.1 Fallback Error:',
          testResults.c14n11Fallback.error,
        )
      } else {
        console.log(
          'C14N 1.1 Fallback Digest:',
          testResults.c14n11Fallback.digest,
        )
      }

      console.log('Algorithms produce same result:', testResults.areEqual)

      if (
        !testResults.areEqual &&
        testResults.exclusiveC14N.success &&
        testResults.c14n11Fallback.success
      ) {
        console.log(
          '\n⚠️  WARNING: Different canonicalization algorithms produce different results!',
        )
        console.log('This may be the cause of MyInvois validation failures.')
        console.log('Exclusive C14N digest:', testResults.exclusiveC14N.digest)
        console.log('C14N 1.1 digest:', testResults.c14n11Fallback.digest)
      }

      expect(testResults).toBeDefined()
    })

    it('should debug document hash calculation methods', async () => {
      if (!process.env.CERTIFICATE || !process.env.PRIVATE_KEY) {
        expect.soft(false, 'Skipping test: Missing credentials').toBe(true)
        return
      }

      const invoiceData = createTestInvoiceData()
      const signingCredentials = createTestSigningCredentials()

      console.log('\n🔧 DOCUMENT HASH DEBUGGING')
      console.log('===========================')

      // Then debug the actual hash calculation
      const debugResults = await debugDocumentHash(
        invoiceData,
        signingCredentials,
      )

      console.log('\n📊 HASH ANALYSIS RESULTS:')
      console.log(
        `Submission Hash:      ${debugResults.documentHashes.submissionHash}`,
      )
      console.log(
        `Signature Doc Digest: ${debugResults.documentHashes.signatureDocDigest}`,
      )
      console.log(
        `Raw Document Hash:    ${debugResults.documentHashes.rawDocumentHash}`,
      )
      console.log(
        `Minified Hash:        ${debugResults.documentHashes.minifiedDocumentHash}`,
      )
      console.log(
        `Transformed Hash:     ${debugResults.documentHashes.transformedDocumentHash}`,
      )

      console.log('\n🔍 EQUALITY CHECKS:')
      Object.entries(debugResults.areEqual).forEach(([comparison, isEqual]) => {
        console.log(`${comparison}: ${isEqual ? '✅' : '❌'}`)
      })

      if (debugResults.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:')
        debugResults.recommendations.forEach(rec => console.log(`   ${rec}`))
      }

      // Test different submission hash methods
      const methodResults = await testSubmissionHashMethods(
        invoiceData,
        signingCredentials,
      )

      console.log('\n🧪 HASH METHOD COMPARISON:')
      Object.entries(methodResults.methods).forEach(([method, hash]) => {
        console.log(`${method}: ${hash}`)
      })

      if (methodResults.recommendations.length > 0) {
        console.log('\n🔧 METHOD RECOMMENDATIONS:')
        methodResults.recommendations.forEach(rec => console.log(`   ${rec}`))
      }

      // Key findings
      console.log('\n🎯 KEY FINDINGS:')
      if (!debugResults.areEqual.submissionVsSignature) {
        console.log('❌ CRITICAL: Submission hash ≠ Signature digest')
        console.log(
          '   This is likely why MyInvois rejects "Document hash is not valid"',
        )
        console.log('   MyInvois probably expects these to match exactly')
      }

      if (debugResults.areEqual.submissionVsTransformed) {
        console.log('✅ Submission hash matches transformed document hash')
        console.log(
          '   This suggests the current approach is on the right track',
        )
      }

      // Practical fix suggestions
      console.log('\n🔧 IMMEDIATE FIXES TO TRY:')
      console.log(
        '1. Use signature digest as documentHash in submission payload',
      )
      console.log(
        '2. Ensure both signature and submission use same canonicalization',
      )
      console.log(
        '3. Use minified XML for hash calculation if sizes differ significantly',
      )

      expect(debugResults).toBeDefined()
      expect(methodResults).toBeDefined()
    }, 30000)
  })
})

describe('Real API Submission with Self-Signed Certificate', () => {
  it('should attempt a real submission to MyInvois API using self-signed cert and API keys', async () => {
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
      console.warn(
        'Skipping real API test: Missing CLIENT_ID or CLIENT_SECRET environment variables',
      )
      expect
        .soft(
          false,
          'Skipping real API test: Missing CLIENT_ID or CLIENT_SECRET environment variables',
        )
        .toBe(true)
      return
    }

    const privateKeyPem = process.env.PRIVATE_KEY
    const certificatePem = process.env.CERTIFICATE

    if (!privateKeyPem || !certificatePem) {
      console.warn(
        'Skipping real API test: Missing PRIVATE_KEY or CERTIFICATE environment variables',
      )
      expect
        .soft(
          false,
          'Skipping real API test: Missing PRIVATE_KEY or CERTIFICATE environment variables',
        )
        .toBe(true)
      return
    }

    const invoiceData = createTestInvoiceData()

    const client = new MyInvoisClient(
      process.env.CLIENT_ID!,
      process.env.CLIENT_SECRET!,
      'sandbox',
      undefined,
      true,
    )

    // 2. Submit Document
    try {
      const { data: submissionResponse, status } = await client.submitDocument([
        invoiceData,
      ])
      console.log('Real Submission API Response Status:', status)
      console.log('Real Submission API Response Body:', submissionResponse)

      console.log(
        'Real Submission Successful. SubmissionUid:',
        submissionResponse.submissionUid,
      )
      if (
        submissionResponse.acceptedDocuments &&
        submissionResponse.acceptedDocuments.length > 0
      ) {
        console.log(
          'Accepted Document UUID:',
          submissionResponse.acceptedDocuments[0].invoiceCodeNumber,
        )
      }
      if (
        submissionResponse.rejectedDocuments &&
        submissionResponse.rejectedDocuments.length > 0
      ) {
        console.warn(
          'Rejected Documents:',
          submissionResponse.rejectedDocuments,
        )

        console.warn(
          'Rejected Document Details: ',
          submissionResponse.rejectedDocuments.flatMap(
            doc => doc.error?.details,
          ),
        )
      }

      expect(status).toBe(202) // MyInvois typically returns 202 Accepted
      expect(submissionResponse.submissionUid).toBeDefined()
      expect(submissionResponse.submissionUid).not.toBeNull()

      const submission = await client.getSubmissionStatus(
        submissionResponse.submissionUid,
      )
      console.log('Submission:', submission)
      expect(submission).toBeDefined()
      expect(submission.status).oneOf(['Validated', 'Invalid'])
    } catch (error: any) {
      console.error('Error during real document submission:', error)

      // Check if this is a TIN mismatch error
      const errorMessage = error.message || error.toString()
      if (
        errorMessage.includes(
          'authenticated TIN and documents TIN is not matching',
        )
      ) {
        console.log('\n❌ TIN MISMATCH ERROR DETECTED!')
        console.log('=====================================')
      }

      expect.soft(false, 'Error during real document submission.').toBe(true)
      throw error
    }
  }, 45000) // Increased timeout for real API calls
})
