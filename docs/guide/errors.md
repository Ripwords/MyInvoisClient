# Error Handling

## `MyInvoisApiError`

Every non-OK response from the API throws `MyInvoisApiError` — still an
`Error` with a descriptive message, but carrying the HTTP status, the raw body
and, when the body has one, the parsed LHDN error as `apiError`, so you can
classify failures structurally instead of parsing strings:

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

| Property | Meaning |
| --- | --- |
| `status` | HTTP status code |
| `body` | Raw response text (may be empty or HTML) |
| `apiError` | The LHDN `StandardError` (`code`, `message`, `target`, `details`) when the body carries one, e.g. `apiError.code === 'OperationPeriodOver'` for a cancel after 72 hours; otherwise `undefined` |

## `MyInvoisRateLimitError`

A 429 that is still a 429 after the [automatic back-off](/guide/rate-limiting)
(or any 429 with `retryOn429: false`) throws `MyInvoisRateLimitError`, a
subclass of `MyInvoisApiError` with `retryAfterMs` taken from the
`Retry-After` header (5s when absent, capped at 60s):

```typescript
import { MyInvoisRateLimitError } from '@ripwords/myinvois-client'

try {
  await client.submitDocument([payload])
} catch (err) {
  if (err instanceof MyInvoisRateLimitError) {
    // Re-schedule the job instead of failing it
    await scheduleRetry(err.retryAfterMs)
  } else {
    throw err
  }
}
```

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

A whole request the API refuses (HTTP 4xx/5xx) throws `MyInvoisApiError` —
e.g. a 400 or 422 on `submitDocument`, or a cancel attempted after 72 hours
(`apiError.code === 'OperationPeriodOver'`). Per-document outcomes inside an
accepted request are still returned, in the official `StandardError` shape:
`rejectedDocuments` on a 202 submission and `error` on polling results. Validation failures are inspected via
[`getDocumentDetails`](/api/document-management#getdocumentdetails), whose
steps follow the official
[validation rules](https://sdk.myinvois.hasil.gov.my/document-validation-rules/).

## Polling timeouts

`getSubmissionStatus` never throws on timeout: it resolves with the last known
status and a synthesized `{ code: 'Timeout' }` error, or status `'TimedOut'`
after repeated request errors (network, 404, 429, 5xx — a 404 is retried
because the API briefly answers `NotFound` for a submission it has just
accepted). Other 4xx answers — a bad request, a bad token — throw
`MyInvoisApiError` instead, because polling again would not fix them.
