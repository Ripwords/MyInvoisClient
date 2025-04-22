import { describe, it, expect } from 'vitest'
import { DOMParserImpl } from 'xmldom-ts'
import * as xpath from 'xpath-ts'
import { populateFinalDocument } from '../src/utils/signature/populateFinalDocument'
import type { FinalDocumentData } from '../src/utils/signature/populateFinalDocument'

// Define namespaces matching those in the function
const ns = {
  inv: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  sig: 'urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2',
  sac: 'urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
}
const select = xpath.useNamespaces(ns)

// Sample XML structure mimicking the final signature part
const sampleXmlTemplate = `
<inv:Invoice xmlns:inv="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
             xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
             xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2"
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
             xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2"
             xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
             xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <sig:UBLDocumentSignatures>
                    <sac:SignatureInformation>
                        <ds:Signature>
                            <ds:SignedInfo>
                                <ds:Reference URI="#id-xades-signed-props">
                                    <ds:DigestValue></ds:DigestValue>
                                </ds:Reference>
                                <ds:Reference Id="id-doc-signed-data">
                                    <ds:DigestValue></ds:DigestValue>
                                </ds:Reference>
                            </ds:SignedInfo>
                            <ds:SignatureValue></ds:SignatureValue>
                            <ds:KeyInfo>
                                <ds:X509Data>
                                    <ds:X509Certificate></ds:X509Certificate>
                                </ds:X509Data>
                            </ds:KeyInfo>
                            <!-- ds:Object containing xades:QualifyingProperties would normally be here -->
                        </ds:Signature>
                    </sac:SignatureInformation>
                </sig:UBLDocumentSignatures>
            </ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>
    <!-- Optional final cac:Signature -->
    <!-- <cac:Signature><cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID></cac:Signature> -->
</inv:Invoice>
`

// Sample PEM for testing cleaning
const sampleCertificatePem = `
-----BEGIN CERTIFICATE-----
SAMPLEBASE64DATA
LINE2OFDATA
-----END CERTIFICATE-----
`
const expectedCleanedCertificate = 'SAMPLEBASE64DATALINE2OFDATA'

