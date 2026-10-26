# Error Handling

## `MyInvoisApiError`

Non-OK responses from taxpayer endpoints throw `MyInvoisApiError` — still an
`Error` with a descriptive message, but carrying the HTTP status and raw body
so you can classify failures structurally instead of parsing strings:

```typescript
import { MyInvoisApiError } from '@ripwords/myinvois-client'

try {
  const { tin } = await client.searchTin({ idType: 'NRIC', idValue })
} catch (err) {
  if (err instanceof MyInvoisApiError) {
    if (err.status === 404) {
      // This NRIC/BRN is not registered — tell the user
    } else if (err.status === 429 || err.status >= 500) {
      // Transient — retry later, do NOT report "no TIN found"
    } else {
      // 400 — bad input; err.body carries the API's reason, e.g.
      // "Search criteria in not conclusive and more than one TIN can be found..."
    }
  }
}
```

This matters because the API answers an unknown NRIC/BRN with **404 and an
empty body** — indistinguishable by message text from an empty-body 429 or 5xx.

## `verifyTin` semantics

`verifyTin` returns a boolean, with a strict meaning:

- `true` — the TIN/ID combination is registered (HTTP 200)
- `false` — **only** when the API answers 404 ("not registered")
- throws `MyInvoisApiError` (or the underlying network error) for anything
  else — 400, 401, 429, 5xx, timeouts — so an outage is never misreported to
  your users as "invalid TIN"

Official references:
[Validate Taxpayer's TIN](https://sdk.myinvois.hasil.gov.my/einvoicingapi/01-validate-taxpayer-tin/),
[Search Taxpayer's TIN](https://sdk.myinvois.hasil.gov.my/einvoicingapi/10-search-taxpayer-tin/).

## Submission errors

Document-level errors follow the official `StandardError` shape and are
returned (not thrown) on results where the API reports per-document outcomes —
e.g. `rejectedDocuments` on submission, `error` on cancel/reject and polling
results. Validation failures are inspected via
[`getDocumentDetails`](/api/document-management#getdocumentdetails), whose
steps follow the official
[validation rules](https://sdk.myinvois.hasil.gov.my/document-validation-rules/).

## Polling timeouts

`getSubmissionStatus` never throws on timeout: it resolves with the last known
status and a synthesized `{ code: 'Timeout' }` error, or status `'TimedOut'`
after repeated request errors.
