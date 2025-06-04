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

  let startIndex = pemCert.indexOf(beginMarker)
  let endIndex = pemCert.indexOf(endMarker)
  let currentBeginMarker = beginMarker

  // Check for primary markers
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    // Try finding other common markers if the primary one fails
    const altBeginMarker = '-----BEGIN PUBLIC KEY-----'
    const altEndMarker = '-----END PUBLIC KEY-----'
    startIndex = pemCert.indexOf(altBeginMarker)
    endIndex = pemCert.indexOf(altEndMarker)
    currentBeginMarker = altBeginMarker

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw new Error(
        'Invalid PEM format: Missing or misplaced BEGIN/END markers (CERTIFICATE or other expected type).',
      )
    }
  }

  // Extract the raw content between markers (including newlines, etc.)
  const content = pemCert.substring(
    startIndex + currentBeginMarker.length,
    endIndex,
  )

  // Validate the raw content *before* cleaning - check for invalid chars within the block
  // This regex checks if there's anything *other than* whitespace or Base64 characters.
  const invalidCharRegex = /[^A-Za-z0-9+/=\s]/
  if (invalidCharRegex.test(content)) {
    throw new Error(
      'Invalid non-Base64, non-whitespace characters detected in PEM content block.',
    )
  }

  // Clean the extracted content: remove only whitespace (newlines, spaces)
  const base64Der = content.replace(/\s/g, '')

  // Final check: ensure the cleaned string is valid Base64 format (e.g., correct padding)
  const base64FormatRegex = /^[A-Za-z0-9+/]*={0,2}$/
  if (!base64FormatRegex.test(base64Der)) {
    // This might catch incorrect padding or other structural issues post-cleaning
    throw new Error(
      'Invalid Base64 structure (e.g., padding) after cleaning PEM content.',
    )
  }

  if (base64Der.length === 0) {
    throw new Error(
      'Invalid PEM format: No Base64 content found between markers after cleaning.',
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
    // 1. Extract *and validate* Base64 DER content from PEM
    const base64Der = extractBase64FromPem(certificatePem)

    // Base64 validation is now done inside extractBase64FromPem
    // const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    // if (base64Der.length > 0 && !base64Regex.test(base64Der)) {
    //   throw new Error('Invalid Base64 characters detected in PEM certificate content.')
    // }

    // 2. Decode Base64 to get the raw DER bytes
    const rawDer = Buffer.from(base64Der, 'base64')

    // The check below might be redundant now with the improved extraction/validation,
    // but kept as a fallback safety measure.
    if (base64Der.length > 0 && rawDer.length === 0) {
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
