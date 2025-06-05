import { DOMParserImpl } from 'xmldom-ts'
import {
  extractCertificateInfo,
  generateSignedInvoiceXML,
  generateUBLXMLTemplate,
  validateKeyPair,
} from '../invoice1-1'
import type {
  InvoiceV1_1,
  SigningCredentials,
} from '../../types/documents/invoice-1_1.d.ts'
import { transformXmlInvoice } from '../signature/transform'
import {
  canonicalizeAndHashDocument,
  canonicalizeAndHashDocumentWithC14N11Fallback,
} from '../signature/canonicalize'

/**
 * Tests both canonicalization algorithms and compares their output
 * This can help determine if the algorithm difference affects signature validation
 * @param xmlDocument - The XML document string to test
 * @returns Object with canonicalization results and comparison
 */
export const testCanonicalizationAlgorithms = async (
  xmlDocument: string,
): Promise<{
  exclusiveC14N: { success: boolean; digest?: string; error?: string }
  c14n11Fallback: { success: boolean; digest?: string; error?: string }
  areEqual: boolean
}> => {
  const parser = new DOMParserImpl()
  const doc = parser.parseFromString(xmlDocument, 'application/xml')

  const results = {
    exclusiveC14N: { success: false } as any,
    c14n11Fallback: { success: false } as any,
    areEqual: false,
  }

  // Test Exclusive C14N
  try {
    const exclusiveDigest = await canonicalizeAndHashDocument(
      doc,
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    )
    results.exclusiveC14N = { success: true, digest: exclusiveDigest }
  } catch (error: any) {
    results.exclusiveC14N = { success: false, error: error.message }
  }

  // Test C14N 1.1 fallback
  try {
    const c14n11Digest =
      await canonicalizeAndHashDocumentWithC14N11Fallback(doc)
    results.c14n11Fallback = { success: true, digest: c14n11Digest }
  } catch (error: any) {
    results.c14n11Fallback = { success: false, error: error.message }
  }

  // Compare results
  if (results.exclusiveC14N.success && results.c14n11Fallback.success) {
    results.areEqual =
      results.exclusiveC14N.digest === results.c14n11Fallback.digest
  }

  return results
}

/**
 * Simple validation function that checks basic XML structure requirements
 */
