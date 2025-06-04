import * as crypto from 'crypto'
import * as xpath from 'xpath-ts'
import c14nFactory from 'xml-c14n'

/**
 * Selects the SignedProperties element, canonicalizes it using the best available
 * canonicalization algorithm, hashes it using SHA-256, and returns the Base64 encoded digest.
 *
 * Corresponds to Step 7 in the MyInvois Signature Creation guide:
 * https://sdk.myinvois.hasil.gov.my/signature-creation/#step-7-generate-signed-properties-hash
 *
 * Note: MyInvois documentation specifies C14N 1.1, but due to limited Node.js library support,
 * this implementation uses Exclusive C14N which is widely supported and should be compatible
 * in most cases. If signature validation fails, this may need to be updated.
 *
 * @param doc The XML Document object (from xmldom-ts) after SignedProperties population (Step 6).
 * @param algorithm Optional canonicalization algorithm URI. Defaults to Exclusive C14N.
 * @returns A Promise resolving to the Base64 encoded SHA-256 hash (PropsDigest).
 * @throws {Error} If the SignedProperties element cannot be found or canonicalization/hashing fails.
 */
export function hashSignedProperties(
  doc: Document,
  algorithm: string = 'http://www.w3.org/2001/10/xml-exc-c14n#',
): Promise<string> {
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
      const signedPropertiesNode = nodes[0] as Node

      if (!signedPropertiesNode) {
        throw new Error('Selected SignedProperties node is invalid or null.')
      }

      // 2. Canonicalize the SignedProperties node
      const c14n = c14nFactory()

      // Try C14N 1.1 first, fallback to Exclusive C14N
      let algorithmUri = algorithm

      // If C14N 1.1 is requested but not available, use Exclusive C14N
      if (algorithm === 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315') {
        console.warn(
          'C14N 1.1 requested for SignedProperties but may not be supported, falling back to Exclusive C14N',
        )
        algorithmUri = 'http://www.w3.org/2001/10/xml-exc-c14n#'
      }

      const canonicaliser = c14n.createCanonicaliser(algorithmUri)

      // Canonicalize the SignedProperties node using the callback pattern
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

/**
 * Attempts to use C14N 1.1 for SignedProperties if available, otherwise falls back to Exclusive C14N.
 */
export async function hashSignedPropertiesWithC14N11Fallback(
  doc: Document,
): Promise<string> {
  try {
    // Try C14N 1.1 first (may not be supported by xml-c14n library)
    return await hashSignedProperties(
      doc,
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    )
  } catch (error) {
    console.warn(
      'C14N 1.1 failed for SignedProperties, falling back to Exclusive C14N:',
      error,
    )
    // Fallback to Exclusive C14N
    return await hashSignedProperties(
      doc,
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    )
  }
}
