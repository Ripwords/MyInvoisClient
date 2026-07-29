import { describe, expect, it } from 'vitest'
import { canonicalizeJSON, generateCleanInvoiceObject } from '../src/utils/document'
import { legacyInvoice } from './fixtures/legacy-invoice'

describe('serialisation stability', () => {
  it('produces byte-identical output for a document using no new fields', () => {
    const serialised = canonicalizeJSON(generateCleanInvoiceObject(legacyInvoice))
    expect(serialised).toMatchSnapshot()
  })

  it('emits no null or empty-string values for absent optional fields', () => {
    const serialised = canonicalizeJSON(generateCleanInvoiceObject(legacyInvoice))
    expect(serialised).not.toContain(':null')
    expect(serialised).not.toContain('"_":""')
  })
})
