# Design: Public library readiness for `@ripwords/myinvois-client`

- **Date:** 2026-07-29
- **Status:** Approved (design), pending implementation plan
- **Current version:** 0.4.2
- **Constraint:** This library is **already in production**. Every change is additive and backward compatible.

## Goal

Take the library from "works for its author" to "a serious public library" — the
one a Malaysian developer picks over the alternatives. Three things block that
today: there is no licence, the type definitions cover only part of the official
MyInvois field set, and users must hand-assemble UBL JSON.

## Decisions

These were settled during brainstorming and are not revisited during
implementation.

| Decision | Choice | Reasoning |
| --- | --- | --- |
| Audience | Public library, taken seriously | Sets the bar for licence, docs, and semver discipline |
| Licence | MIT | Zero friction for commercial adopters. The main alternative in this space is LGPL-3.0, so a permissive licence is the clearest differentiator |
| Runtimes | Node, Bun, Deno only | Signing needs a private key, which belongs on a server. Keeps `node:crypto` + `node-forge`, so the best-tested code is untouched. Browser support is an explicit non-goal |
| Builder shape | Shared core, eight typed wrappers | Per-type rules enforced at compile time without writing the shared 90% eight times |
| Breaking changes | None; stay on 0.x | Existing production callers keep working. Constructor ergonomics are fixed additively via a static factory |
| Field coverage | Full official coverage | All new fields are optional, so full coverage costs compatibility nothing |
| Tests and CI | Deferred to a later phase | Explicitly deprioritised in favour of features. Recorded here so it is not lost |

## Source of truth

Every field, code, and cardinality traces to the official LHDN SDK
documentation. Implementation must cite the relevant page in the commit body
for each type change.

| Document type | Code | Official specification |
| --- | --- | --- |
| Invoice | `01` | https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/ |
| Credit Note | `02` | https://sdk.myinvois.hasil.gov.my/documents/credit-v1-1/ |
| Debit Note | `03` | https://sdk.myinvois.hasil.gov.my/documents/debit-v1-1/ |
| Refund Note | `04` | https://sdk.myinvois.hasil.gov.my/documents/refund-v1-1/ |
| Self-Billed Invoice | `11` | https://sdk.myinvois.hasil.gov.my/documents/self-billed-invoice-v1-1/ |
| Self-Billed Credit Note | `12` | https://sdk.myinvois.hasil.gov.my/documents/self-billed-credit-v1-1/ |
| Self-Billed Debit Note | `13` | https://sdk.myinvois.hasil.gov.my/documents/self-billed-debit-v1-1/ |
| Self-Billed Refund Note | `14` | https://sdk.myinvois.hasil.gov.my/documents/self-billed-refund-v1-1/ |

The documentation index at `/documents/` returns HTTP 403 to automated
fetching, but every individual page above fetches normally.

## Findings that motivated this design

All four were verified against the official specification, not inferred from
reading the existing code.

### 1. The supplier cannot declare its own tax registrations

`Buyer` has an optional `sstRegistrationNumber` (`src/types/documents.d.ts:103`).
`Supplier` has no equivalent field. The official specification marks the
supplier's SST registration as `[1-1]`, conditionally mandatory for SST
registrants, maximum 35 characters.

The supplier issues the invoice, so the supplier's SST number is the one the
platform validates. Having the field on the buyer but not the supplier is
backwards.

Neither party has **Tourism Tax Registration** (`[1-1]`, conditionally
mandatory, maximum 17 characters). `TaxTypeCode '03'` (Tourism Tax) already
exists for line items, so a hotel can charge tourism tax but cannot state the
registration number that authorises it.

Neither party has `email` (`[0-1]`, maximum 320 characters).

This is the highest-priority gap: it affects mandatory fields, not optional
conveniences.

### 2. Self-Billed Debit Note (type `13`) is not implemented

