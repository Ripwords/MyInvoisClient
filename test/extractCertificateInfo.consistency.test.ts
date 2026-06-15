import { describe, it, expect } from 'vitest'
import { extractCertificateInfo as fromCertificate } from '../src/utils/certificate'
import { extractCertificateInfo as fromDocument } from '../src/utils/document'

/**
 * There must be a single source of truth for the certificate issuer name and
 * serial number: the value the constructor stores (via utils/certificate) must
 * match the value the signer embeds (via utils/document). Divergence here is
 * exactly the DS326 "issuer name mismatch" surface.
 */
describe('extractCertificateInfo consistency', () => {
  const cert = process.env.TEST_CERTIFICATE

  it.skipIf(!cert)('certificate.ts and document.ts agree on issuer + serial', () => {
    const a = fromCertificate(cert!)
    const b = fromDocument(cert!)
    expect(a.issuerName).toBe(b.issuerName)
    expect(a.serialNumber).toBe(b.serialNumber)
  })
})
