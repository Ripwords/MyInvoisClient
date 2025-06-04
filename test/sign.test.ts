import { describe, it, expect } from 'vitest'
import * as crypto from 'crypto'
import { signDocumentDigest } from '../src/utils/signature/sign'

// Generate a test RSA key pair for signing/verifying
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048, // Standard length
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
})

describe('signDocumentDigest', () => {
  const sampleDocDigestBase64 = 'SampleDigestValueAsBase64=='
  const sampleDocDigestRaw = Buffer.from(sampleDocDigestBase64, 'base64')

  it('should generate a valid RSA-SHA256 signature in Base64 format', () => {
    const signatureBase64 = signDocumentDigest(
      sampleDocDigestBase64,
      privateKey,
    )

    // Verify the signature using the public key
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(sampleDocDigestRaw)
    verifier.end()

    const isValid = verifier.verify(publicKey, signatureBase64, 'base64')

    expect(isValid).toBe(true)
    // Check if the output is a valid Base64 string
    expect(() => Buffer.from(signatureBase64, 'base64')).not.toThrow()
  })

  it('should throw an error if the private key is invalid', () => {
    const invalidPrivateKey =
      '-----BEGIN INVALID KEY-----\nINVALID\n-----END INVALID KEY-----'
    expect(() =>
      signDocumentDigest(sampleDocDigestBase64, invalidPrivateKey),
    ).toThrow(/Failed to sign document digest/)
    // The specific internal crypto error message might vary, so we match our wrapper message
  })

  it('should handle Buffer as private key input', () => {
    const privateKeyBuffer = Buffer.from(privateKey)
    const signatureBase64 = signDocumentDigest(
      sampleDocDigestBase64,
      privateKeyBuffer,
    )

    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(sampleDocDigestRaw)
    verifier.end()
    const isValid = verifier.verify(publicKey, signatureBase64, 'base64')
    expect(isValid).toBe(true)
  })

  it('should throw an error if the digest is not valid Base64', () => {
    const invalidBase64Digest = 'This is not base64'
    expect(() => signDocumentDigest(invalidBase64Digest, privateKey)).toThrow(
      'Invalid Base64 characters detected in document digest.',
    )
    // Error likely occurs during Buffer.from() or the preceding regex check
  })
})
