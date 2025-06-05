import * as crypto from 'crypto'
import { DOMParserImpl } from 'xmldom-ts'
import type { InvoiceV1_1 } from '../../types'
import { generateDocumentHash, generateSignedInvoiceXML } from '../invoice1-1'
import type { SigningCredentials } from '../../types/documents/invoice-1_1.d.ts'

/**
 * Debug Document Hash Issues
 *
 * This helps identify why MyInvois is rejecting the document hash
 */

/**
 * Compare different hash calculation methods to identify the correct approach
 */
export async function debugDocumentHash(
  invoiceData: InvoiceV1_1,
  signingCredentials: SigningCredentials,
): Promise<{
  signedXML: string
  documentHashes: {
    submissionHash: string // The hash sent in submission payload
    signatureDocDigest: string // The digest value inside the signature
    rawDocumentHash: string // Hash of raw signed XML
    minifiedDocumentHash: string // Hash of minified signed XML
    transformedDocumentHash: string // Hash of transformed document (used in signature)
  }
  areEqual: {
    submissionVsSignature: boolean
    submissionVsRaw: boolean
    submissionVsMinified: boolean
    submissionVsTransformed: boolean
  }
  recommendations: string[]
}> {
  console.log('\n🔍 DEBUGGING DOCUMENT HASH VALIDATION')
  console.log('=====================================')

  // Generate the signed XML
  const signedXML = await generateSignedInvoiceXML(
    invoiceData,
    signingCredentials,
  )

  console.log(`\n📄 Generated signed XML (${signedXML.length} chars)`)
  console.log('First 200 chars:', signedXML.substring(0, 200) + '...')

  // 1. Calculate the hash used in submission payload (current implementation)
  const submissionHash = generateDocumentHash(signedXML)
  console.log(`\n📊 SUBMISSION HASH: ${submissionHash}`)

  // 2. Extract the digest value from the signature itself
  const parser = new DOMParserImpl()
  const doc = parser.parseFromString(signedXML, 'application/xml')
  const digestElements = doc.getElementsByTagName('ds:DigestValue')
  let signatureDocDigest = ''

  if (digestElements.length > 0) {
    // First DigestValue should be the document digest
    signatureDocDigest = digestElements[0]?.textContent || ''
    console.log(`📊 SIGNATURE DOC DIGEST: ${signatureDocDigest}`)
  } else {
    console.error('❌ No DigestValue elements found in signature!')
  }

  // 3. Calculate hash of raw signed XML (what we're currently sending)
  const rawDocumentHash = crypto
    .createHash('sha256')
    .update(signedXML, 'utf8')
    .digest('hex')
  console.log(`📊 RAW DOCUMENT HASH: ${rawDocumentHash}`)

  // 4. Calculate hash of minified XML (MyInvois recommendation)
  const minifiedXML = signedXML
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .replace(/>\s/g, '>')
    .replace(/\s</g, '<')
    .trim()
  const minifiedDocumentHash = crypto
    .createHash('sha256')
    .update(minifiedXML, 'utf8')
    .digest('hex')
  console.log(`📊 MINIFIED DOCUMENT HASH: ${minifiedDocumentHash}`)

  // 5. Calculate hash of the document as it was transformed for signature creation
  // Note: We can't easily recreate the exact transformation without the template,
  // so we'll skip this comparison for now
  console.log(
    `📊 TRANSFORMED DOCUMENT HASH: [Skipped - requires internal template access]`,
  )

  // Compare available hashes
  const areEqual = {
    submissionVsSignature:
      submissionHash ===
      Buffer.from(signatureDocDigest, 'base64').toString('hex'),
    submissionVsRaw: submissionHash === rawDocumentHash,
    submissionVsMinified: submissionHash === minifiedDocumentHash,
    submissionVsTransformed: false, // Skip this comparison
  }

  console.log('\n🔍 HASH COMPARISONS:')
  console.log(
    `Submission vs Signature:   ${areEqual.submissionVsSignature ? '✅' : '❌'}`,
  )
  console.log(
    `Submission vs Raw:         ${areEqual.submissionVsRaw ? '✅' : '❌'}`,
  )
  console.log(
    `Submission vs Minified:    ${areEqual.submissionVsMinified ? '✅' : '❌'}`,
  )
  console.log(
    `Submission vs Transformed: ${areEqual.submissionVsTransformed ? '✅' : '❌'}`,
  )

  // Generate recommendations
  const recommendations: string[] = []

  if (!areEqual.submissionVsSignature) {
    recommendations.push(
      '❌ Submission hash does not match signature digest - this is likely the root cause!',
    )
    recommendations.push(
      '💡 Consider using the same hash calculation method for both signature and submission',
    )
  }

  if (!areEqual.submissionVsRaw) {
    recommendations.push(
      '⚠️  Current implementation calculates different hashes for signature vs submission',
    )
  }

  if (areEqual.submissionVsMinified && !areEqual.submissionVsRaw) {
    recommendations.push('💡 Try using minified XML hash for submission')
  }

  if (areEqual.submissionVsTransformed) {
    recommendations.push(
      '💡 The transformed document hash matches - this might be what MyInvois expects',
    )
  }

  // Check if we're using the wrong document for submission hash
  if (!areEqual.submissionVsSignature) {
    recommendations.push(
      '🔧 POTENTIAL FIX: Use the digest value from signature as documentHash in submission',
    )
    recommendations.push(
      '🔧 ALTERNATIVE: Ensure submission hash uses same canonicalization as signature creation',
    )
  }

  console.log('\n💡 RECOMMENDATIONS:')
  recommendations.forEach(rec => console.log(`   ${rec}`))

  return {
    signedXML,
    documentHashes: {
      submissionHash,
      signatureDocDigest,
      rawDocumentHash,
      minifiedDocumentHash,
      transformedDocumentHash: '',
    },
    areEqual,
    recommendations,
  }
}

