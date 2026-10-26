# Signing & Submission

MyInvois requires every document to be digitally signed with an XAdES
signature embedded in the UBL JSON before submission. The library implements
the official JSON signing profile — see the LHDN references:

- [Signature creation (JSON)](https://sdk.myinvois.hasil.gov.my/signature-creation-json/)
- [Signature FAQ](https://sdk.myinvois.hasil.gov.my/signature/)
- [Submit Documents API](https://sdk.myinvois.hasil.gov.my/einvoicingapi/02-submit-documents/)

## The simple path

`submitDocument` signs, hashes, encodes and submits in one call:

```typescript
const { data, status } = await client.submitDocument([invoice])
// data.submissionUid, data.acceptedDocuments, data.rejectedDocuments
```

Up to 100 documents per submission, 300 KB per document, 5 MB per payload —
the client enforces the official limits locally before hitting the API.

## Build once, store, submit (recommended)

Signing is deterministic but timestamped, so the recommended pattern is to
build the signed payload once, store it, and submit the stored bytes. What you
store is byte-for-byte what MyInvois received, which makes audits and
resubmissions exact:

```typescript
// 1. Build (sign + hash + base64) without submitting
const [payload] = client.buildSignedDocuments([invoice])
// payload.document       — base64 of the signed JSON (the exact wire bytes)
// payload.documentHash   — SHA-256 hex of those bytes
// payload.codeNumber     — your eInvoiceCodeOrNumber
// payload.signedDocument — parsed signed document, for preview/inspection

// 2. Store it (e.g. in your DB) alongside your order record
await db.insert(submissions).values({
  codeNumber: payload.codeNumber,
  document: payload.document,
  documentHash: payload.documentHash,
})

// 3. Submit the stored payload — no re-signing, identical bytes
const { data } = await client.submitDocument([payload])
```

`submitDocument` accepts plain documents and prebuilt payloads
interchangeably.

## Polling to a terminal status

```typescript
const result = await client.getSubmissionStatus(
  data.submissionUid,
  3000, // poll interval ms (default 3000)
  10,   // max retries
)
```

`Valid`, `PartiallyValid` and `Invalid` are all terminal states
([Get Submission](https://sdk.myinvois.hasil.gov.my/einvoicingapi/06-get-submission/)).
On `Invalid`, fetch
[document details](https://sdk.myinvois.hasil.gov.my/einvoicingapi/08-get-document-details/)
to see which validation step failed.

## Low-level helpers

For custom pipelines, the signing primitives are exported from the root:

```typescript
import {
  buildSignedDocument,       // one document → SignedDocumentPayload
  generateCompleteDocument,  // document + credentials → signed UBL JSON
  calculateDocumentDigest,   // document → SHA-256 digest (base64)
  transformDocumentForHashing,
} from '@ripwords/myinvois-client'
```

These follow the official digest rules: the document digest is the SHA-256 of
the minified JSON with `UBLExtensions` and `Signature` removed; the submission
hash is the SHA-256 hex of the serialized signed document.
