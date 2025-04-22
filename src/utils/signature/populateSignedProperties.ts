import * as xpath from 'xpath-ts'
// Assuming Document and Node types from xmldom-ts are available globally or via import
// import type { Document, Node } from 'xmldom-ts';

export interface SignedPropertiesData {
  certDigest: string // Base64 encoded SHA-256 hash of certificate (Step 5)
  signingTime: string // ISO 8601 UTC timestamp string (e.g., 2023-10-26T10:30:00Z)
  issuerName: string // Certificate Issuer Name
  serialNumber: string // Certificate Serial Number
}

/**
 * Populates the SignedProperties section within the UBL document's signature structure.
 *
 * Corresponds to Step 6 in the MyInvois Signature Creation guide:
 * https://sdk.myinvois.hasil.gov.my/signature-creation/#step-6-populate-the-signed-properties-section
 *
 * Modifies the passed Document object in place.
 *
 * @param doc The XML Document object (from xmldom-ts) containing the signature structure.
 * @param properties An object containing the data to populate.
 * @throws {Error} If any target element cannot be found or if multiple are found.
 */
export function populateSignedProperties(
  doc: Document,
  properties: SignedPropertiesData,
): void {
  // Define namespaces used in the XPaths
  const ns = {
    inv: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2', // Define prefix for default NS
    ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    sig: 'urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2',
    sac: 'urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2',
    ds: 'http://www.w3.org/2000/09/xmldsig#',
    xades: 'http://uri.etsi.org/01903/v1.3.2#', // Common XAdES namespace
  }
  const select = xpath.useNamespaces(ns)

  // Helper function to find a single node and set its text content
  const setElementValue = (xpathExpr: string, value: string) => {
    try {
      const nodes = select(xpathExpr, doc)

      // Refine check: Explicitly look for an empty array result
      if (!Array.isArray(nodes) || nodes.length === 0) {
        throw new Error(`Element not found for XPath: ${xpathExpr}`)
      }
      if (nodes.length > 1) {
        throw new Error(
          `Multiple elements found for XPath (expected 1): ${xpathExpr}`,
        )
      }

      const node = nodes[0]

      // Ensure it's a valid Node (like Element or Attr) before setting textContent
      if (node && typeof node === 'object' && 'textContent' in node) {
        // Type assertion might be needed if TS struggles with union type from select
        ;(node as Node).textContent = value
      } else {
        throw new Error(
          `Selected item is not a valid Node for XPath: ${xpathExpr}`,
        )
      }
    } catch (error: any) {
      console.error(`Error setting value for XPath ${xpathExpr}:`, error)
      // Re-throw to indicate failure to populate
      throw new Error(
        `Failed to set value for XPath ${xpathExpr}: ${error.message}`,
      )
    }
  }

  // Define XPaths based on UBL documentation
  // Use the defined prefix 'inv' for the root Invoice element
  const basePath =
    '/inv:Invoice/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sig:UBLDocumentSignatures/sac:SignatureInformation/ds:Signature/ds:Object/xades:QualifyingProperties/xades:SignedProperties/xades:SignedSignatureProperties'

  const certDigestPath = `${basePath}/xades:SigningCertificate/xades:Cert/xades:CertDigest/ds:DigestValue`
  const signingTimePath = `${basePath}/xades:SigningTime`
  const issuerNamePath = `${basePath}/xades:SigningCertificate/xades:Cert/xades:IssuerSerial/ds:X509IssuerName`
  const serialNumberPath = `${basePath}/xades:SigningCertificate/xades:Cert/xades:IssuerSerial/ds:X509SerialNumber`

  // Populate the values
  setElementValue(certDigestPath, properties.certDigest)
  setElementValue(signingTimePath, properties.signingTime)
  setElementValue(issuerNamePath, properties.issuerName)
  setElementValue(serialNumberPath, properties.serialNumber)

  // Document `doc` is modified in place, no return value needed.
}
