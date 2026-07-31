import { describe, expect, it } from 'vitest'
import {
  canonicalizeJSON,
  generateCleanInvoiceObject,
  transformDocumentForHashing,
} from '../../src/utils/document'
import { legacyInvoice } from '../fixtures/legacy-invoice'

describe('serialisation stability', () => {
  // `canonicalizeJSON` sorts object keys recursively before snapshotting, so
  // this assertion only guarantees that the SET of key/value pairs in the
  // clean invoice object is unchanged for a document using no new fields.
  // It does NOT guarantee the byte order of what actually gets hashed and
  // signed — see the `transformDocumentForHashing` snapshot below for that.
  it('produces byte-identical output for a document using no new fields', () => {
    const serialised = canonicalizeJSON(generateCleanInvoiceObject(legacyInvoice))
    expect(serialised).toMatchSnapshot()
  })

  // `transformDocumentForHashing` is what actually gets hashed and signed
  // (src/utils/document.ts, `calculateDocumentDigest` / the signing
  // pipeline) — it does NOT canonicalise, it is plain JSON.stringify, so
  // insertion order is part of the signed bytes. This snapshot guards the
  // real wire/signed output: a property reordering in
  // `generateCleanInvoiceObject` would change the signed bytes and fail
  // this assertion even though the canonicalised assertion above would
  // stay green.
  it('produces byte-identical output for the actual signed/hashed bytes of a document using no new fields', () => {
    const serialised = transformDocumentForHashing([legacyInvoice])
    expect(serialised).toMatchSnapshot()
  })

  it('emits no null or empty-string values for absent optional fields', () => {
    const serialised = canonicalizeJSON(generateCleanInvoiceObject(legacyInvoice))
    expect(serialised).not.toContain(':null')
    expect(serialised).not.toContain('"_":""')
  })
})