export function validateXMLStructure(xmlString: string): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const parser = new DOMParserImpl()
    const doc = parser.parseFromString(xmlString, 'application/xml')

    // Check for parser errors
    const parserErrors = doc.getElementsByTagName('parsererror')
    if (parserErrors.length > 0) {
      errors.push('XML parsing failed')
      return { isValid: false, errors, warnings }
    }

    // Check required elements
    const requiredElements = [
      'Invoice',
      'UBLExtensions',
      'cbc:ID',
      'cbc:IssueDate',
      'cbc:IssueTime',
      'cbc:InvoiceTypeCode',
      'ds:Signature',
      'ds:SignatureValue',
      'ds:X509Certificate',
    ]

    for (const element of requiredElements) {
      const elements = element.includes(':')
        ? doc.getElementsByTagName(element)
        : doc.getElementsByTagName(element)

      if (elements.length === 0) {
        errors.push(`Missing required element: ${element}`)
      }
    }

    // Check namespace declarations
    const expectedNamespaces = [
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    ]

    for (const ns of expectedNamespaces) {
      if (!xmlString.includes(ns)) {
        warnings.push(`Missing namespace declaration: ${ns}`)
      }
    }
  } catch (error: any) {
    errors.push(`XML validation error: ${error.message}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Comprehensive debugging function to help identify issues with generated XML
 * This validates the structure against MyInvois requirements and provides detailed feedback
 */
export async function debugSignedInvoiceXML(
  invoiceInfo: InvoiceV1_1,
  signingCredentials: SigningCredentials,
): Promise<{
  success: boolean
  signedXML?: string
  validationResults: {
    xmlStructure: { valid: boolean; errors: string[] }
    signatureElements: { valid: boolean; errors: string[] }
    digestValues: { valid: boolean; errors: string[] }
    certificateInfo: { valid: boolean; errors: string[] }
    canonicalizationTest: any
  }
  stepByStepResults: {
    step1_template: { success: boolean; error?: string }
    step2_transform: { success: boolean; error?: string }
    step3_docDigest: { success: boolean; digest?: string; error?: string }
    step4_signature: { success: boolean; signature?: string; error?: string }
    step5_certDigest: { success: boolean; digest?: string; error?: string }
    step6_signedProps: { success: boolean; error?: string }
    step7_propsDigest: { success: boolean; digest?: string; error?: string }
    step8_finalDoc: { success: boolean; error?: string }
  }
}> {
  const stepResults = {
    step1_template: { success: false } as any,
    step2_transform: { success: false } as any,
    step3_docDigest: { success: false } as any,
    step4_signature: { success: false } as any,
    step5_certDigest: { success: false } as any,
    step6_signedProps: { success: false } as any,
    step7_propsDigest: { success: false } as any,
    step8_finalDoc: { success: false } as any,
  }

  const validationResults = {
    xmlStructure: { valid: false, errors: [] as string[] },
    signatureElements: { valid: false, errors: [] as string[] },
    digestValues: { valid: false, errors: [] as string[] },
    certificateInfo: { valid: false, errors: [] as string[] },
    canonicalizationTest: null as any,
  }

  let signedXML: string | undefined

  try {
    // Step 1: Generate template
    try {
      const xmlTemplate = generateUBLXMLTemplate(invoiceInfo)
      stepResults.step1_template = { success: true }

      // Validate XML structure
      const parser = new DOMParserImpl()
      const doc = parser.parseFromString(xmlTemplate, 'application/xml')
      const parserErrors = doc.getElementsByTagName('parsererror')
      if (parserErrors.length > 0) {
        validationResults.xmlStructure.errors.push(
          'XML template parsing failed',
        )
      } else {
        validationResults.xmlStructure.valid = true
      }
    } catch (error: any) {
      stepResults.step1_template = { success: false, error: error.message }
      validationResults.xmlStructure.errors.push(
        `Template generation failed: ${error.message}`,
      )
    }

    // Step 2: Transform
    try {
      const xmlTemplate = generateUBLXMLTemplate(invoiceInfo)
      const transformedXml = transformXmlInvoice(xmlTemplate)
      stepResults.step2_transform = { success: true }

      // Check if transformation worked correctly
      if (transformedXml.includes('UBLExtensions')) {
        validationResults.xmlStructure.errors.push(
          'UBLExtensions not properly removed in transformation',
        )
      }
      if (transformedXml.includes('<cac:Signature>')) {
        validationResults.xmlStructure.errors.push(
          'cac:Signature elements not properly removed in transformation',
        )
      }
    } catch (error: any) {
      stepResults.step2_transform = { success: false, error: error.message }
    }

    // Test canonicalization
    try {
      const xmlTemplate = generateUBLXMLTemplate(invoiceInfo)
      validationResults.canonicalizationTest =
        await testCanonicalizationAlgorithms(xmlTemplate)
    } catch (error: any) {
      validationResults.canonicalizationTest = { error: error.message }
    }

    // Continue with full signing process
    try {
      signedXML = await generateSignedInvoiceXML(
        invoiceInfo,
        signingCredentials,
      )

      // Parse the final signed XML for validation
      const parser = new DOMParserImpl()
      const finalDoc = parser.parseFromString(signedXML, 'application/xml')

      // Check signature elements are populated
      const signatureValue =
        finalDoc.getElementsByTagName('ds:SignatureValue')[0]
      const x509Certificate =
        finalDoc.getElementsByTagName('ds:X509Certificate')[0]
      const digestValues = finalDoc.getElementsByTagName('ds:DigestValue')

      if (!signatureValue || !signatureValue.textContent?.trim()) {
        validationResults.signatureElements.errors.push(
          'SignatureValue is empty',
        )
      }

      if (!x509Certificate || !x509Certificate.textContent?.trim()) {
        validationResults.signatureElements.errors.push(
          'X509Certificate is empty',
        )
      }

      if (digestValues.length < 2) {
        validationResults.digestValues.errors.push(
          'Missing digest values (expected at least 2)',
        )
      } else {
        let emptyDigests = 0
        for (let i = 0; i < digestValues.length; i++) {
          const digestElement = digestValues[i]
          if (!digestElement || !digestElement.textContent?.trim()) {
            emptyDigests++
          }
        }
        if (emptyDigests > 0) {
          validationResults.digestValues.errors.push(
            `${emptyDigests} digest values are empty`,
          )
        }
      }

      // Validate certificate info
      try {
        const certInfo = extractCertificateInfo(
          signingCredentials.certificatePem,
        )
        const keyPairValid = validateKeyPair(
          signingCredentials.certificatePem,
          signingCredentials.privateKeyPem,
        )

        if (!keyPairValid) {
          validationResults.certificateInfo.errors.push(
            'Certificate and private key do not match',
          )
        }

        if (!certInfo.issuerName || !certInfo.serialNumber) {
          validationResults.certificateInfo.errors.push(
            'Certificate info extraction failed',
          )
        }

        if (validationResults.certificateInfo.errors.length === 0) {
          validationResults.certificateInfo.valid = true
        }
      } catch (error: any) {
        validationResults.certificateInfo.errors.push(
          `Certificate validation failed: ${error.message}`,
        )
      }

      // Set validation flags
      if (validationResults.signatureElements.errors.length === 0) {
        validationResults.signatureElements.valid = true
      }
      if (validationResults.digestValues.errors.length === 0) {
        validationResults.digestValues.valid = true
      }

      // Mark individual steps as successful if we got here
      stepResults.step3_docDigest = { success: true }
      stepResults.step4_signature = { success: true }
      stepResults.step5_certDigest = { success: true }
      stepResults.step6_signedProps = { success: true }
      stepResults.step7_propsDigest = { success: true }
      stepResults.step8_finalDoc = { success: true }
    } catch (error: any) {
      console.error('Error during signing process:', error)
      stepResults.step8_finalDoc = { success: false, error: error.message }
    }
  } catch (error: any) {
    console.error('Fatal error in debugging:', error)
  }

  const allValid =
    validationResults.xmlStructure.valid &&
    validationResults.signatureElements.valid &&
    validationResults.digestValues.valid &&
    validationResults.certificateInfo.valid

  return {
    success: allValid,
    signedXML,
    validationResults,
    stepByStepResults: stepResults,
  }
}