/**
 * Test different approaches to calculate the submission hash
 */
export async function testSubmissionHashMethods(
  invoiceData: InvoiceV1_1,
  signingCredentials: SigningCredentials,
): Promise<{
  methods: {
    current: string // Current implementation
    signatureDigest: string // Use digest from signature
    canonicalized: string // Use same canonicalization as signature
    transformed: string // Use transformed document
  }
  recommendations: string[]
}> {
  console.log('\n🧪 TESTING SUBMISSION HASH METHODS')
  console.log('==================================')

  // Generate signed XML
  const signedXML = await generateSignedInvoiceXML(
    invoiceData,
    signingCredentials,
  )

  // Method 1: Current implementation (direct SHA256 of signed XML)
  const currentHash = generateDocumentHash(signedXML)
  console.log(`Method 1 - Current: ${currentHash}`)

  // Method 2: Extract digest from signature
  const parser = new DOMParserImpl()
  const doc = parser.parseFromString(signedXML, 'application/xml')
  const digestElements = doc.getElementsByTagName('ds:DigestValue')
  const signatureDigest = digestElements[0]?.textContent || ''
  const signatureDigestHex = Buffer.from(signatureDigest, 'base64').toString(
    'hex',
  )
  console.log(`Method 2 - Signature Digest: ${signatureDigestHex}`)

  // Method 3: Use same canonicalization as signature creation
  // Note: Skip this method as it requires internal template access
  console.log(`Method 3 - Canonicalized: [Skipped - requires internal access]`)

  // Method 4: Hash the transformed document directly
  // Note: Skip this method as it requires internal template access
  console.log(`Method 4 - Transformed: [Skipped - requires internal access]`)

  const methods = {
    current: currentHash,
    signatureDigest: signatureDigestHex,
    canonicalized: '', // Skipped
    transformed: '', // Skipped
  }

  const recommendations: string[] = []

  if (methods.current !== methods.signatureDigest) {
    recommendations.push(
      '🔧 PRIMARY RECOMMENDATION: Use signature digest as submission hash',
    )
    recommendations.push(
      '   Update generateDocumentHash() to extract digest from signed XML',
    )
  }

  if (methods.current !== methods.canonicalized) {
    recommendations.push(
      '🔧 ALTERNATIVE: Use canonicalized document hash for submission',
    )
  }

  console.log('\n💡 RECOMMENDATIONS:')
  recommendations.forEach(rec => console.log(`   ${rec}`))

  return {
    methods,
    recommendations,
  }
}
