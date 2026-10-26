import { describe, it, expect } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import forge from 'node-forge'
import { getPemFromP12 } from '../../src/utils/certificate'
import * as publicApi from '../../src/index'
import { MyInvoisClient, InMemoryTokenStore } from '../../src/index'
import { getTestCredentials } from '../fixtures/test-credentials'

const makeForgeKey = () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  return forge.pki.privateKeyFromPem(privateKey)
}

const makeCert = (
  key: forge.pki.rsa.PrivateKey,
  cn: string,
  serial: string,
) => {
  const cert = forge.pki.createCertificate()
  cert.publicKey = forge.pki.setRsaPublicKey(key.n, key.e)
  cert.serialNumber = serial
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  const attrs = [{ name: 'commonName', value: cn }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(key, forge.md.sha256.create())
  return cert
}

const buildP12 = (
  certs: forge.pki.Certificate[],
  key: forge.pki.rsa.PrivateKey,
  passphrase: string,
): Buffer => {
  const asn1 = forge.pkcs12.toPkcs12Asn1(key, certs, passphrase, {
    algorithm: '3des',
  })
  return Buffer.from(forge.asn1.toDer(asn1).getBytes(), 'binary')
}

describe('getPemFromP12', () => {
  const { certificatePem, privateKeyPem } = getTestCredentials()
  const leafKey = forge.pki.privateKeyFromPem(privateKeyPem)
  const leafCert = forge.pki.certificateFromPem(certificatePem)

  it('round-trips a simple P12 into a working client', () => {
    const p12 = buildP12([leafCert], leafKey, 'secret')
    const client = MyInvoisClient.fromP12('id', 'sec', 'sandbox', p12, 'secret')
    expect(client).toBeInstanceOf(MyInvoisClient)
  })

  it('selects the cert matching the key even when a CA cert comes first', () => {
    // Real-world P12s often carry the chain with the CA first; picking
    // certBags[0] blindly pairs the CA cert with the leaf key.
    const caKey = makeForgeKey()
    const caCert = makeCert(caKey, 'Test CA', 'aa01')
    const p12 = buildP12([caCert, leafCert], leafKey, 'secret')

    const { certificatePem: extracted } = getPemFromP12(p12, 'secret')
    const extractedCert = forge.pki.certificateFromPem(extracted)
    expect(
      (extractedCert.publicKey as forge.pki.rsa.PublicKey).n.toString(16),
    ).toBe(leafKey.n.toString(16))
  })

  it('throws a wrapped error on a wrong passphrase', () => {
    const p12 = buildP12([leafCert], leafKey, 'right')
    expect(() => getPemFromP12(p12, 'wrong')).toThrow(
      /Failed to extract PEM from PKCS#12/,
    )
  })
})

describe('P12 helpers on the public API', () => {
  // Apps that need the shared stores (rateLimitStore/tokenStore) cannot use
  // fromP12, so they convert the P12 themselves and call create().
  const { certificatePem, privateKeyPem } = getTestCredentials()
  const leafKey = forge.pki.privateKeyFromPem(privateKeyPem)
  const leafCert = forge.pki.certificateFromPem(certificatePem)

  it('exports getPemFromP12 so a P12 can feed create() with injected stores', () => {
    const p12 = buildP12([leafCert], leafKey, 'secret')
    const pems = publicApi.getPemFromP12(p12, 'secret')
    const client = MyInvoisClient.create({
      clientId: 'id',
      clientSecret: 'sec',
      environment: 'sandbox',
      ...pems,
      tokenStore: new InMemoryTokenStore(),
    })
    expect(client).toBeInstanceOf(MyInvoisClient)
  })

  it('exports extractCertificateInfo for showing a certificate to users', () => {
    const info = publicApi.extractCertificateInfo(certificatePem)
    expect(info.serialNumber).toBeTruthy()
    expect(info.issuerName).toContain('MyInvois Test Certificate')
  })
})