`EInvoiceTypeCodeEnum.SelfBilledDebitNote = '13'` exists at
`src/types/e-invoice.d.ts:39`, and `'13'` is part of the `EInvoiceTypeCode`
union, but there is no `SelfBilledDebitNoteV1_1` interface and the type is
absent from the `AllDocumentsV1_1` union. Seven of eight document types are
supported; type `13` cannot be submitted at all.

### 3. Roughly a dozen optional fields are absent from every document type

Verified missing from `src/types/`:

- `taxCurrencyCode`
- Payment information: payment terms, supplier bank account, prepayment amount,
  prepayment date, prepayment time, prepayment reference number
- `billReferenceNumber`
- Shipping recipient: name, address, TIN, registration number
- Trade and customs: Customs Form No. 1/9 reference, Incoterms, Free Trade
  Agreement information, certified exporter authorisation number, Customs Form
  No. 2 reference
- Line item: `productTariffCode`, `countryOfOrigin`
- Invoice-level tax exemption amount

Consequence: export invoicing (Incoterms, country of origin, tariff codes,
customs forms), prepayment recording, and separate shipping recipients cannot
be represented.

### 4. Billing period is on the wrong type

`frequencyOfBilling`, `billingPeriodStartDate`, and `billingPeriodEndDate`
appear only on `SelfBilledInvoiceV1_1` (`src/types/documents.d.ts:426-430`).
The official specification lists billing period as `[0-1]` on every document
type, including plain invoices.

### 5. `eInvoiceTypeCode` is unconstrained

All seven interfaces type `eInvoiceTypeCode` as the full `EInvoiceTypeCode`
union, even where the doc comment says "Fixed value '02'". A `CreditNoteV1_1`
carrying `'01'` compiles and is rejected only at submission.

Narrowing these to literal types would be a breaking change, so the interfaces
stay as they are. The builders set the correct code, making the error
unreachable through the recommended path.

### 6. Line item field naming is inconsistent

The line items array is named differently per type: `invoiceLineItems`,
`creditNoteLineItems`, `debitNoteLineItems`, `refundNoteLineItems`,
`selfBilledCreditNoteLineItems`, `selfBilledRefundNoteLineItems` — except
`SelfBilledInvoiceV1_1`, which reuses `invoiceLineItems`.

The names are part of the public API and stay unchanged. The builders accept a
single `lines` parameter and map it to the correct field.

### 7. `getRecentDocuments` is missing but already plumbed

The rate limiter declares the category (`src/utils/apiQueue.ts:34`), sets its
budget of 12 requests per 60 seconds (`:61`), and matches the
`/documents/recent` path (`:319`). Only the client method was never written.

## Phasing

Each phase ships independently. Field coverage precedes builders so the
builders are written once against a complete field set.

| Phase | Work | Ships as |
| --- | --- | --- |
| 0 | MIT `LICENSE`, `license` field in `package.json`, README badge | 0.4.3 |
| 1 | `getRecentDocuments`, `MyInvoisClient.create({...})` factory | 0.5.0 |
| 2 | Full official field coverage; add `SelfBilledDebitNoteV1_1`; billing period on all types | 0.6.0 |
| 3 | UBL builders: shared core plus eight wrappers | 0.7.0 |
| 4 | README rewrite and `examples/` folder | 0.7.x |
| 5 | Deferred: split live tests from unit tests, add CI | — |

### Phase 0 — Licence

Add `LICENSE` (MIT, copyright holder to be confirmed by the author), set
`"license": "MIT"` in `package.json`, and add a badge to the README. Nothing
else changes.

This is first because it costs an hour and currently blocks every potential
adopter: absent a licence, the default is all rights reserved.

### Phase 1 — Two small additions

**`getRecentDocuments`.** Add the client method against the existing rate
limiter category. Follows the existing `searchDocuments` pattern for
parameters and paging.

**`MyInvoisClient.create(options)`.** A static factory taking an options
object, alongside the existing constructor and the existing `fromP12` factory.

