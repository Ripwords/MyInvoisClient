import * as crypto from 'crypto'
import c14nFactory from 'xml-c14n'

/**
 * Canonicalizes the XML document using the best available canonicalization algorithm,
 * hashes it using SHA-256, and returns the Base64 encoded digest.
 *
 * Corresponds to Step 3 in the MyInvois Signature Creation guide:
 * https://sdk.myinvois.hasil.gov.my/signature-creation/#step-3-canonicalize-the-document-and-generate-the-document-hash-digest
 *
 * Note: MyInvois documentation specifies C14N 1.1, but due to limited Node.js library support,
 * this implementation uses Exclusive C14N which is widely supported and should be compatible
 * in most cases. If signature validation fails, this may need to be updated.
 *
 * @param doc The XML Document object (from xmldom-ts) after transformations (Step 2).
 * @param algorithm Optional canonicalization algorithm URI. Defaults to Exclusive C14N.
 * @returns A Promise resolving to the Base64 encoded SHA-256 hash (DocDigest).
 * @throws {Error} If canonicalization or hashing fails.
 */
export function canonicalizeAndHashDocument(
  doc: Document,
  algorithm: string = 'http://www.w3.org/2001/10/xml-exc-c14n#',
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Get the canonicalization factory instance
      const c14n = c14nFactory()

      // Create a canonicaliser instance for the desired algorithm
      // Try C14N 1.1 first, fallback to Exclusive C14N
      let algorithmUri = algorithm

      // If C14N 1.1 is requested but not available, use Exclusive C14N
      if (algorithm === 'https://www.w3.org/TR/xml-c14n11') {
        console.warn(
          'C14N 1.1 requested but may not be supported, falling back to Exclusive C14N',
        )
        algorithmUri = 'http://www.w3.org/2001/10/xml-exc-c14n#'
      }

      const canonicaliser = c14n.createCanonicaliser(algorithmUri)

      // Canonicalize the document using the callback pattern
      canonicaliser.canonicalise(doc, (error, canonicalXml) => {
        if (error) {
          console.error('Error during canonicalization:', error)
          return reject(
            new Error(`Canonicalization failed: ${error.message || error}`),
          )
        }

        if (typeof canonicalXml !== 'string') {
          return reject(
            new Error('Canonicalization did not return a string result.'),
          )
        }

        try {
          // Hash the canonicalized document using SHA-256
          const hash = crypto.createHash('sha256')
          hash.update(canonicalXml, 'utf8')

          // Encode the hash digest to Base64
          const base64Digest = hash.digest('base64')

          resolve(base64Digest)
        } catch (hashError: any) {
          console.error('Error during hashing:', hashError)
          reject(new Error(`Hashing failed: ${hashError.message || hashError}`))
        }
      })
    } catch (setupError: any) {
      console.error('Error setting up canonicalizer:', setupError)
      reject(
        new Error(
          `Canonicalizer setup failed: ${setupError.message || setupError}`,
        ),
      )
    }
  })
}

/**
 * Attempts to use C14N 1.1 if available, otherwise falls back to Exclusive C14N.
 * This function provides a way to try the MyInvois-specified algorithm first.
 */
export async function canonicalizeAndHashDocumentWithC14N11Fallback(
  doc: Document,
): Promise<string> {
  try {
    // Try C14N 1.1 first (may not be supported by xml-c14n library)
    return await canonicalizeAndHashDocument(
      doc,
      'http://www.w3.org/2006/12/xml-c14n11',
    )
  } catch (error) {
    console.warn('C14N 1.1 failed, falling back to Exclusive C14N:', error)
    // Fallback to Exclusive C14N
    return await canonicalizeAndHashDocument(
      doc,
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    )
  }
}
