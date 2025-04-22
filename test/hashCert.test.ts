import { describe, it, expect } from 'vitest'
import * as crypto from 'crypto'
import { hashCertificate } from '../src/utils/signature/hashCert'

// Sample PEM certificate structure (replace with a real one for actual validation if needed)
// For testing purposes, we just need a valid PEM structure.
const sampleValidPem = `
-----BEGIN CERTIFICATE-----
MIIC+DCCAeCgAwIBAgIBATANBgkqhkiG9w0BAQsFADASMRAwDgYDVQQDEwdUZXN0
Q0EwHhcNMjQwMTAxMDAwMDAwWhcNMzQwMTAxMDAwMDAwWjASMRAwDgYDVQQDEwdU
ZXN0Q0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC5u18F/R1Pq0jT
// Base64 data lines - ensure these form valid Base64 if testing actual hash value
MIIEowIBAAKCAQEAt6qkRUMUPBEfCyx/+p/+Yg==
-----END CERTIFICATE-----
`

const sampleInvalidPemNoContent = `
-----BEGIN CERTIFICATE-----
-----END CERTIFICATE-----
`

const sampleInvalidPemBadFormat = `This is not a PEM certificate`

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
    // Fallback or handle other PEM types if necessary, here we assume CERTIFICATE
    // Or throw if structure must be strictly CERTIFICATE
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
  it('should correctly hash a valid PEM certificate', () => {
    const expectedHash = calculateExpectedCertHash(sampleValidPem)
    const actualHash = hashCertificate(sampleValidPem)
    expect(actualHash).toEqual(expectedHash)
    // Check if the output is a valid Base64 string
    expect(() => Buffer.from(actualHash, 'base64')).not.toThrow()
  })

  it('should throw an error for PEM with no content', () => {
    expect(() => hashCertificate(sampleInvalidPemNoContent)).toThrow(
      'Invalid PEM format: No Base64 content found between markers.',
    )
  })

  it('should throw an error for non-PEM input', () => {
    expect(() => hashCertificate(sampleInvalidPemBadFormat))
      // Expect the error from failing to find markers
      .toThrow(
        /^Failed to hash certificate: Invalid PEM format: Missing or misplaced BEGIN\/END markers/,
      )
  })

  it('should throw an error for empty string input', () => {
    expect(() => hashCertificate(''))
      // Expect the error from failing to find markers, wrapped by the main catch block
      .toThrow(
        /^Failed to hash certificate: Invalid PEM format: Missing or misplaced BEGIN\/END markers/,
      )
  })

  // Note: Testing for invalid Base64 *within* a valid PEM structure
  // would require a more specific sample PEM with invalid characters between markers.
})