```ts
MyInvoisClient.create({
  clientId,
  clientSecret,
  environment: 'sandbox',
  certificatePem,
  privateKeyPem,
  onBehalfOf,
  debug,
})
```

The seven-parameter positional constructor stays and is not deprecated.
Rationale: `clientId` and `clientSecret` are adjacent strings, so transposing
them produces a runtime `400` rather than a compile error; enabling `debug`
currently requires passing `undefined` for `onBehalfOf`; and future options
(timeout, retry policy, custom base URL, injectable `fetch`, token cache) each
append another optional positional. The factory absorbs all future growth.

The factory delegates to the constructor. No behaviour changes.

### Phase 2 — Field coverage

All additions are optional (`?`), so existing code continues to compile and
existing documents continue to serialise identically.

**`Supplier`** gains `sstRegistrationNumber?`, `tourismTaxRegistrationNumber?`,
and `email?`.

**`Buyer`** gains `email?`. It already has `sstRegistrationNumber?`.

**`Address`** is checked against the official structure; `addressLine1`,
`addressLine2`, and `postalZone` are confirmed or added as optional.

**`InvoiceLineItem`** gains `productTariffCode?` and `countryOfOrigin?`.

**Every document interface** gains, as optional fields:

- `taxCurrencyCode?`
- `frequencyOfBilling?`, `billingPeriodStartDate?`, `billingPeriodEndDate?`
  (moved from self-billed-invoice-only to all types; the existing fields on
  `SelfBilledInvoiceV1_1` keep their names, so this is purely additive)
- Payment information: `paymentMode?`, `supplierBankAccountNumber?`,
  `paymentTerms?`, `prepaymentAmount?`, `prepaymentDate?`, `prepaymentTime?`,
  `prepaymentReferenceNumber?`, `billReferenceNumber?`
- `shippingRecipient?` — a new interface holding name, address, TIN, and
  registration number
- Trade and customs: `customsFormReference?`, `incoterms?`, `ftaInformation?`,
  `certifiedExporterAuthorisationNumber?`, `customsFormNo2Reference?`
- `taxExemptionAmount?` at invoice level

**`SelfBilledDebitNoteV1_1`** is added, modelled on `SelfBilledCreditNoteV1_1`,
with `eInvoiceTypeCode` documented as `'13'`, a
`selfBilledDebitNoteLineItems` array, and the required
`originalEInvoiceReferenceNumber` / `originalEInvoiceInternalId` pair. It is
added to the `AllDocumentsV1_1` union.

Adding a member to that union is technically observable to code that exhaustively
switches over it. Given the union is consumed as an input to `submitDocument`
rather than produced by the library, no realistic caller breaks. Called out here
so the risk is recorded rather than assumed away.

**Serialisation.** `src/utils/document.ts` maps typed documents onto UBL JSON.
Each new field needs its mapping added. Fields left `undefined` must be omitted
from the output entirely, not emitted as `null` or empty string, so that
documents without the new fields serialise byte-identically to today. This is
the single most important safety property of this phase, because the serialised
bytes are what gets signed.

### Phase 3 — UBL builders

```
src/builders/
  index.ts    eight public wrappers
  core.ts     shared assembly, not exported
  params.ts   parameter types
```

**Core specification per document type:**

```ts
interface DocumentSpec {
  typeCode: EInvoiceTypeCode
  lineItemsField: string
  requiresOriginalReference: boolean
}
```

**Parameter types.** Two shapes, because five of the eight document types
require a reference to the document being adjusted.

```ts
interface CommonParams {
  supplier: Supplier
  buyer: Buyer
  number: string
  issuedAt?: Date
  currency?: CurrencyCode
  exchangeRate?: number
  lines: InvoiceLineItem[]
  // all Phase 2 optional fields, passed through
}

interface AdjustmentParams extends CommonParams {
  originalReferenceNumber: string
  originalInternalId: string
}
```

