import * as crypto from 'crypto'

/**
 * Signs the document hash digest using RSA-SHA256 and a private key.
 *
 * Corresponds to Step 4 in the MyInvois Signature Creation guide:
 * https://sdk.myinvois.hasil.gov.my/signature-creation/#step-4-sign-the-document-digest
 *
 * @param base64DocDigest The Base64 encoded SHA-256 hash of the canonicalized document (DocDigest from Step 3).
 * @param privateKeyPem The private key in PEM format (string or Buffer).
 * @returns The Base64 encoded RSA-SHA256 signature (Sig).
 * @throws {Error} If signing fails.
 */
export function signDocumentDigest(
  base64DocDigest: string,
  privateKeyPem: string | Buffer,
): string {
  try {
    // Add stricter validation: Check if the input string contains only valid Base64 characters.
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    if (base64DocDigest.length > 0 && !base64Regex.test(base64DocDigest)) {
      throw new Error('Invalid Base64 characters detected in document digest.')
    }

    // 1. Decode the Base64 document digest back to a raw buffer
    // The signature is calculated over the raw hash bytes, not the Base64 string.
    const rawDocDigest = Buffer.from(base64DocDigest, 'base64')

    // Add check: If input Base64 string was not empty, but decoded buffer is,
    // it implies invalid Base64 characters were likely ignored instead of throwing.
    if (base64DocDigest.length > 0 && rawDocDigest.length === 0) {
      throw new Error('Invalid Base64 content for document digest.')
    }

    // 2. Create a signer instance with RSA-SHA256
    const signer = crypto.createSign('RSA-SHA256')

    // 3. Update the signer with the raw hash digest
    // Note: We sign the HASH itself, not the original data.
    signer.update(rawDocDigest)
    signer.end()

    // 4. Sign using the private key and get the signature in Base64 format
    const base64Signature = signer.sign(privateKeyPem, 'base64')

    return base64Signature
  } catch (error: any) {
    console.error('Error during signing:', error)
    throw new Error(`Failed to sign document digest: ${error.message || error}`)
  }
}
