# Changelog


## v0.8.1

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.8.0...v0.8.1)

### 🚀 Enhancements

- Export getPemFromP12 and extractCertificateInfo ([e157939](https://github.com/Ripwords/MyInvoisClient/commit/e157939))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.8.0

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.7.1...v0.8.0)

### 🚀 Enhancements

- ⚠️  Throw typed errors for every non-OK MyInvois response ([9dbdc73](https://github.com/Ripwords/MyInvoisClient/commit/9dbdc73))

### 📖 Documentation

- VitePress site with per-endpoint official-doc links and llms.txt ([65cefbb](https://github.com/Ripwords/MyInvoisClient/commit/65cefbb))
- Link the hosted docs site and llms.txt from the README ([0e790f3](https://github.com/Ripwords/MyInvoisClient/commit/0e790f3))
- Document MyInvoisRateLimitError and the throw-on-non-OK contract ([dc7cd24](https://github.com/Ripwords/MyInvoisClient/commit/dc7cd24))

#### ⚠️ Breaking Changes

- ⚠️  Throw typed errors for every non-OK MyInvois response ([9dbdc73](https://github.com/Ripwords/MyInvoisClient/commit/9dbdc73))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.7.1

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.7.0...v0.7.1)

### 🩹 Fixes

- Typed MyInvoisApiError; verifyTin no longer reports outages as invalid ([ac020f2](https://github.com/Ripwords/MyInvoisClient/commit/ac020f2))

### 📖 Documentation

- Flag v0.7.0 breaking changes in the changelog ([8de40d1](https://github.com/Ripwords/MyInvoisClient/commit/8de40d1))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.7.0

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.6.0...v0.7.0)

### ⚠️ Breaking changes

Aligning with the official API docs changed some contracts from 0.6.0:

- `searchDocuments` now returns `DocumentSearchResult[]` (official search
  contract) and requires a complete submission-date window
  (`submissionDateFrom` **and** `submissionDateTo`).
- Notification queries return the official `{ result }` envelope.
- `getSubmissionStatus` treats `Valid`, `PartiallyValid` **and** `Invalid` as
  terminal, and the default poll interval is now 3000 ms.
- Document validation statuses follow the official enum.
- `getDocumentQrCode(uuid, longId?)` decodes QR input per the official spec
  and skips the extra fetch when `longId` is provided.

### 🚀 Enhancements

- Export buildSignedDocument; submitDocument accepts prebuilt payloads ([b747fb7](https://github.com/Ripwords/MyInvoisClient/commit/b747fb7))
- Runtime code lists under ./codes subpath ([e21cdce](https://github.com/Ripwords/MyInvoisClient/commit/e21cdce))
- Injectable RateLimitStore and TokenStore ([25f81eb](https://github.com/Ripwords/MyInvoisClient/commit/25f81eb))
- Automatic 429 Retry-After back-off ([024258a](https://github.com/Ripwords/MyInvoisClient/commit/024258a))

### 🩹 Fixes

- **types:** Match response types to the official API docs ([0308674](https://github.com/Ripwords/MyInvoisClient/commit/0308674))
- **api:** Treat PartiallyValid as terminal when polling submissions ([a31a4aa](https://github.com/Ripwords/MyInvoisClient/commit/a31a4aa))
- **api:** Send the decoded QR token to the taxpayer QR endpoint ([f2927dd](https://github.com/Ripwords/MyInvoisClient/commit/f2927dd))
- **api:** Search contract, zero-value params and casing normalisation ([a05dc26](https://github.com/Ripwords/MyInvoisClient/commit/a05dc26))
- **client:** Harden token handling and rate-limit categorisation ([862abf3](https://github.com/Ripwords/MyInvoisClient/commit/862abf3))
- Include HTTP status in searchTin errors and Document Signing EKU in cert templates ([f18c323](https://github.com/Ripwords/MyInvoisClient/commit/f18c323))

### 💅 Refactors

- Remove dead code and build each signed document once ([e7a5b55](https://github.com/Ripwords/MyInvoisClient/commit/e7a5b55))

### 📖 Documentation

- Install snippet, quick start, scope note and accurate operational notes ([d97ab10](https://github.com/Ripwords/MyInvoisClient/commit/d97ab10))
- TIN:ROB, codes subpath, stored payloads, injectable stores, 429 back-off ([ad5229e](https://github.com/Ripwords/MyInvoisClient/commit/ad5229e))
- Note vitest-on-Bun incompatibility in testing section ([c4edce0](https://github.com/Ripwords/MyInvoisClient/commit/c4edce0))

### 🏡 Chore

- Remove stale planning docs and unreferenced manual test scripts ([3f43899](https://github.com/Ripwords/MyInvoisClient/commit/3f43899))
- Drop unused store parameter from processQueue ([fc38440](https://github.com/Ripwords/MyInvoisClient/commit/fc38440))

### ✅ Tests

- Make weak unit tests assert real behaviour ([28aee76](https://github.com/Ripwords/MyInvoisClient/commit/28aee76))
- Extend live sandbox E2E and leave a run-report artifact ([0929c2a](https://github.com/Ripwords/MyInvoisClient/commit/0929c2a))
- Live E2E for the build-store-submit payload flow ([b6f9cd0](https://github.com/Ripwords/MyInvoisClient/commit/b6f9cd0))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.6.0

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.5.0...v0.6.0)

### 🚀 Enhancements

- ⚠️  Require quantity on every invoice line item ([ef40e5f](https://github.com/Ripwords/MyInvoisClient/commit/ef40e5f))

### 🩹 Fixes

- **release:** Make the release scripts deterministic and complete ([73246b8](https://github.com/Ripwords/MyInvoisClient/commit/73246b8))
- Drop the crypto placeholder dependency and complete package metadata ([f72528b](https://github.com/Ripwords/MyInvoisClient/commit/f72528b))
- Use the documented plural taxpayers route for QR code info ([1ca24c3](https://github.com/Ripwords/MyInvoisClient/commit/1ca24c3))
- Correct signing time, monetary rounding, exemption output and aggregation ([9701d59](https://github.com/Ripwords/MyInvoisClient/commit/9701d59))
- Select the key-matching cert from P12 bundles and accept plain key bags ([6d5dbf7](https://github.com/Ripwords/MyInvoisClient/commit/6d5dbf7))
- Always emit InvoicedQuantity, defaulting to one unit ([b2386dd](https://github.com/Ripwords/MyInvoisClient/commit/b2386dd))
- Remove phantom enums, add runtime quantity guard, small correctness fixes ([b1306cc](https://github.com/Ripwords/MyInvoisClient/commit/b1306cc))
- **release:** Run the dry-run publish preview under the target version ([64d146a](https://github.com/Ripwords/MyInvoisClient/commit/64d146a))

### 📖 Documentation

- Add test suite and .env cleanup design spec ([435f110](https://github.com/Ripwords/MyInvoisClient/commit/435f110))

### 🏡 Chore

- Ignore .superpowers agent scratch directory ([840a50b](https://github.com/Ripwords/MyInvoisClient/commit/840a50b))
- **release:** Create the GitHub release as part of the release ([58b6086](https://github.com/Ripwords/MyInvoisClient/commit/58b6086))

### ✅ Tests

- Restructure into deterministic unit suite and gated live integration suite ([5a07f2c](https://github.com/Ripwords/MyInvoisClient/commit/5a07f2c))
- Cover previously untested API surface, validators and utils ([209192b](https://github.com/Ripwords/MyInvoisClient/commit/209192b))

#### ⚠️ Breaking Changes

- ⚠️  Require quantity on every invoice line item ([ef40e5f](https://github.com/Ripwords/MyInvoisClient/commit/ef40e5f))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.5.0

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.4.2...v0.5.0)

### Changed output

The supplier and buyer parties now each carry four `PartyIdentification` entries -- TIN, BRN, SST and TTX -- with the literal string `NA` where a registration does not apply. Previously the supplier carried two and the buyer three. This matches the [official 1.1 invoice sample](https://sdk.myinvois.hasil.gov.my/files/sdksamples/1.1-Invoice-Sample.json).

**This changes the submitted payload, and therefore the document digest, for every document type.** Documents already submitted are unaffected, because each is signed at the moment it is sent. If you are SST or tourism tax registered, set the new `supplier.sstRegistrationNumber`, `supplier.tourismTaxRegistrationNumber` or `buyer.tourismTaxRegistrationNumber` fields -- otherwise your documents now positively declare `NA` rather than omitting the element.

Billing period fields on self-billed invoices (`frequencyOfBilling`, `billingPeriodStartDate`, `billingPeriodEndDate`) already existed but were silently dropped when the document was built. They now serialise as `cac:InvoicePeriod`, and are available on all document types.

### Fixed

- Refund notes, self-billed credit notes and self-billed refund notes could never emit a `BillingReference` linking to the original document, because the serialiser required a field those types did not declare. They now emit it when `originalEInvoiceInternalId` is supplied.
- `getRecentDocuments` sent `invoiceDirection`, but the endpoint documents `InvoiceDirection` with a capital I, so the filter was silently ignored. It also sent a `searchQuery` parameter the endpoint does not accept and omitted six that it does. Note `searchDocuments` correctly keeps the lowercase spelling -- the platform differs between the two endpoints.
- Credit and debit notes carrying an empty or missing `originalEInvoiceInternalId` previously emitted a malformed `BillingReference`; the block is now omitted.

### Added

- MIT licence. `LICENSE` and `README.md` now ship with the package.
- Self-Billed Debit Note (document type `13`), the one official type that was missing.
- `MyInvoisClient.getRecentDocuments()`.
- `MyInvoisClient.create({ ... })`, an options-object alternative to the positional constructor, which is unchanged and not deprecated.
- Optional fields now written to the document: second and third address lines, postal zone, line item tariff code and country of origin, tax currency code, billing period, payment means and terms, prepayment, bill reference, and shipping recipient.
- Optional fields accepted but **not yet written** to the document, each marked in its documentation: `supplier.email`, `buyer.email`, `shippingRecipient.registrationNumber`, all `tradeInformation` fields, `taxExemptionAmount` and `taxExemptionDescription`.

### Type changes

- `AllDocumentsV1_1` gained an eighth member. If you narrow over it with a `never` exhaustiveness check, add a branch for `SelfBilledDebitNoteV1_1`.
- `InvoiceSubmission.BillingReference[].InvoiceDocumentReference` is now optional, because the block may carry only a bill reference number.

No other field changed name, type or optionality, no export was removed or renamed, and no existing function signature changed.

### Before upgrading

The supplier SST and TTX entries have not been exercised against the live platform. Submit one document of each type you use to the sandbox and confirm it validates.

## v0.4.2

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.4.1...v0.4.2)

## v0.4.1

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.4.0...v0.4.1)

### 🩹 Fixes

- **build:** Ship ESM entry + types; guard partial publishes ([18f5109](https://github.com/Ripwords/MyInvoisClient/commit/18f5109))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.4.0

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.3.7...v0.4.0)

### 🚀 Enhancements

- Add aggregateLineItemsByTaxCategory helper ([484bccb](https://github.com/Ripwords/MyInvoisClient/commit/484bccb))

### 🩹 Fixes

- Parse search-documents { result, metadata } response wrapper ([87e7dfd](https://github.com/Ripwords/MyInvoisClient/commit/87e7dfd))
- Default submission pageNo to 1 and preserve paging across retries ([d01c46d](https://github.com/Ripwords/MyInvoisClient/commit/d01c46d))
- Emit one tax subtotal per tax category in document total ([5cbfd7d](https://github.com/Ripwords/MyInvoisClient/commit/5cbfd7d))

### 💅 Refactors

- Consolidate extractCertificateInfo into one source ([111f384](https://github.com/Ripwords/MyInvoisClient/commit/111f384))

### 📖 Documentation

- Document rate-limiter limitations ([3ce2bd1](https://github.com/Ripwords/MyInvoisClient/commit/3ce2bd1))

### ✅ Tests

- Correct rate-limiter burst expectation and document-action assertions ([421a3e9](https://github.com/Ripwords/MyInvoisClient/commit/421a3e9))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.3.7

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.3.6...v0.3.7)

### 🩹 Fixes

- Add Content-Type header to document action requests ([15656d8](https://github.com/Ripwords/MyInvoisClient/commit/15656d8))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.3.6

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.3.5...v0.3.6)

### 🚀 Enhancements

- Add document cancellation and rejection methods with character limit validation ([389ec56](https://github.com/Ripwords/MyInvoisClient/commit/389ec56))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.3.5

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.3.4...v0.3.5)

## v0.3.4

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.3.3...v0.3.4)

### 🚀 Enhancements

- Enhance tinSearch function with additional fileType parameter ([002c6e4](https://github.com/Ripwords/MyInvoisClient/commit/002c6e4))

### 🏡 Chore

- **release:** V0.3.3 ([f660781](https://github.com/Ripwords/MyInvoisClient/commit/f660781))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.3.3

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.3.2...v0.3.3)

### 🚀 Enhancements

- Add quantity and measurement fields to InvoiceLineItem interface ([4896fa3](https://github.com/Ripwords/MyInvoisClient/commit/4896fa3))
- Enhance InvoiceLineItem with optional quantity and measurement fields ([6f3ffee](https://github.com/Ripwords/MyInvoisClient/commit/6f3ffee))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.3.2

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.3.1...v0.3.2)

### 🚀 Enhancements

- Add raw logging for document retrieval and search functions ([27cab26](https://github.com/Ripwords/MyInvoisClient/commit/27cab26))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.3.1

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.3.0...v0.3.1)

### 🚀 Enhancements

- Add payable rounding amount to legal monetary total and invoice submission ([ac466ab](https://github.com/Ripwords/MyInvoisClient/commit/ac466ab))

### 💅 Refactors

- Improve quantity handling in createPercentageTaxLineItem function ([c7e21d1](https://github.com/Ripwords/MyInvoisClient/commit/c7e21d1))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.3.0

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.41...v0.3.0)

### 💅 Refactors

- Streamline apiQueue request handling and rate limiting ([68b010d](https://github.com/Ripwords/MyInvoisClient/commit/68b010d))
- Enhance apiQueue with timer management and cleanup functionality ([9344a0d](https://github.com/Ripwords/MyInvoisClient/commit/9344a0d))
- Update clearQueue function signature for clarity ([0a09bde](https://github.com/Ripwords/MyInvoisClient/commit/0a09bde))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.41

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.40...v0.2.41)

### 💅 Refactors

- Enhance rate limiting and request handling in apiQueue ([3254593](https://github.com/Ripwords/MyInvoisClient/commit/3254593))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.40

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.39...v0.2.40)

### 💅 Refactors

- Update categorizeRequest function for v1.0 API endpoints ([2798c37](https://github.com/Ripwords/MyInvoisClient/commit/2798c37))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.39

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.38...v0.2.39)

### 💅 Refactors

- Simplify token refresh logic in MyInvoisClient ([9b87c86](https://github.com/Ripwords/MyInvoisClient/commit/9b87c86))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.38

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.37...v0.2.38)

### 🚀 Enhancements

- Improve rate limiter request handling in apiQueue ([f33da1a](https://github.com/Ripwords/MyInvoisClient/commit/f33da1a))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.37

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.36...v0.2.37)

### 🚀 Enhancements

- Track request count in MyInvoisClient ([09c075e](https://github.com/Ripwords/MyInvoisClient/commit/09c075e))
- Enhance API interaction with fetch function ([966193d](https://github.com/Ripwords/MyInvoisClient/commit/966193d))
- Enhance apiQueue rate limiter tests and functionality ([d1959ca](https://github.com/Ripwords/MyInvoisClient/commit/d1959ca))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.36

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.35...v0.2.36)

### 🚀 Enhancements

- Add discount handling to invoice processing ([7424362](https://github.com/Ripwords/MyInvoisClient/commit/7424362))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.35

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.34...v0.2.35)

### 🚀 Enhancements

- Add 'Submitted' status to SubmissionStatus type ([1f22e67](https://github.com/Ripwords/MyInvoisClient/commit/1f22e67))

### 🏡 Chore

- **release:** V0.2.34 ([538182d](https://github.com/Ripwords/MyInvoisClient/commit/538182d))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.34

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.33...v0.2.34)

### 🩹 Fixes

- Enhance getDocumentQrCode method to accept optional longId parameter ([2a4303c](https://github.com/Ripwords/MyInvoisClient/commit/2a4303c))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.33

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.32...v0.2.33)

### 🩹 Fixes

- Update getDocumentQrCode method to return null for missing longId ([4cf066c](https://github.com/Ripwords/MyInvoisClient/commit/4cf066c))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.32

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.31...v0.2.32)

### 🩹 Fixes

- Add error handling for missing document longId ([b6dc8be](https://github.com/Ripwords/MyInvoisClient/commit/b6dc8be))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.31

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.30...v0.2.31)

### 🩹 Fixes

- Add pagination parameters to document submission status retrieval ([1f18bb1](https://github.com/Ripwords/MyInvoisClient/commit/1f18bb1))

### 🏡 Chore

- **release:** V0.2.30 ([9b7b69a](https://github.com/Ripwords/MyInvoisClient/commit/9b7b69a))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.30

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.29...v0.2.30)

### 🩹 Fixes

- Remove unnecessary console log in getDocumentQrCode method ([7644ed0](https://github.com/Ripwords/MyInvoisClient/commit/7644ed0))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.29

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.28...v0.2.29)

### 🩹 Fixes

- Simplify error handling in certificate digest calculation ([f92a165](https://github.com/Ripwords/MyInvoisClient/commit/f92a165))
- Standardize longId naming and enhance document fetching ([1e6b8b4](https://github.com/Ripwords/MyInvoisClient/commit/1e6b8b4))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.28

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.26...v0.2.28)

### 🚀 Enhancements

- Add QR code generation for document sharing ([cccfa3d](https://github.com/Ripwords/MyInvoisClient/commit/cccfa3d))

### 🩹 Fixes

- Align document processing with PowerShell script for compliance ([697f99a](https://github.com/Ripwords/MyInvoisClient/commit/697f99a))

### 🏡 Chore

- **release:** V0.2.27 ([ff90628](https://github.com/Ripwords/MyInvoisClient/commit/ff90628))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.27

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.26...v0.2.27)

### 🩹 Fixes

- Align document processing with PowerShell script for compliance ([697f99a](https://github.com/Ripwords/MyInvoisClient/commit/697f99a))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.26

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.25...v0.2.26)

### 🩹 Fixes

- Enhance document digest calculation for compliance and clarity ([943c3df](https://github.com/Ripwords/MyInvoisClient/commit/943c3df))

### 🏡 Chore

- **release:** V0.2.25 ([3d5ee1b](https://github.com/Ripwords/MyInvoisClient/commit/3d5ee1b))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.25

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.24...v0.2.25)

### 🩹 Fixes

- Improve submission status handling in document submission API ([4d2f551](https://github.com/Ripwords/MyInvoisClient/commit/4d2f551))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.24

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.23...v0.2.24)

### 🩹 Fixes

- Enhance MyInvois compliance and improve document handling ([4fb9216](https://github.com/Ripwords/MyInvoisClient/commit/4fb9216))
- Refine document hashing process by specifying invoice type ([376e464](https://github.com/Ripwords/MyInvoisClient/commit/376e464))
- Refactor document transformation and signing process ([03f5e4a](https://github.com/Ripwords/MyInvoisClient/commit/03f5e4a))
- Improve document signing and digest calculation for compliance ([2974718](https://github.com/Ripwords/MyInvoisClient/commit/2974718))

### 🏡 Chore

- **release:** V0.2.23 ([b25627f](https://github.com/Ripwords/MyInvoisClient/commit/b25627f))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.23

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.22...v0.2.23)

## v0.2.22

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.21...v0.2.22)

### 🩹 Fixes

- Rename updateBeneficiary method to updateOnBehalfOf ([3194363](https://github.com/Ripwords/MyInvoisClient/commit/3194363))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.21

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.20...v0.2.21)

### 🩹 Fixes

- Update onBehalfOf property handling and add updateBeneficiary method ([053acdc](https://github.com/Ripwords/MyInvoisClient/commit/053acdc))
- Update updateBeneficiary method to include return type ([1ba2a2f](https://github.com/Ripwords/MyInvoisClient/commit/1ba2a2f))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.20

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.19...v0.2.20)

### 🩹 Fixes

- Include documentSummary in submission timeout responses ([cc237bd](https://github.com/Ripwords/MyInvoisClient/commit/cc237bd))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.19

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.18...v0.2.19)

### 🩹 Fixes

- Add originalEInvoiceInternalId to CreditNoteV1_1 and DebitNoteV1_1 interfaces ([1264ac6](https://github.com/Ripwords/MyInvoisClient/commit/1264ac6))

### 🏡 Chore

- **release:** V0.2.18 ([f5c333a](https://github.com/Ripwords/MyInvoisClient/commit/f5c333a))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.18

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.17...v0.2.18)

### 🩹 Fixes

- Enhance rate-limiter implementation and testing ([344ab04](https://github.com/Ripwords/MyInvoisClient/commit/344ab04))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.17

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.16...v0.2.17)

### 🩹 Fixes

- Update submission status to reflect timeout scenario ([28dfdf2](https://github.com/Ripwords/MyInvoisClient/commit/28dfdf2))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.16

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.15...v0.2.16)

### 🩹 Fixes

- Refine calculateSignedPropertiesDigest to align with XAdES specifications ([4247246](https://github.com/Ripwords/MyInvoisClient/commit/4247246))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.15

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.14...v0.2.15)

### 🩹 Fixes

- Enhance error handling and add new document path matchers ([bb0ce29](https://github.com/Ripwords/MyInvoisClient/commit/bb0ce29))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.14

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.13...v0.2.14)

### 🚀 Enhancements

- Add PKCS#12 support and enhance logging ([#12](https://github.com/Ripwords/MyInvoisClient/issues/12))

### 🩹 Fixes

- Make sstRegistrationNumber optional and update test invoice data ([cca8b2a](https://github.com/Ripwords/MyInvoisClient/commit/cca8b2a))

### 💅 Refactors

- Update environment variable usage and clean up tests ([253b17c](https://github.com/Ripwords/MyInvoisClient/commit/253b17c))

### 🏡 Chore

- **release:** V0.2.13 ([05ac8e6](https://github.com/Ripwords/MyInvoisClient/commit/05ac8e6))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.13

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.12...v0.2.13)

### 🚀 Enhancements

- Enforce submission limits in document submission process ([c8808b2](https://github.com/Ripwords/MyInvoisClient/commit/c8808b2))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.12

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.11...v0.2.12)

### 🚀 Enhancements

- Implement request queuing and categorization for rate-limiting ([bf0db03](https://github.com/Ripwords/MyInvoisClient/commit/bf0db03))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.11

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.10...v0.2.11)

### 🚀 Enhancements

- Enhance debug logging for document submission errors ([a78603a](https://github.com/Ripwords/MyInvoisClient/commit/a78603a))

### 🏡 Chore

- **release:** V0.2.10 ([f7695df](https://github.com/Ripwords/MyInvoisClient/commit/f7695df))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.10

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.9...v0.2.10)

### 🚀 Enhancements

- Enhance document submission process with batch handling and error reporting ([d924233](https://github.com/Ripwords/MyInvoisClient/commit/d924233))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.9

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.8...v0.2.9)

### 💅 Refactors

- Integrate formatIdValue function for ID sanitization in document utilities ([559b6c2](https://github.com/Ripwords/MyInvoisClient/commit/559b6c2))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.8

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.7...v0.2.8)

### 🚀 Enhancements

- Add formatIdValue function for ID value sanitization ([361088c](https://github.com/Ripwords/MyInvoisClient/commit/361088c))

### 🩹 Fixes

- Add return type to formatIdValue function for improved type safety ([fec5b57](https://github.com/Ripwords/MyInvoisClient/commit/fec5b57))

### 💅 Refactors

- Remove unused InvoiceV1_1 import from index.ts ([9fa6429](https://github.com/Ripwords/MyInvoisClient/commit/9fa6429))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.7

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.6...v0.2.7)

### 🚀 Enhancements

- Introduce AllDocumentsV1_1 type and refactor document submission ([592da23](https://github.com/Ripwords/MyInvoisClient/commit/592da23))

### 🏡 Chore

- **release:** V0.2.6 ([f1bb607](https://github.com/Ripwords/MyInvoisClient/commit/f1bb607))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.6

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.5...v0.2.6)

### 🚀 Enhancements

- Update InvoiceLineItem type definitions to use UnitTypeCode ([015c340](https://github.com/Ripwords/MyInvoisClient/commit/015c340))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.5

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.4...v0.2.5)

### 🚀 Enhancements

- Enhance tax calculation features in invoice processing ([ce16438](https://github.com/Ripwords/MyInvoisClient/commit/ce16438))
- Enhance invoice total calculation with detailed return types ([804f7ff](https://github.com/Ripwords/MyInvoisClient/commit/804f7ff))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.4

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.3...v0.2.4)

### 💅 Refactors

- Simplify return types in MyInvoisClient methods by removing StandardError from Promise types ([f87dd9a](https://github.com/Ripwords/MyInvoisClient/commit/f87dd9a))

### 🏡 Chore

- **release:** V0.2.3 ([f4d5149](https://github.com/Ripwords/MyInvoisClient/commit/f4d5149))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.3

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.2...v0.2.3)

### 💅 Refactors

- Update documents type definitions to use StateCode and CountryCode, and remove unused digital signature placeholder ([9eef708](https://github.com/Ripwords/MyInvoisClient/commit/9eef708))

### 📖 Documentation

- Improve documentation formatting in MyInvoisClient methods ([6e17b4d](https://github.com/Ripwords/MyInvoisClient/commit/6e17b4d))

### ✅ Tests

- Add TIN search test with environment variable checks in MyInvoisClient ([e001d60](https://github.com/Ripwords/MyInvoisClient/commit/e001d60))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.2

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.1...v0.2.2)

### 🚀 Enhancements

- Implement TIN search and QR code retrieval methods in MyInvoisClient ([052b727](https://github.com/Ripwords/MyInvoisClient/commit/052b727))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.1

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.0...v0.2.1)

### 🚀 Enhancements

- Update getDocumentTypes method to return DocumentTypesResponse type ([f3a2884](https://github.com/Ripwords/MyInvoisClient/commit/f3a2884))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.0

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.7...v0.2.0)

### 🚀 Enhancements

- Add TIN search and QR code retrieval functionalities to taxpayer validation API ([b423bc3](https://github.com/Ripwords/MyInvoisClient/commit/b423bc3))

### 💅 Refactors

- Enhance MyInvoisClient with new document type methods and improve TIN validation documentation ([14ac780](https://github.com/Ripwords/MyInvoisClient/commit/14ac780))
- Modularize MyInvoisClient by integrating document management APIs ([9f37f6d](https://github.com/Ripwords/MyInvoisClient/commit/9f37f6d))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.7

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.6...v0.1.7)

### 🏡 Chore

- Clean up dependencies by removing unused packages and updating external configurations ([886c95c](https://github.com/Ripwords/MyInvoisClient/commit/886c95c))
- Add 'dist' directory to package.json files for improved module exports ([c52ed75](https://github.com/Ripwords/MyInvoisClient/commit/c52ed75))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.6

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.5...v0.1.6)

### 🏡 Chore

- Update release scripts to ensure consistency by removing 'bun' from publish commands for public access ([4bd352f](https://github.com/Ripwords/MyInvoisClient/commit/4bd352f))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.5

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.4...v0.1.5)

### 🏡 Chore

- Update release scripts to include 'bun publish' for public access after changelog generation ([3ace843](https://github.com/Ripwords/MyInvoisClient/commit/3ace843))
- Update release scripts to use 'npm publish' instead of 'bun publish' for public access after changelog generation ([cd6854f](https://github.com/Ripwords/MyInvoisClient/commit/cd6854f))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.4

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.3...v0.1.4)

### 💅 Refactors

- Extend RegistrationType to include 'ARMY' and update related interfaces in documents.d.ts and index.ts for improved type safety ([955ccee](https://github.com/Ripwords/MyInvoisClient/commit/955ccee))

### 🏡 Chore

- Update release scripts to remove npm publish command and ensure git push follows changelog generation ([ba56b4a](https://github.com/Ripwords/MyInvoisClient/commit/ba56b4a))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.3

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.2...v0.1.3)

### 💅 Refactors

- Add industry classification fields to Supplier interface in documents.d.ts, update invoice generation logic in document.ts, and enhance related tests for improved type safety and clarity ([648858a](https://github.com/Ripwords/MyInvoisClient/commit/648858a))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.2

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.1...v0.1.2)

### 🚀 Enhancements

- Introduce RegistrationType type and update registrationType fields in Supplier and Buyer interfaces for improved type safety ([28bcd5b](https://github.com/Ripwords/MyInvoisClient/commit/28bcd5b))
- Consolidate and expand invoice type definitions by merging index.ts into index.d.ts, enhancing type safety and clarity across various invoice-related interfaces ([e8ba3f9](https://github.com/Ripwords/MyInvoisClient/commit/e8ba3f9))

### 💅 Refactors

- Update type exports by removing the deprecated index.d.ts file and directly exporting from documents.d.ts to streamline type definitions and improve clarity ([b5fcd79](https://github.com/Ripwords/MyInvoisClient/commit/b5fcd79))
- Streamline invoice type definitions by removing unused fields and enhancing clarity in the documents.d.ts and document.ts files, while updating tests to reflect these changes ([834bb63](https://github.com/Ripwords/MyInvoisClient/commit/834bb63))

### 🏡 Chore

- Enhance release script to run linting before building and publishing ([230e15c](https://github.com/Ripwords/MyInvoisClient/commit/230e15c))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.1


### 🚀 Enhancements

- First commit ([c03ee2c](https://github.com/Ripwords/MyInvoisClient/commit/c03ee2c))
- Add docs ([cb80529](https://github.com/Ripwords/MyInvoisClient/commit/cb80529))
- Add base64 encoding utility ([51cbad8](https://github.com/Ripwords/MyInvoisClient/commit/51cbad8))
- Add XML-related dependencies and update rolldown config for external modules ([5237aad](https://github.com/Ripwords/MyInvoisClient/commit/5237aad))
- Add support for new XML processing features and enhance rolldown configuration for better module handling ([a492bb8](https://github.com/Ripwords/MyInvoisClient/commit/a492bb8))
- Populate signed properties (step 6) ([87397b1](https://github.com/Ripwords/MyInvoisClient/commit/87397b1))
- Implement new XML processing enhancements and refine rolldown configuration for improved module management ([d1b4455](https://github.com/Ripwords/MyInvoisClient/commit/d1b4455))
- Document signature implementation ([b42604c](https://github.com/Ripwords/MyInvoisClient/commit/b42604c))
- Add debugDocumentHash and testSubmissionHashMethods functions for validating document hash calculations ([b0921ac](https://github.com/Ripwords/MyInvoisClient/commit/b0921ac))
- Expand invoice type definitions with InvoiceSubmission and SignedInvoiceSubmission interfaces, enhance document generation utilities to support new structures, and improve type safety in signature handling ([eae4ed7](https://github.com/Ripwords/MyInvoisClient/commit/eae4ed7))

### 🩹 Fixes

- Update release script in package.json to use bun run for building ([d41b5d3](https://github.com/Ripwords/MyInvoisClient/commit/d41b5d3))
- Update release script in package.json to include public access for npm publish ([36c4e14](https://github.com/Ripwords/MyInvoisClient/commit/36c4e14))

### 💅 Refactors

- Update rolldown.config.ts to support multiple output formats and entry file naming ([eacd967](https://github.com/Ripwords/MyInvoisClient/commit/eacd967))
- Update MyInvoisClient to use taxpayerLogin for token management and remove redundant TokenResponse interface; delete obsolete test file ([4844b2c](https://github.com/Ripwords/MyInvoisClient/commit/4844b2c))
- Simplify UnitTypeCode definition by replacing hardcoded values with imports from unit-specific modules ([62484e3](https://github.com/Ripwords/MyInvoisClient/commit/62484e3))
- Update unit type imports to include .d.ts extensions for better type resolution ([db2ea18](https://github.com/Ripwords/MyInvoisClient/commit/db2ea18))
- Remove taxpayerLogin function and update MyInvoisClient to use platformLogin; add optional onBehalfOf parameter to ClientCredentials ([790ea53](https://github.com/Ripwords/MyInvoisClient/commit/790ea53))
- Enhance PEM certificate handling by adding validation for Base64 content and improving error messages ([9d9d8ae](https://github.com/Ripwords/MyInvoisClient/commit/9d9d8ae))
- Remove unused imports related to Document and Node types from xmldom-ts in signature utility files ([15ae5bb](https://github.com/Ripwords/MyInvoisClient/commit/15ae5bb))
- Remove debug logging from populateFinalDocument function in signature utility ([980b322](https://github.com/Ripwords/MyInvoisClient/commit/980b322))
- Update verifyTin method to support multiple ID types and improve parameter naming for clarity ([3d09585](https://github.com/Ripwords/MyInvoisClient/commit/3d09585))
- Initialize tokenExpiration to undefined and enhance token validation logic in MyInvoisClient ([a7edd3e](https://github.com/Ripwords/MyInvoisClient/commit/a7edd3e))
- Remove unnecessary ts-ignore for private method call in MyInvoisClientWithBRN test ([c04ea76](https://github.com/Ripwords/MyInvoisClient/commit/c04ea76))
- Update MSIC code types and integrate into invoice supplier interface ([f28fa71](https://github.com/Ripwords/MyInvoisClient/commit/f28fa71))
- Enhance hashSignedProperties function to support optional canonicalization algorithm and add fallback for C14N 1.1 ([b7d693b](https://github.com/Ripwords/MyInvoisClient/commit/b7d693b))
- Add registrationType field to Supplier interface in invoice-1_1.d.ts ([225ffeb](https://github.com/Ripwords/MyInvoisClient/commit/225ffeb))
- Enhance canonicalization process in canonicalizeAndHashDocument function with optional algorithm support and fallback for C14N 1.1 ([41a5570](https://github.com/Ripwords/MyInvoisClient/commit/41a5570))
- Restructure invoice1-1.ts for improved readability and maintainability; add XML minification and error handling in document hash generation ([9df51cb](https://github.com/Ripwords/MyInvoisClient/commit/9df51cb))
- Update canonicalization algorithm URIs in signature utilities to use C14N 1.1 and ensure proper fallback handling ([20e375a](https://github.com/Ripwords/MyInvoisClient/commit/20e375a))
- Remove unused MyInvoisClient and invoice1-1 utility files, update tsconfig.json to improve type declaration settings, and enhance invoice-1_1 type definitions with additional fields for better clarity ([2bbe651](https://github.com/Ripwords/MyInvoisClient/commit/2bbe651))

### 🏡 Chore

- Update package.json with new name, version, description, and main entry point ([b952d5a](https://github.com/Ripwords/MyInvoisClient/commit/b952d5a))
- Update package.json to add rolldown and rolldown-plugin-dts as devDependencies ([1322bac](https://github.com/Ripwords/MyInvoisClient/commit/1322bac))
- Add release script to package.json ([7ab378d](https://github.com/Ripwords/MyInvoisClient/commit/7ab378d))
- Bump version to 0.0.2 in package.json ([863187a](https://github.com/Ripwords/MyInvoisClient/commit/863187a))
- Bump version to 0.0.4 in package.json and add dotenv as a devDependency; update rolldown output directory and enable sourcemaps ([a53bc25](https://github.com/Ripwords/MyInvoisClient/commit/a53bc25))
- Bump version to 0.0.5 in package.json; update ofetch import path in MyInvoisClient and tests ([c5ef1d3](https://github.com/Ripwords/MyInvoisClient/commit/c5ef1d3))
- Bump version to 0.0.6 in package.json; remove ofetch dependency and update MyInvoisClient to use fetch; add dotenv setup in vitest.config.ts ([4b73f11](https://github.com/Ripwords/MyInvoisClient/commit/4b73f11))
- Bump version to 0.0.7 in package.json; add exports field and update rolldown output directory; enhance MyInvoisClient with debug option ([7bfa137](https://github.com/Ripwords/MyInvoisClient/commit/7bfa137))
- Organise package.json fields ([94afac0](https://github.com/Ripwords/MyInvoisClient/commit/94afac0))
- Bump version to 0.0.8 in package.json; update rolldown-plugin-dts and typescript dependencies; remove git push from release script ([04fc74c](https://github.com/Ripwords/MyInvoisClient/commit/04fc74c))
- Bump version to 0.0.9 in package.json; add clean script using rimraf; update rolldown config for isolated declaration; fix import path in MyInvoisClient ([f820113](https://github.com/Ripwords/MyInvoisClient/commit/f820113))
- Bump version to 0.0.10 in package.json ([0baa610](https://github.com/Ripwords/MyInvoisClient/commit/0baa610))
- Add @vitest/coverage-v8 dependency to package.json and bun.lock for improved test coverage reporting ([02c11da](https://github.com/Ripwords/MyInvoisClient/commit/02c11da))
- Add *.pem to .gitignore to exclude PEM files from version control ([f86ad14](https://github.com/Ripwords/MyInvoisClient/commit/f86ad14))
- Update dependencies in package.json and bun.lock to include xml-crypto and related packages ([48539ea](https://github.com/Ripwords/MyInvoisClient/commit/48539ea))
- Update package version to 0.0.11, add crypto dependency, and adjust type imports for improved clarity ([1b78281](https://github.com/Ripwords/MyInvoisClient/commit/1b78281))
- Remove rolldown and related dependencies, update build script to use tsdown, and enhance type definitions for better clarity and maintainability ([6c06af9](https://github.com/Ripwords/MyInvoisClient/commit/6c06af9))
- Bump package version to 0.1.0 for release readiness ([8b75664](https://github.com/Ripwords/MyInvoisClient/commit/8b75664))
- Update .gitignore to exclude *.conf files, enhance release script to include changelog generation, and expand README with detailed installation and testing instructions for MyInvois client ([ca968bc](https://github.com/Ripwords/MyInvoisClient/commit/ca968bc))
- Add changelogen dependency for automated changelog generation ([3c6592e](https://github.com/Ripwords/MyInvoisClient/commit/3c6592e))

### ✅ Tests

- Skip MyInvoisClient tests if required environment variables are missing; use hardcoded values for TIN and NRIC in tests ([3200a8e](https://github.com/Ripwords/MyInvoisClient/commit/3200a8e))
- Improve handling of potential canonicalization failures in canonicalizeAndHashDocument test ([16d3f58](https://github.com/Ripwords/MyInvoisClient/commit/16d3f58))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

