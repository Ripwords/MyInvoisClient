# Document Management

## `cancelDocument`

```typescript
cancelDocument(documentUid: string, reason: string):
  Promise<{ uuid: string; status: string; error?: StandardError }>
```

Cancels an issued document (supplier side) within the cancellation window.

**Official docs:** [Cancel Document](https://sdk.myinvois.hasil.gov.my/einvoicingapi/03-cancel-document/)
(`PUT /api/v1.0/documents/state/{uuid}/state`)

- Reason is required, max 300 characters; the action is irreversible.
- Rate limited to 12/min (shared bucket with reject).

## `rejectDocument`

```typescript
rejectDocument(documentUid: string, reason: string):
  Promise<{ uuid: string; status: string; error?: StandardError }>
```

Rejects a document received from another party (buyer side).

**Official docs:** [Reject Document](https://sdk.myinvois.hasil.gov.my/einvoicingapi/04-reject-document/)
(`PUT /api/v1.0/documents/state/{uuid}/state`)

## `getDocument`

```typescript
getDocument(documentUid: string): Promise<DocumentSummary & { document: string }>
```

Fetches the full raw document (base64) plus its summary metadata.

**Official docs:** [Get Document](https://sdk.myinvois.hasil.gov.my/einvoicingapi/07-get-document/)
(`GET /api/v1.0/documents/{uuid}/raw`)

## `getDocumentDetails`

```typescript
getDocumentDetails(documentUid: string): Promise<
  DocumentSummary & {
    validationResults: {
      status: DocumentValidationResult
      validationSteps: DocumentValidationStepResult[]
    }
  }
>
```

Document metadata plus per-step validation results — the way to find out *why*
a document is `Invalid`.

**Official docs:** [Get Document Details](https://sdk.myinvois.hasil.gov.my/einvoicingapi/08-get-document-details/)
(`GET /api/v1.0/documents/{uuid}/details`) — step semantics follow the
[validation rules](https://sdk.myinvois.hasil.gov.my/document-validation-rules/).

## `searchDocuments`

```typescript
searchDocuments(params: SearchDocumentsParams): Promise<DocumentSearchResult[]>
```

Searches documents. Requires a complete submission-date window
(`submissionDateFrom` **and** `submissionDateTo`, ≤ 31 days apart) or an
issue-date window, per the official contract.

**Official docs:** [Search Documents](https://sdk.myinvois.hasil.gov.my/einvoicingapi/09-search-documents/)
(`GET /api/v1.0/documents/search`) — rate limited to 12/min.

## `getRecentDocuments`

```typescript
getRecentDocuments(params?): Promise<DocumentSearchResult[]>
```

Recently submitted or received documents with paging and filters.

**Official docs:** [Get Recent Documents](https://sdk.myinvois.hasil.gov.my/einvoicingapi/05-get-recent-documents/)
(`GET /api/v1.0/documents/recent`) — rate limited to 12/min.

## `getDocumentQrCode`

```typescript
getDocumentQrCode(documentUid: string, longId?: string): Promise<string | null>
```

Builds the public share/QR URL
(`https://myinvois.hasil.gov.my/{uuid}/share/{longId}`, preprod-prefixed on
sandbox). Pass the `longId` if you already have it (e.g. from a poll result)
to skip the extra [Get Document](https://sdk.myinvois.hasil.gov.my/einvoicingapi/07-get-document/)
fetch; returns `null` when the document has no `longId` (not yet valid).
