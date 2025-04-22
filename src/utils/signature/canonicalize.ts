import * as crypto from 'crypto'
import c14nFactory from 'xml-c14n'

/**
 * Canonicalizes the XML document using Exclusive C14N (as C14N 1.1 support is unclear
 * in the chosen library), hashes it using SHA-256, and returns the Base64 encoded digest.
 *
 * Corresponds to Step 3 in the MyInvois Signature Creation guide:
 * https://sdk.myinvois.hasil.gov.my/signature-creation/#step-3-canonicalize-the-document-and-generate-the-document-hash-digest
 *
 * Note: The MyInvois documentation specifies C14N 1.1, but the 'xml-c14n' library examples
 * show Exclusive C14N (http://www.w3.org/2001/10/xml-exc-c14n#). Using Exclusive C14N here.
 * This might need adjustment if C14N 1.1 is strictly required.
 *
 * @param doc The XML Document object (from xmldom-ts) after transformations (Step 2).
 * @returns A Promise resolving to the Base64 encoded SHA-256 hash (DocDigest).
 * @throws {Error} If canonicalization or hashing fails.
 */
export function canonicalizeAndHashDocument(doc: Document): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // 1. Get the canonicalization factory instance
      const c14n = c14nFactory()

      // 2. Create a canonicaliser instance for the desired algorithm
      // Using Exclusive C14N as shown in library examples.
      const algorithmUri = 'http://www.w3.org/2001/10/xml-exc-c14n#'
      const canonicaliser = c14n.createCanonicaliser(algorithmUri)

      // 3. Canonicalize the document using the callback pattern
      // Pass the whole document node. Check if doc.documentElement should be used instead.
      canonicaliser.canonicalise(doc, (error, canonicalXml) => {
        if (error) {
          // Ensure proper error propagation
          console.error('Error during canonicalization:', error)
          return reject(
            new Error(`Canonicalization failed: ${error.message || error}`),
          )
        }

        if (typeof canonicalXml !== 'string') {
          // Handle cases where canonicalization might not return a string as expected
          return reject(
            new Error('Canonicalization did not return a string result.'),
          )
        }

        try {
          // 4. Hash the canonicalized document using SHA-256
          const hash = crypto.createHash('sha256')
          hash.update(canonicalXml, 'utf8') // Ensure UTF-8 encoding

          // 5. Encode the hash digest to Base64
          const base64Digest = hash.digest('base64')

          resolve(base64Digest)
        } catch (hashError: any) {
          console.error('Error during hashing:', hashError)
          reject(new Error(`Hashing failed: ${hashError.message || hashError}`))
        }
      })
    } catch (setupError: any) {
      // Catch errors during factory/canonicaliser creation
      console.error('Error setting up canonicalizer:', setupError)
      reject(
        new Error(
          `Canonicalizer setup failed: ${setupError.message || setupError}`,
        ),
      )
    }
  })
}
