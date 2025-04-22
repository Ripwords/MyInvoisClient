import * as crypto from 'crypto'
import * as xpath from 'xpath-ts'
import c14nFactory from 'xml-c14n'
// Assuming Document and Node types from xmldom-ts are available globally or via import
// import type { Document, Node } from 'xmldom-ts';

/**
 * Selects the SignedProperties element, canonicalizes it (Exclusive C14N),
 * hashes it using SHA-256, and returns the Base64 encoded digest.
 *
 * Corresponds to Step 7 in the MyInvois Signature Creation guide:
 * https://sdk.myinvois.hasil.gov.my/signature-creation/#step-7-generate-signed-properties-hash
 *
 * Note: Assumes Exclusive C14N, consistent with Step 3 implementation. C14N 1.1 might be needed.
 *
 * @param doc The XML Document object (from xmldom-ts) after SignedProperties population (Step 6).
 * @returns A Promise resolving to the Base64 encoded SHA-256 hash (PropsDigest).
 * @throws {Error} If the SignedProperties element cannot be found or canonicalization/hashing fails.
 */
export function hashSignedProperties(doc: Document): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Define namespaces, including the default namespace for Invoice
      const ns = {
        inv: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
        sig: 'urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2',
        sac: 'urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2',
        ds: 'http://www.w3.org/2000/09/xmldsig#',
        xades: 'http://uri.etsi.org/01903/v1.3.2#',
      }
      const select = xpath.useNamespaces(ns)

      // 1. Get the SignedProperties element using XPath
      const signedPropertiesXPath =
        '/inv:Invoice/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sig:UBLDocumentSignatures/sac:SignatureInformation/ds:Signature/ds:Object/xades:QualifyingProperties/xades:SignedProperties'
      const nodes = select(signedPropertiesXPath, doc)

      if (!Array.isArray(nodes) || nodes.length === 0) {
        throw new Error(
          `SignedProperties element not found for XPath: ${signedPropertiesXPath}`,
        )
      }
      if (nodes.length > 1) {
        throw new Error(
          `Multiple SignedProperties elements found (expected 1): ${signedPropertiesXPath}`,
        )
      }
      const signedPropertiesNode = nodes[0] as Node // Assuming the result is a Node

      if (!signedPropertiesNode) {
        throw new Error('Selected SignedProperties node is invalid or null.')
      }

      // 2. Canonicalize the SignedProperties node (Exclusive C14N)
      const c14n = c14nFactory()
      const algorithmUri = 'http://www.w3.org/2001/10/xml-exc-c14n#'
      const canonicaliser = c14n.createCanonicaliser(algorithmUri)

      canonicaliser.canonicalise(
        signedPropertiesNode,
        (error, canonicalXml) => {
          if (error) {
            console.error(
              'Error during SignedProperties canonicalization:',
              error,
            )
            return reject(
              new Error(
                `SignedProperties canonicalization failed: ${error.message || error}`,
              ),
            )
          }

          if (typeof canonicalXml !== 'string') {
            return reject(
              new Error(
                'SignedProperties canonicalization did not return a string result.',
              ),
            )
          }

          try {
            // 3. Hash the canonicalized property tag using SHA-256
            const hash = crypto.createHash('sha256')
            hash.update(canonicalXml, 'utf8')

            // 4. Encode the hashed property tag using Base64 Encoder
            const base64PropsDigest = hash.digest('base64')

            resolve(base64PropsDigest)
          } catch (hashError: any) {
            console.error('Error during SignedProperties hashing:', hashError)
            reject(
              new Error(
                `SignedProperties hashing failed: ${hashError.message || hashError}`,
              ),
            )
          }
        },
      )
    } catch (setupError: any) {
      // Catch errors during XPath selection or canonicalizer setup
      console.error(
        'Error setting up or selecting SignedProperties:',
        setupError,
      )
      reject(
        new Error(
          `SignedProperties processing setup failed: ${setupError.message || setupError}`,
        ),
      )
    }
  })
}
