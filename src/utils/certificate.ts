import crypto from 'crypto'

/**
 * Extracts certificate information from PEM certificate
 * Converts hex serial number to decimal as required by MyInvois
 *
 * @param certificatePem - Certificate in PEM format
 * @returns Object with issuer name and decimal serial number
 */
export const extractCertificateInfo = (
  certificatePem: string,
): {
  issuerName: string
  serialNumber: string
} => {
  try {
    const cert = new crypto.X509Certificate(certificatePem)

    // Convert hex serial number to decimal (MyInvois requirement)
    const serialNumberHex = cert.serialNumber
    const serialNumberDecimal = BigInt('0x' + serialNumberHex).toString()

    return {
      issuerName: cert.issuer,
      serialNumber: serialNumberDecimal,
    }
  } catch (error) {
    throw new Error(`Failed to extract certificate info: ${error}`)
  }
}

/**
 * Validates that certificate and private key form a valid pair
 *
 * @param certificatePem - Certificate in PEM format
 * @param privateKeyPem - Private key in PEM format
 * @returns Boolean indicating if key pair is valid
 */
export const validateKeyPair = (
  certificatePem: string,
  privateKeyPem: string,
): boolean => {
  try {
    const cert = new crypto.X509Certificate(certificatePem)
    const publicKey = cert.publicKey

    // Test signature/verification cycle
    const testData = 'validation-test-data'
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(testData)
    const signature = signer.sign(privateKeyPem)

    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(testData)
    return verifier.verify(publicKey, signature)
  } catch (error) {
    console.error('Key pair validation failed:', error)
    return false
  }
}
