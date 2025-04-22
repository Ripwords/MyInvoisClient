import * as crypto from 'crypto'

/**
 * Extracts the Base64 encoded DER certificate from a PEM string.
 * Removes headers/footers and newlines.
 *
 * @param pemCert The certificate in PEM format (string).
 * @returns The Base64 encoded DER certificate string.
 * @throws {Error} If the PEM format is invalid or content is not found.
 */
function extractBase64FromPem(pemCert: string): string {
  const beginMarker = '-----BEGIN CERTIFICATE-----'
  const endMarker = '-----END CERTIFICATE-----'

  const startIndex = pemCert.indexOf(beginMarker)
  const endIndex = pemCert.indexOf(endMarker)

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    // Try finding other common markers if the primary one fails
    const altBeginMarker = '-----BEGIN PUBLIC KEY-----' // Example, adjust if needed
    const altEndMarker = '-----END PUBLIC KEY-----'
    const altStartIndex = pemCert.indexOf(altBeginMarker)
    const altEndIndex = pemCert.indexOf(altEndMarker)

    if (
      altStartIndex === -1 ||
      altEndIndex === -1 ||
      altEndIndex <= altStartIndex
    ) {
      throw new Error(
        'Invalid PEM format: Missing or misplaced BEGIN/END markers (CERTIFICATE or other expected type).',
      )
    } else {
      // Use alt markers if found
      const content = pemCert.substring(
        altStartIndex + altBeginMarker.length,
        altEndIndex,
      )
      const base64Der = content.replace(/[^A-Za-z0-9+/=]/g, '')
      if (base64Der.length === 0)
        throw new Error(
          'Invalid PEM format: No Base64 content found between markers.',
        )
      return base64Der
    }
  }

  // Extract the content between primary markers
  const content = pemCert.substring(startIndex + beginMarker.length, endIndex)

  // Remove any non-Base64 characters (like newlines, spaces, comments)
  const base64Der = content.replace(/[^A-Za-z0-9+/=]/g, '')

  if (base64Der.length === 0) {
    throw new Error(
      'Invalid PEM format: No Base64 content found between markers.',
    )
  }

  return base64Der
}

/**
 * Hashes the signing certificate using SHA-256 and encodes the hash in Base64.
 *
 * Corresponds to Step 5 in the MyInvois Signature Creation guide:
 * https://sdk.myinvois.hasil.gov.my/signature-creation/#step-5-generate-the-certificate-hash
 *
 * @param certificatePem The signing certificate in PEM format (string).
 * @returns The Base64 encoded SHA-256 hash of the certificate (CertDigest).
 * @throws {Error} If hashing fails or PEM is invalid.
 */
export function hashCertificate(certificatePem: string): string {
  try {
    // 1. Extract Base64 DER content from PEM
    const base64Der = extractBase64FromPem(certificatePem)

    // Add stricter validation: Check if the extracted string contains only valid Base64 characters.
    // This regex allows A-Z, a-z, 0-9, +, /, and = (padding) only.
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    if (base64Der.length > 0 && !base64Regex.test(base64Der)) {
      throw new Error(
        'Invalid Base64 characters detected in PEM certificate content.',
      )
    }

    // 2. Decode Base64 to get the raw DER bytes
    const rawDer = Buffer.from(base64Der, 'base64')

    // Existing check (kept for belts and suspenders, though regex should catch most cases)
    if (base64Der.length > 0 && rawDer.length === 0) {
      // This might catch edge cases the regex misses or different Buffer.from behavior
      throw new Error(
        'Invalid Base64 content characters in PEM certificate (Buffer decoding check).',
      )
    }

    // 3. Hash the raw DER certificate using SHA-256
    const hash = crypto.createHash('sha256')
    hash.update(rawDer)

    // 4. Encode the hash digest to Base64
    const base64CertDigest = hash.digest('base64')

    return base64CertDigest
  } catch (error: any) {
    console.error('Error hashing certificate:', error)
    throw new Error(`Failed to hash certificate: ${error.message || error}`)
  }
}
