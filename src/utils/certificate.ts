import crypto from 'node:crypto'
import * as forge from 'node-forge'
import fs from 'fs'

// Single source of truth for issuer name / serial number extraction. The signer
// (utils/document) owns the canonical normalization (RDN order + XML escaping)
// that MyInvois validates against (DS326), so re-export it here rather than
// maintaining a second, divergent implementation.
export { extractCertificateInfo } from './document'

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

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
      forge.pki.oids.certBag
    ]
    if (!certBags || certBags.length === 0)
      throw new Error('No certificate found in PKCS#12 bundle')

    // The key may live in an encrypted (pkcs8ShroudedKeyBag) or plain
    // (keyBag) bag depending on how the P12 was exported.
    const keyBags =
      p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
        forge.pki.oids.pkcs8ShroudedKeyBag
      ] ?? []
    const plainKeyBags =
      p12.getBags({ bagType: forge.pki.oids.keyBag })[
        forge.pki.oids.keyBag
      ] ?? []
    const key = keyBags[0]?.key ?? plainKeyBags[0]?.key
    if (!key) throw new Error('No private key found in PKCS#12 bundle')
    const privateKeyPem = forge.pki.privateKeyToPem(key)

    // The bundle may carry the whole chain in any order; pick the cert whose
    // public key matches the private key, not blindly the first bag.
    const rsaKey = key as forge.pki.rsa.PrivateKey
    const matchingBag = certBags.find(bag => {
      const publicKey = bag.cert?.publicKey as
        | forge.pki.rsa.PublicKey
        | undefined
      return publicKey?.n != null && publicKey.n.compareTo(rsaKey.n) === 0
    })
    const cert = (matchingBag ?? certBags[0]).cert
    if (!cert) throw new Error('No certificate found in PKCS#12 bundle')
    const certificatePem = forge.pki.certificateToPem(cert)

    return { certificatePem, privateKeyPem }
  } catch (error) {
    throw new Error(`Failed to extract PEM from PKCS#12 file: ${error}`)
  }
}