describe('populateFinalDocument', () => {
  const parser = new DOMParserImpl()

  it('should populate all final signature fields correctly', () => {
    const doc = parser.parseFromString(sampleXmlTemplate, 'application/xml')
    const testData: FinalDocumentData = {
      signatureValue: 'TEST_SIGNATURE_VALUE==',
      propsDigest: 'TEST_PROPS_DIGEST==',
      docDigest: 'TEST_DOC_DIGEST==',
      certificatePem: sampleCertificatePem,
    }

    populateFinalDocument(doc, testData)

    // Verify each populated value using XPath
    const signatureValueNodes = select('//ds:SignatureValue', doc) as Node[]
    expect(signatureValueNodes).toHaveLength(1)
    expect(signatureValueNodes[0].textContent).toBe(testData.signatureValue)

    const x509CertNodes = select('//ds:X509Certificate', doc) as Node[]
    expect(x509CertNodes).toHaveLength(1)
    expect(x509CertNodes[0].textContent).toBe(expectedCleanedCertificate) // Verify cleaned cert

    const propsDigestNodes = select(
      "//ds:Reference[@URI='#id-xades-signed-props']/ds:DigestValue",
      doc,
    ) as Node[]
    expect(propsDigestNodes).toHaveLength(1)
    expect(propsDigestNodes[0].textContent).toBe(testData.propsDigest)

    const docDigestNodes = select(
      "//ds:Reference[@Id='id-doc-signed-data']/ds:DigestValue",
      doc,
    ) as Node[]
    expect(docDigestNodes).toHaveLength(1)
    expect(docDigestNodes[0].textContent).toBe(testData.docDigest)
  })

  it('should throw error if SignatureValue element is missing', () => {
    const modifiedXml = sampleXmlTemplate.replace(
      '<ds:SignatureValue></ds:SignatureValue>',
      '',
    )
    const doc = parser.parseFromString(modifiedXml, 'application/xml')
    const testData: FinalDocumentData = {
      signatureValue: 's',
      propsDigest: 'p',
      docDigest: 'd',
      certificatePem: 'c',
    }

    expect(() => populateFinalDocument(doc, testData)).toThrow(
      /^Failed to set value for XPath .*ds:SignatureValue: Element not found/,
    )
  })

  it('should throw error if X509Certificate element is missing', () => {
    const modifiedXml = sampleXmlTemplate.replace(
      '<ds:X509Certificate></ds:X509Certificate>',
      '',
    )
    const doc = parser.parseFromString(modifiedXml, 'application/xml')
    const testData: FinalDocumentData = {
      signatureValue: 's',
      propsDigest: 'p',
      docDigest: 'd',
      certificatePem: 'c',
    }

    expect(() => populateFinalDocument(doc, testData)).toThrow(
      /^Failed to set value for XPath .*ds:X509Certificate: Element not found/,
    )
  })

  it('should throw error if propsDigest Reference element is missing', () => {
    // Parse the original XML
    const doc = parser.parseFromString(sampleXmlTemplate, 'application/xml')

    // Find and remove the target node using DOM manipulation
    const propsRefXPath = "//ds:Reference[@URI='#id-xades-signed-props']"
    const nodesToRemove = select(propsRefXPath, doc) as any[]
    expect(nodesToRemove).toHaveLength(1) // Ensure we found the node to remove
    const nodeToRemove = nodesToRemove[0]
    if (nodeToRemove.parentNode) {
      nodeToRemove.parentNode.removeChild(nodeToRemove)
    } else {
      throw new Error('Failed to find parent node for removal in test setup')
    }

    const testData: FinalDocumentData = {
      signatureValue: 's',
      propsDigest: 'p',
      docDigest: 'd',
      certificatePem: 'c',
    }

    // Regex adjusted slightly for flexibility (kept from previous step)
    expect(() => populateFinalDocument(doc, testData)).toThrow(
      /^Failed to set value for XPath .*@URI='#id-xades-signed-props'.*\/ds:DigestValue: Element not found for XPath: .*@URI='#id-xades-signed-props'.*\/ds:DigestValue$/,
    )
  })

  it('should throw error if docDigest Reference element is missing', () => {
    // Parse the original XML
    const doc = parser.parseFromString(sampleXmlTemplate, 'application/xml')

    // Find and remove the target node using DOM manipulation
    const docRefXPath = "//ds:Reference[@Id='id-doc-signed-data']"
    const nodesToRemove = select(docRefXPath, doc) as any[]
    expect(nodesToRemove).toHaveLength(1) // Ensure we found the node to remove
    const nodeToRemove = nodesToRemove[0]
    if (nodeToRemove.parentNode) {
      nodeToRemove.parentNode.removeChild(nodeToRemove)
    } else {
      throw new Error('Failed to find parent node for removal in test setup')
    }

    const testData: FinalDocumentData = {
      signatureValue: 's',
      propsDigest: 'p',
      docDigest: 'd',
      certificatePem: 'c',
    }

    // Regex adjusted slightly for flexibility (kept from previous step)
    expect(() => populateFinalDocument(doc, testData)).toThrow(
      /^Failed to set value for XPath .*@Id='id-doc-signed-data'.*\/ds:DigestValue: Element not found for XPath: .*@Id='id-doc-signed-data'.*\/ds:DigestValue$/,
    )
  })

  it('should throw error if multiple SignatureValue elements are found', () => {
    const modifiedXml = sampleXmlTemplate.replace(
      '<ds:SignatureValue></ds:SignatureValue>',
      '<ds:SignatureValue>1</ds:SignatureValue><ds:SignatureValue>2</ds:SignatureValue>',
    )
    const doc = parser.parseFromString(modifiedXml, 'application/xml')
    const testData: FinalDocumentData = {
      signatureValue: 's',
      propsDigest: 'p',
      docDigest: 'd',
      certificatePem: 'c',
    }

    expect(() => populateFinalDocument(doc, testData)).toThrow(
      /^Failed to set value for XPath .*ds:SignatureValue: Multiple elements found/,
    )
  })
})
