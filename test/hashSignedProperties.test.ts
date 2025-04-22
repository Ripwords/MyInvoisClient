import { describe, it, expect } from 'vitest'
import { DOMParserImpl } from 'xmldom-ts'
import * as xpath from 'xpath-ts'
import * as crypto from 'crypto'
import c14nFactory from 'xml-c14n'
import { hashSignedProperties } from '../src/utils/signature/hashSignedProperties'

// Define namespaces matching those in the function
const ns = {
  inv: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  sig: 'urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2',
  sac: 'urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
  xades: 'http://uri.etsi.org/01903/v1.3.2#',
}
const select = xpath.useNamespaces(ns)

// Sample XML with a populated SignedProperties section
const sampleXmlWithSignedProps = `
<inv:Invoice xmlns:inv="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
             xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
             xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2"
             xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2"
             xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
             xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <sig:UBLDocumentSignatures>
                    <sac:SignatureInformation>
                        <ds:Signature>
                            <ds:Object>
                                <xades:QualifyingProperties>
                                    <xades:SignedProperties>
                                        <xades:SignedSignatureProperties>
                                            <xades:SigningTime>2024-01-01T12:00:00Z</xades:SigningTime>
                                            <xades:SigningCertificate>
                                                <xades:Cert>
                                                    <xades:CertDigest>
                                                        <ds:DigestValue>TEST_CERT_DIGEST==</ds:DigestValue>
                                                    </xades:CertDigest>
                                                    <xades:IssuerSerial>
                                                        <ds:X509IssuerName>CN=Test Issuer, O=Test Org</ds:X509IssuerName>
                                                        <ds:X509SerialNumber>1234567890</ds:X509SerialNumber>
                                                    </xades:IssuerSerial>
                                                </xades:Cert>
                                            </xades:SigningCertificate>
                                        </xades:SignedSignatureProperties>
                                    </xades:SignedProperties>
                                </xades:QualifyingProperties>
                            </ds:Object>
                        </ds:Signature>
                    </sac:SignatureInformation>
                </sig:UBLDocumentSignatures>
            </ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>
</inv:Invoice>
`

// Helper to canonicalize and hash a given node (for comparison)
const calculateExpectedPropsHash = (node: Node): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const c14n = c14nFactory()
      const algorithmUri = 'http://www.w3.org/2001/10/xml-exc-c14n#'
      const canonicaliser = c14n.createCanonicaliser(algorithmUri)

      canonicaliser.canonicalise(node, (error, canonicalXml) => {
        if (error) return reject(error)
        if (typeof canonicalXml !== 'string')
          return reject(new Error('Canonicalization failed in helper'))

        const hash = crypto.createHash('sha256')
        hash.update(canonicalXml, 'utf8')
        resolve(hash.digest('base64'))
      })
    } catch (e) {
      reject(e)
    }
  })
}

describe('hashSignedProperties', () => {
  const parser = new DOMParserImpl()

  it('should correctly hash the SignedProperties element', async () => {
    const doc = parser.parseFromString(
      sampleXmlWithSignedProps,
      'application/xml',
    )

    // Find the node in the test to calculate the expected hash
    const signedPropertiesXPath = '//xades:SignedProperties' // Simplified XPath for test verification
    const nodes = select(signedPropertiesXPath, doc)
    expect(nodes).toBeInstanceOf(Array)
    expect(nodes).toHaveLength(1)
    const signedPropsNode = nodes[0] as Node

    const expectedHash = await calculateExpectedPropsHash(signedPropsNode)
    const actualHash = await hashSignedProperties(doc)

    expect(actualHash).toEqual(expectedHash)
    // Check if the output is a valid Base64 string
    expect(() => Buffer.from(actualHash, 'base64')).not.toThrow()
  })

  it('should throw error if SignedProperties element is missing', async () => {
    // Create XML missing the target element
    const modifiedXml = sampleXmlWithSignedProps.replace(
      /<xades:SignedProperties>.*<\/xades:SignedProperties>/s,
      '',
    )
    const doc = parser.parseFromString(modifiedXml, 'application/xml')

    await expect(hashSignedProperties(doc)).rejects.toThrow(
      /^SignedProperties processing setup failed: SignedProperties element not found/,
    )
  })

  it('should throw error if multiple SignedProperties elements are found', async () => {
    // Create XML with duplicate target elements
    const signedPropsBlock =
      sampleXmlWithSignedProps.match(
        /<xades:SignedProperties>.*<\/xades:SignedProperties>/s,
      )?.[0] || ''
    const modifiedXml = sampleXmlWithSignedProps.replace(
      signedPropsBlock,
      `${signedPropsBlock}${signedPropsBlock}`, // Duplicate the block
    )
    const doc = parser.parseFromString(modifiedXml, 'application/xml')

    await expect(hashSignedProperties(doc)).rejects.toThrow(
      /^SignedProperties processing setup failed: Multiple SignedProperties elements found/,
    )
  })

  // Add test for canonicalization failure if possible (requires mocking c14n)
})
