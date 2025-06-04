import * as xpath from 'xpath-ts'

export interface FinalDocumentData {
  signatureValue: string // Base64 encoded RSA signature (Sig from Step 4)
  propsDigest: string // Base64 encoded hash of SignedProperties (PropsDigest from Step 7)
  docDigest: string // Base64 encoded hash of Canonicalized Document (DocDigest from Step 3)
  certificatePem: string // Signing certificate in PEM format
}

/**
 * Extracts the Base64 encoded DER certificate content from a PEM string,
 * removing headers, footers, and newlines.
 * @param pemCert The certificate in PEM format.
 * @returns The cleaned Base64 DER string.
 */
function cleanCertificatePem(pemCert: string): string {
  const beginMarker = '-----BEGIN CERTIFICATE-----'
  const endMarker = '-----END CERTIFICATE-----'
  let content = pemCert

  const startIndex = pemCert.indexOf(beginMarker)
  const endIndex = pemCert.indexOf(endMarker)

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    content = pemCert.substring(startIndex + beginMarker.length, endIndex)
  } // else: Assume it might be just the Base64 part already, or another PEM type

  // Remove any remaining non-Base64 characters (newlines, etc.)
  return content.replace(/[^A-Za-z0-9+/=]/g, '')
}

/**
 * Populates the final signature information fields within the UBL document's signature structure.
 *
 * Corresponds to Step 8 in the MyInvois Signature Creation guide:
 * https://sdk.myinvois.hasil.gov.my/signature-creation/#step-8-populate-the-information-in-the-document-to-create-the-signed-document
 *
 * Modifies the passed Document object in place.
 *
 * @param doc The XML Document object (from xmldom-ts) containing the signature structure.
 * @param finalData An object containing the final signature data to populate.
 * @throws {Error} If any target element cannot be found or if multiple are found.
 */
export function populateFinalDocument(
  doc: Document,
  finalData: FinalDocumentData,
): void {
  const ns = {
    inv: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    sig: 'urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2',
    sac: 'urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2',
    ds: 'http://www.w3.org/2000/09/xmldsig#',
    // No xades needed here, but cac might be needed if populating /Invoice/cac:Signature
    // cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
    cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  }
  const select = xpath.useNamespaces(ns)

  // Helper function to find a single node and set its text content
  const setElementValue = (xpathExpr: string, value: string) => {
    try {
      const selectionResult = select(xpathExpr, doc) // Store the result first

      // Check 0: Explicitly check for null/undefined before array check
      if (selectionResult == null) {
        // Use == to catch both null and undefined
        throw new Error(
          `XPath selection returned null or undefined for: ${xpathExpr}`,
        )
      }

      // Check 1: Ensure it's an array (xpath.select can return other types)
      if (!Array.isArray(selectionResult)) {
        throw new Error(
          `XPath selection did not return an array for: ${xpathExpr}. Result: ${typeof selectionResult}`,
        )
      }

      // Check 2: Ensure exactly one node was found
      if (selectionResult.length === 0) {
        throw new Error(`Element not found for XPath: ${xpathExpr}`)
      }
      if (selectionResult.length > 1) {
        throw new Error(
          `Multiple elements found for XPath (expected 1): ${xpathExpr}`,
        )
      }

      // Check 3: Ensure the found item is a Node and specifically an Element node (type 1)
      const node = selectionResult[0] as Node // Assert as Node for type checking
      // Node.ELEMENT_NODE is typically 1
      if (
        !node ||
        typeof node !== 'object' ||
        !('nodeType' in node) ||
        node.nodeType !== 1
      ) {
        throw new Error(
          `Selected item is not an Element Node for XPath: ${xpathExpr}. Node details: ${JSON.stringify(node)}`,
        )
      }

      // Check 4: Ensure textContent can be set (should be true for element nodes)
      if ('textContent' in node) {
        // Ensure the property is writable (though typically it is for elements)
        node.textContent = value
      } else {
        // This case should technically be impossible if nodeType is 1
        throw new Error(
          `Selected Element Node does not have textContent property for XPath: ${xpathExpr}`,
        )
      }
    } catch (error: any) {
      console.error(`Error setting value for XPath ${xpathExpr}:`, error)
      // Keep the wrapping error message format consistent with tests
      throw new Error(
        `Failed to set value for XPath ${xpathExpr}: ${error.message}`,
      )
    }
  }

  // Helper function to check if *at least one* node exists for an XPath
  const checkElementExists = (xpathExpr: string): boolean => {
    try {
      const selectionResult = select(xpathExpr, doc)
      // Check if it's an array and has at least one element
      return Array.isArray(selectionResult) && selectionResult.length > 0
    } catch (error) {
      console.error(`Error checking existence for XPath ${xpathExpr}:`, error)
      return false // Treat errors during check as non-existent
    }
  }

  // Define XPaths based on UBL documentation for Step 8
  const basePath =
    '/inv:Invoice/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sig:UBLDocumentSignatures/sac:SignatureInformation/ds:Signature'

  // Define XPaths for the parent Reference elements
  const propsRefPath = `${basePath}/ds:SignedInfo/ds:Reference[@URI='#id-xades-signed-props']`
  const docRefPath = `${basePath}/ds:SignedInfo/ds:Reference[@Id='id-doc-signed-data']`

  // Define XPaths for the target elements
  const signatureValuePath = `${basePath}/ds:SignatureValue`
  const x509CertPath = `${basePath}/ds:KeyInfo/ds:X509Data/ds:X509Certificate`
  const propsDigestPath = `${propsRefPath}/ds:DigestValue`
  const docDigestPath = `${docRefPath}/ds:DigestValue`

  // Populate the values, adding existence checks for Reference parents
  setElementValue(signatureValuePath, finalData.signatureValue)
  setElementValue(x509CertPath, cleanCertificatePem(finalData.certificatePem))

  // Check propsDigest parent before setting value
  if (!checkElementExists(propsRefPath)) {
    // Throw using the child path to match original test intent
    throw new Error(
      `Failed to set value for XPath ${propsDigestPath}: Element not found for XPath: ${propsDigestPath}`,
    )
  }
  setElementValue(propsDigestPath, finalData.propsDigest)

  // Check docDigest parent before setting value
  if (!checkElementExists(docRefPath)) {
    // Throw using the child path to match original test intent
    throw new Error(
      `Failed to set value for XPath ${docDigestPath}: Element not found for XPath: ${docDigestPath}`,
    )
  }
  setElementValue(docDigestPath, finalData.docDigest)

  // Populate the /Invoice/cac:Signature elements
  const cacSignatureIdPath = '/inv:Invoice/cac:Signature/cbc:ID'
  const cacSignatureMethodPath =
    '/inv:Invoice/cac:Signature/cbc:SignatureMethod'

  // Static values based on the user's example XML
  const cacSignatureIdValue =
    'urn:oasis:names:specification:ubl:signature:Invoice'
  const cacSignatureMethodValue =
    'urn:oasis:names:specification:ubl:dsig:enveloped:xades'

  setElementValue(cacSignatureIdPath, cacSignatureIdValue)
  setElementValue(cacSignatureMethodPath, cacSignatureMethodValue)

  // Document `doc` is modified in place.
}