**Public wrappers:** `buildInvoice`, `buildCreditNote`, `buildDebitNote`,
`buildRefundNote`, `buildSelfBilledInvoice`, `buildSelfBilledCreditNote`,
`buildSelfBilledDebitNote`, `buildSelfBilledRefundNote`. Each returns its
concrete document type.

**What the core guarantees:**

1. Sets `eInvoiceVersion: '1.1'` and the correct `eInvoiceTypeCode`, making a
   mismatched code unreachable.
2. Splits `issuedAt` into `eInvoiceDate` (`YYYY-MM-DD`) and `eInvoiceTime`
   (`HH:mm:ssZ`), both UTC, defaulting to now. This is a genuine timestamp
   rather than a civil date, so `Date` is the correct input type.
3. Maps `lines` onto the correct per-type field name.
4. Computes `taxTotal` by reusing the existing `aggregateLineItemsByTaxCategory`
   rather than reimplementing it.
5. Computes `legalMonetaryTotal` from the line items.
6. Requires `exchangeRate` when `currency` is not `MYR`, which the platform
   mandates and nothing currently checks.
7. Runs the existing `validateInvoice` and throws on failure, so errors surface
   locally instead of as a platform rejection.

**Error handling.** Builders throw on programmer error: missing exchange rate
for a non-MYR currency, empty line items, failed validation, or a missing
original-document reference on an adjustment note. Construction is synchronous
and local, so a thrown error at the call site is clearer than a result object.

**Money arithmetic.** The builders own the computation of `legalMonetaryTotal`
and `taxTotal`. This is the main reason builders are worth having, and it is
also the riskiest part of the phase. Existing tests
(`taxSubtotalGrouping.test.ts`, `aggregateLineItemsByTaxCategory.test.ts`)
already cover the aggregation helper; the builders must not fork that logic.

**Out of scope.** The builders produce documents; they do not sign them.
`src/utils/document.ts` signing functions and `src/utils/certificate.ts` are
untouched.

### Phase 4 — Documentation

Rewrite the README around the real usage path: install, authenticate, build a
document, sign, submit, poll status. Move certificate generation — currently the
bulk of the README — into a separate guide under `docs/`.

Add an `examples/` folder with runnable examples: invoice submission, each
adjustment note type, document cancellation, document rejection, submission
status polling, document retrieval by UUID, document search, recent documents,
TIN validation, TIN search, and taxpayer lookup by QR code.

### Phase 5 — Deferred: tests and CI

Recorded, not scheduled. Currently 12 of 73 tests fail on a clean clone because
they call the live sandbox with expired credentials, mixed into the same run as
60 genuine unit tests. When picked up: move live tests to `test/integration/`,
skip them automatically when credentials are absent, and add a GitHub Actions
workflow running typecheck, lint, and unit tests on pull requests.

## Production safety rules

Binding on every phase.

1. **Additive only.** No existing field changes name, type, or optionality. No
   existing function signature changes. New fields are optional; new functions
   sit alongside old ones.
2. **Signing is out of scope.** `src/utils/document.ts` signing functions and
   `src/utils/certificate.ts` are not modified. Builders operate before signing.
3. **Byte-identical serialisation for unchanged input.** A document that does
   not use any new field must serialise to exactly the same JSON as it does
   today. Undefined optional fields are omitted, never emitted as `null` or
   `""`. This is what protects existing signatures.
4. **Cite the specification.** Each type change references the official page it
   came from, in the commit body.
5. **Verify unit tests after each phase.** The 60 passing unit tests must stay
   green. The 12 live-sandbox failures are pre-existing and credential-related;
   they are not a regression signal, and they must not be used to mask one.
6. **One phase per pull request**, each independently releasable.

## Open question for the author

The copyright line for the MIT licence — personal name or a company entity.
Needed before Phase 0 can be committed.

## Explicit non-goals

- Browser support, and any migration to Web Crypto
- Any breaking change, or a 1.0 release
- Redis or any other mandatory infrastructure dependency
- Rewriting or refactoring the signing implementation
- Narrowing `eInvoiceTypeCode` to per-type literal types
