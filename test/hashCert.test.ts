import { describe, it, expect } from 'vitest'
import * as crypto from 'crypto'
import { hashCertificate } from '../src/utils/signature/hashCert'

// Use a more structured, plausible (but still generated) PEM certificate for testing the process.
// NOTE: To test against a *known external hash value*, replace this with a real
//       certificate PEM and its pre-calculated SHA-256 Base64 hash.
const sampleValidPem = `
-----BEGIN CERTIFICATE-----
MIIDBjCCAe6gAwIBAgIQCisE3VSEefMG1/VZf0J4IzANBgkqhkiG9w0BAQsF
ADBFMQswCQYDVQQGEwJNWTEUMBIGA1UEChMLVGVzdCBDQSBQS0kxGDAWBgNV
BAMTD1Rlc3QgUm9vdCBDQSBLSzAeFw0yNDAxMDEwMDAwMDBaFw0zNDAxMDEw
MDAwMDBaMD8xCzAJBgNVBAYTAk1ZMRMwEQYDVQQKEwpUZXN0IFN1YkNBMRsw
GQYDVQQDExJUZXN0IENlcnRpZmljYXRlMIIBIjANBgkqhkiG9w0BAQEFAAOC
AQ8AMIIBCgKCAQEAs/dKx0mC4c7k/w==
-----END CERTIFICATE-----
`

const sampleInvalidPemNoContent = `
-----BEGIN CERTIFICATE-----
-----END CERTIFICATE-----
`

const sampleInvalidPemBadFormat = `This is not a PEM certificate`

const samplePemWithInvalidBase64 = `
-----BEGIN CERTIFICATE-----
MIIDBjCCAe6gAwIBAgIQCisE3VSEefMG1/VZf0J4IzANBgkqhkiG9w0BAQsF
ADBFMQswCQYDVQQGEwJNWTEUMBIGA1UEChMLVGVzdCBDQSBQS0kxGDAWBgNV
***INVALID CHARACTERS HERE !@#$%^&*()***
BAMTD1Rlc3QgUm9vdCBDQSBLSzAeFw0yNDAxMDEwMDAwMDBaFw0zNDAxMDEw
MDAwMDBaMD8xCzAJBgNVBAYTAk1ZMRMwEQYDVQQKEwpUZXN0IFN1YkNBMRsw
AQ8AMIIBCgKCAQEAs/dKx0mC4c7k/w==
-----END CERTIFICATE-----
`

// Helper to calculate expected hash by extracting/cleaning/hashing PEM
// Mimics the core logic of hashCertificate for comparison
const calculateExpectedCertHash = (pemCert: string): string => {
  const beginMarker = '-----BEGIN CERTIFICATE-----'
  const endMarker = '-----END CERTIFICATE-----'
  let base64Der = ''

  const startIndex = pemCert.indexOf(beginMarker)
  const endIndex = pemCert.indexOf(endMarker)

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const content = pemCert.substring(startIndex + beginMarker.length, endIndex)
    base64Der = content.replace(/[^A-Za-z0-9+/=]/g, '')
  } else {
    throw new Error('Helper could not find certificate markers')
  }

  if (base64Der.length === 0) {
    throw new Error('Helper found no Base64 content')
  }

  const rawDer = Buffer.from(base64Der, 'base64')
  const hash = crypto.createHash('sha256')
  hash.update(rawDer)
  return hash.digest('base64')
}

describe('hashCertificate', () => {
  it('should correctly hash a valid PEM certificate (testing process)', () => {
    const expectedHash = calculateExpectedCertHash(sampleValidPem)
    const actualHash = hashCertificate(sampleValidPem)
    expect(actualHash).toEqual(expectedHash)
    expect(() => Buffer.from(actualHash, 'base64')).not.toThrow()
  })

  it('should throw an error for PEM with no content', () => {
    expect(() => hashCertificate(sampleInvalidPemNoContent)).toThrow(
      'Failed to hash certificate: Invalid PEM format: No Base64 content found between markers after cleaning.',
    )
  })

  it('should throw an error for non-PEM input (missing markers)', () => {
    expect(() => hashCertificate(sampleInvalidPemBadFormat)).toThrow(
      /^Failed to hash certificate: Invalid PEM format: Missing or misplaced BEGIN\/END markers/,
    )
  })

  it('should throw an error for empty string input', () => {
    expect(() => hashCertificate('')).toThrow(
      /^Failed to hash certificate: Invalid PEM format: Missing or misplaced BEGIN\/END markers/,
    )
  })

  it('should throw an error for invalid Base64 characters within valid markers', () => {
    expect(() => hashCertificate(samplePemWithInvalidBase64)).toThrow(
      /^Failed to hash certificate: Invalid non-Base64, non-whitespace characters detected/,
    )
  })
})
