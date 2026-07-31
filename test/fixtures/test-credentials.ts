import { generateKeyPairSync } from 'node:crypto'
import forge from 'node-forge'

export interface TestCredentials {
  certificatePem: string
  privateKeyPem: string
}

let cached: TestCredentials | undefined

/**
 * Generates a throwaway self-signed certificate + key pair for unit tests, so
 * no test depends on `.env` or loose `.pem` files. Cached per process.
 */
export function getTestCredentials(): TestCredentials {
  if (cached) return cached

  const { privateKey: privateKeyPem } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  const forgeKey = forge.pki.privateKeyFromPem(privateKeyPem)
  const publicKey = forge.pki.setRsaPublicKey(forgeKey.n, forgeKey.e)

  const cert = forge.pki.createCertificate()
  cert.publicKey = publicKey
  cert.serialNumber = '01ab02cd03ef'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  const attrs = [
    { name: 'commonName', value: 'MyInvois Test Certificate' },
    { name: 'organizationName', value: 'Test Org Sdn Bhd' },
    { name: 'countryName', value: 'MY' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(forgeKey, forge.md.sha256.create())

  cached = {
    certificatePem: forge.pki.certificateToPem(cert),
    privateKeyPem,
  }
  return cached
}
