import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitDocument } from '../src/api/documentSubmission'
import type { AllDocumentsV1_1, SigningCredentials, Fetch } from '../src/types'

// ---- Mock generateCompleteDocument to control output size without heavy crypto ops ----
let mockSize = 1024 // default 1 KB

vi.mock('../src/utils/document', async () => {
  return {
    generateCompleteDocument: (_docs: AllDocumentsV1_1[]) => ({
      data: 'x'.repeat(mockSize),
    }),
    extractCertificateInfo: () => ({ issuerName: 'MOCK', serialNumber: '1' }),
  }
})

// ---- Helper to build minimal stub documents (only fields that submitDocument reads) ----
const buildDoc = (i: number): AllDocumentsV1_1 => {
  return {
    eInvoiceCodeOrNumber: `DOC-${i}`,
    // the rest of the properties are irrelevant for this unit test because
    // generateCompleteDocument is mocked. Cast to satisfy the type checker.
  } as unknown as AllDocumentsV1_1
}

// ---- Shared mocked context ----
const signingCredentials: SigningCredentials = {
  privateKeyPem: 'KEY',
  certificatePem: 'CERT',
  issuerName: 'MOCK',
  serialNumber: '1',
}
const mockFetch: Fetch = vi.fn().mockResolvedValue({
  json: async () => ({}),
  status: 202,
} as unknown as Response)

const context = {
  fetch: mockFetch,
  debug: false,
  signingCredentials,
}

describe('submitDocument size enforcement', () => {
  beforeEach(() => {
    mockSize = 1024 // reset to 1 KB per doc
    vi.mocked(mockFetch).mockClear()
  })

  it('rejects when more than 100 documents are provided', async () => {
    const docs = Array.from({ length: 101 }, (_, i) => buildDoc(i))

    await expect(submitDocument(context, docs)).rejects.toThrow(/100 documents/)
  })

  it('rejects when any single document exceeds 300 KB', async () => {
    mockSize = 301 * 1024 // 301 KB
    const docs = [buildDoc(0)]

    await expect(submitDocument(context, docs)).rejects.toThrow(/300KB/)
  })

  it('rejects when total payload exceeds 5 MB even if individual docs are within limit', async () => {
    mockSize = 260 * 1024 // 260 KB per doc (<300KB)
    const docs = Array.from({ length: 20 }, (_, i) => buildDoc(i)) // ~5.2 MB

    await expect(submitDocument(context, docs)).rejects.toThrow(/5MB/)
  })
})
