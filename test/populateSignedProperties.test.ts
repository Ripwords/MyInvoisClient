import { describe, it, expect } from 'vitest'
import { DOMParserImpl } from 'xmldom-ts'
import * as xpath from 'xpath-ts'
import { populateSignedProperties } from '../src/utils/signature/populateSignedProperties'
import type { SignedPropertiesData } from '../src/utils/signature/populateSignedProperties'

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

// Sample XML structure mimicking the UBL signature part
// Needs to include the full path for the properties to be populated.
const sampleXmlTemplate = `
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
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
                                            <xades:SigningTime></xades:SigningTime>
                                            <xades:SigningCertificate>
                                                <xades:Cert>
                                                    <xades:CertDigest>
                                                        <ds:DigestValue></ds:DigestValue>
                                                    </xades:CertDigest>
                                                    <xades:IssuerSerial>
                                                        <ds:X509IssuerName></ds:X509IssuerName>
                                                        <ds:X509SerialNumber></ds:X509SerialNumber>
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
    <!-- Other Invoice Content -->
</Invoice>
`

describe('populateSignedProperties', () => {
  const parser = new DOMParserImpl()

  it('should populate all specified properties correctly', () => {
    const doc = parser.parseFromString(sampleXmlTemplate, 'application/xml')
    const testData: SignedPropertiesData = {
      certDigest: 'TEST_CERT_DIGEST==',
      signingTime: '2024-01-01T12:00:00Z',
      issuerName: 'CN=Test Issuer, O=Test Org',
      serialNumber: '1234567890',
    }

    populateSignedProperties(doc, testData)

    // Verify each populated value using XPath
    const certDigestNodes = select(
      '//ds:DigestValue[ancestor::xades:CertDigest]',
      doc,
    ) as Node[]
    expect(certDigestNodes).toHaveLength(1)
    expect(certDigestNodes[0].textContent).toBe(testData.certDigest)

    const signingTimeNodes = select('//xades:SigningTime', doc) as Node[]
    expect(signingTimeNodes).toHaveLength(1)
    expect(signingTimeNodes[0].textContent).toBe(testData.signingTime)

    const issuerNameNodes = select('//ds:X509IssuerName', doc) as Node[]
    expect(issuerNameNodes).toHaveLength(1)
    expect(issuerNameNodes[0].textContent).toBe(testData.issuerName)

    const serialNumberNodes = select('//ds:X509SerialNumber', doc) as Node[]
    expect(serialNumberNodes).toHaveLength(1)
    expect(serialNumberNodes[0].textContent).toBe(testData.serialNumber)
  })

  it('should throw error if CertDigest element is missing', () => {
    // Create XML missing the target element
    const modifiedXml = sampleXmlTemplate.replace(
      '<ds:DigestValue></ds:DigestValue>',
      '',
    )
    const doc = parser.parseFromString(modifiedXml, 'application/xml')
    const testData: SignedPropertiesData = {
      certDigest: 'd',
      signingTime: 't',
      issuerName: 'i',
      serialNumber: 's',
    }

    expect(() => populateSignedProperties(doc, testData)).toThrow(
      /^Failed to set value for XPath .*ds:DigestValue: Element not found/,
    )
  })

  it('should throw error if SigningTime element is missing', () => {
    const modifiedXml = sampleXmlTemplate.replace(
      '<xades:SigningTime></xades:SigningTime>',
      '',
    )
    const doc = parser.parseFromString(modifiedXml, 'application/xml')
    const testData: SignedPropertiesData = {
      certDigest: 'd',
      signingTime: 't',
      issuerName: 'i',
      serialNumber: 's',
    }

    expect(() => populateSignedProperties(doc, testData)).toThrow(
      /^Failed to set value for XPath .*xades:SigningTime: Element not found/,
    )
  })

  // Add similar tests for missing IssuerName and SerialNumber if desired

  it('should throw error if multiple CertDigest elements are found', () => {
    // Create XML with duplicate target elements
    const modifiedXml = sampleXmlTemplate.replace(
      '<ds:DigestValue></ds:DigestValue>',
      '<ds:DigestValue>1</ds:DigestValue><ds:DigestValue>2</ds:DigestValue>',
    )
    const doc = parser.parseFromString(modifiedXml, 'application/xml')
    const testData: SignedPropertiesData = {
      certDigest: 'd',
      signingTime: 't',
      issuerName: 'i',
      serialNumber: 's',
    }

    expect(() => populateSignedProperties(doc, testData)).toThrow(
      /^Failed to set value for XPath .*ds:DigestValue: Multiple elements found/,
    )
  })
})
