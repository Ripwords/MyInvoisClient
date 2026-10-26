# Document Submission

## `submitDocument`

```typescript
submitDocument(
  documents: (AllDocumentsV1_1 | SignedDocumentPayload)[],
  version?: string, // default '1.1'
): Promise<{ status: number; data: SubmissionResponse }>
```

Signs (unless given prebuilt payloads), hashes, base64-encodes and submits up
to 100 documents.

**Official docs:** [Submit Documents](https://sdk.myinvois.hasil.gov.my/einvoicingapi/02-submit-documents/)
(`POST /api/v1.0/documentsubmissions`)

- Enforces the official limits client-side: ≤ 100 documents, ≤ 300 KB per
  document, ≤ 5 MB per payload.
- Accepts plain documents (`InvoiceV1_1`, credit/debit/refund notes,
  self-billed variants — see
  [document types](https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/))
  and [prebuilt payloads](/guide/signing#build-once-store-submit-recommended)
  interchangeably.
- A `202` status means accepted for processing; check
  `data.acceptedDocuments` / `data.rejectedDocuments`, then poll.
- A refused request (400, 422 duplicate, 429, 5xx) throws
  [`MyInvoisApiError`](/guide/errors) — `MyInvoisRateLimitError` for 429 —
  instead of returning an error body as `data`.

```typescript
const { data, status } = await client.submitDocument([invoice])
if (status === 202) {
  const result = await client.getSubmissionStatus(data.submissionUid)
}
```

## `getSubmissionStatus`

```typescript
getSubmissionStatus(
  submissionUid: string,
  pollInterval?: number, // ms, default 3000
  maxRetries?: number,   // default 10
): Promise<{
  status: SubmissionStatus // 'Valid' | 'PartiallyValid' | 'Invalid' | 'InProgress' | 'TimedOut'
  documentSummary?: DocumentSummary[]
  error?: StandardError
}>
```

Polls the submission until a terminal status.

**Official docs:** [Get Submission](https://sdk.myinvois.hasil.gov.my/einvoicingapi/06-get-submission/)
(`GET /api/v1.0/documentsubmissions/{submissionUid}`)

- `Valid`, `PartiallyValid` and `Invalid` are all terminal.
- Never throws on timeout — resolves with the last known status and a
  synthesized `{ code: 'Timeout' }` error, or `'TimedOut'` after repeated
  request errors (network, 404, 429, 5xx). A 404 is retried because the API
  briefly answers `NotFound` for a submission it has just accepted.
- Throws [`MyInvoisApiError`](/guide/errors) for any other 4xx (bad request,
  bad token): polling again would not fix those.
- The official polling guidance (3–5s interval) is in
  [integration practices](https://sdk.myinvois.hasil.gov.my/integration-practices/).

On `Invalid`, inspect the failing validation steps with
[`getDocumentDetails`](/api/document-management#getdocumentdetails).
