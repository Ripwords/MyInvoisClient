import crypto from 'crypto'
import * as forge from 'node-forge'
import fs from 'fs'

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

export const getPemFromP12 = (
  p12Input: Buffer | string,
  passphrase: string,
): {
  certificatePem: string
  privateKeyPem: string
} => {
  try {
    // Load binary DER contents of the p12 file
    const p12Buffer: Buffer = Buffer.isBuffer(p12Input)
      ? p12Input
      : fs.readFileSync(p12Input)

    // Convert DER -> ASN.1
    const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'))
    const p12Asn1 = forge.asn1.fromDer(p12Der.getBytes())

    // Parse the PKCS#12 using the provided passphrase
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase)

    // Extract the first certificate (assumes it is the signing cert)
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
      forge.pki.oids.certBag
    ]
    if (!certBags || certBags.length === 0)
      throw new Error('No certificate found in PKCS#12 bundle')
    const certificatePem = forge.pki.certificateToPem(certBags[0].cert)

    // Extract the first private key
    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    })[forge.pki.oids.pkcs8ShroudedKeyBag]
    if (!keyBags || keyBags.length === 0)
      throw new Error('No private key found in PKCS#12 bundle')
    const privateKeyPem = forge.pki.privateKeyToPem(keyBags[0].key)

    return { certificatePem, privateKeyPem }
  } catch (error) {
    throw new Error(`Failed to extract PEM from PKCS#12 file: ${error}`)
  }
}
