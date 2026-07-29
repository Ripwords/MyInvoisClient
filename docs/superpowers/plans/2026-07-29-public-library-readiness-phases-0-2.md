# Public Library Readiness (Phases 0–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `@ripwords/myinvois-client` an MIT licence, close two small API gaps, and bring the type definitions up to full official MyInvois field coverage — without changing any existing behaviour.

**Architecture:** Three phases shipping as 0.4.3, 0.5.0, and 0.6.0. Every change is additive: new optional fields, new functions alongside old ones. The signing implementation is not touched. New optional fields serialise only when the caller supplies them, so documents that use no new field produce byte-identical UBL JSON.

**Tech Stack:** TypeScript 5.8, Bun, Vitest 3, oxlint, prettier, tsdown, node-forge.

**Source spec:** `docs/superpowers/specs/2026-07-29-public-library-readiness-design.md`

## Global Constraints

- **Additive only.** No existing field changes name, type, or optionality. No existing function signature changes. Verified by: existing tests compile unchanged.
- **Byte-identical serialisation.** A document that sets no new field must produce exactly the same output from `generateCleanInvoiceObject` as before. Undefined optional fields are omitted from the object entirely — never emitted as `null` or `''`.
- **One deliberate exception, Task 5 only.** The supplier's `SST` and `TTX` identifications and the buyer's `TTX` identification are always emitted with an `'NA'` fallback, because the official sample document requires four identifications on both parties. Task 5 regenerates the snapshot and verifies the diff contains nothing else. **No other task may modify the snapshot.** If a later task's snapshot check fails, that is a defect in that task, not a licence to regenerate.
- **Signing is out of scope.** Do not modify `createSignedProperties`, `calculateSignedPropertiesDigest`, `createSignedInfoAndSign`, `signDocumentString`, `calculateDocumentDigest`, `calculateCertificateDigest`, `extractCertificateInfo`, or anything in `src/utils/certificate.ts`.
- **Cite the specification.** Every type change names its official source page in the commit body. Pages are listed in the spec's "Source of truth" table. The `/documents/` index returns HTTP 403; individual pages fetch normally.
- **Baseline test state.** 60 unit tests pass, 12 fail. All 12 failures are live-sandbox tests with expired credentials (`Platform login failed with status 400`) in `MyInvoiClientWithRealData.test.ts`, `documentSubmission.test.ts`, and `signAndSubmitInvoiceP12.test.ts`. These must not get worse; they are not a regression signal and must not be used to mask one.
- **Verification command after every task:** `bunx vitest run 2>&1 | tail -5` — expect `Tests  12 failed | 60 passed | 1 skipped (73)` or better. If passing count drops below 60, stop.
- **Lint before every commit:** `bunx oxlint` must report no errors.
- **Filenames** are kebab-case. Existing camelCase files (`apiQueue.ts`, `lineItems.ts`) stay as they are; new files use kebab-case.
- **Commit style:** Conventional Commits.
- **Branch:** work on `feat/public-library-readiness` off `master`.

---

## File Structure

| File | Responsibility | Change |
| --- | --- | --- |
| `LICENSE` | MIT licence text | Create |
| `package.json` | Add `"license": "MIT"` | Modify |
| `README.md` | Licence section | Modify |
| `src/api/documentManagement.ts` | Add `getRecentDocuments` | Modify (append) |
| `src/index.ts` | Add `getRecentDocuments` method and `create` factory | Modify |
| `src/types/documents.d.ts` | All type additions | Modify |
| `src/utils/document.ts` | Serialise new optional fields | Modify (`generateCleanInvoiceObject` only) |
| `test/getRecentDocuments.test.ts` | Cover the new endpoint | Create |
| `test/client-create-factory.test.ts` | Cover the factory | Create |
| `test/serialization-stability.test.ts` | Prove byte-identical output | Create |
| `test/field-coverage.test.ts` | Cover new optional fields | Create |

---

## Task 1: MIT licence

**Files:**
- Create: `LICENSE`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by later tasks

Copyright holder confirmed by the author: **Jia Jing Teoh**.

- [ ] **Step 1: Create `LICENSE`**

```
MIT License

Copyright (c) 2026 Jia Jing Teoh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Add the `license` field to `package.json`**

Insert after the `"description"` line:

```json
  "license": "MIT",
```

- [ ] **Step 3: Add `LICENSE` to the published files list**

In `package.json`, change:

```json
  "files": [
    "dist"
  ],
```

to:

```json
  "files": [
    "dist",
    "LICENSE",
    "README.md"
  ],
```

- [ ] **Step 4: Add a licence section to `README.md`**

Append to the end of the file:

```markdown
## License

MIT — see [LICENSE](LICENSE).
```

- [ ] **Step 5: Verify the package manifest is still valid**

Run: `bun pm pkg get license name version`
Expected: prints `MIT`, `@ripwords/myinvois-client`, `0.4.2`.

- [ ] **Step 6: Verify tests are unchanged**

Run: `bunx vitest run 2>&1 | tail -5`
Expected: `Tests  12 failed | 60 passed | 1 skipped (73)`

- [ ] **Step 7: Commit**

```bash
git add LICENSE package.json README.md
git commit -m "feat: add MIT licence

Without a licence the default is all rights reserved, which blocks
every potential adopter. MIT was chosen for zero friction with
commercial users."
```

---

## Task 2: `getRecentDocuments` endpoint

**Files:**
- Modify: `src/api/documentManagement.ts` (append)
- Modify: `src/index.ts`
- Test: `test/getRecentDocuments.test.ts` (create)

**Interfaces:**
- Consumes: `DocumentContext` and `rawLogs` from `src/api/documentManagement.ts`; `DocumentSummary`, `DocumentStatus`, `EInvoiceTypeCode` from `src/types`.
- Produces: `getRecentDocuments(context, params): Promise<DocumentSummary[]>` in the API module, and `MyInvoisClient.getRecentDocuments(params): Promise<DocumentSummary[]>`.

Background: the rate limiter already has this category. `src/utils/apiQueue.ts:34` declares `'getRecentDocuments'`, `:61` sets `{ max: 12, perMs: 60000 }`, and `:319` matches `/documents/recent`. Only the client method was missing.

- [ ] **Step 1: Write the failing test**

Create `test/getRecentDocuments.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { getRecentDocuments } from '../src/api/documentManagement'

const makeContext = (payload: unknown) => ({
  fetch: vi.fn(async () => ({
    json: async () => payload,
  })) as unknown as typeof fetch,
  debug: false,
})

describe('getRecentDocuments', () => {
  it('calls the recent documents endpoint', async () => {
    const context = makeContext({ result: [] })
    await getRecentDocuments(context, {})

    const calledWith = (context.fetch as unknown as { mock: { calls: string[][] } })
      .mock.calls[0][0]
    expect(calledWith).toContain('/api/v1.0/documents/recent')
  })

  it('passes paging and filter parameters as query string', async () => {
    const context = makeContext({ result: [] })
    await getRecentDocuments(context, {
      pageNo: 2,
      pageSize: 50,
      invoiceDirection: 'Sent',
      status: 'Valid',
    })

    const calledWith = (context.fetch as unknown as { mock: { calls: string[][] } })
      .mock.calls[0][0]
    expect(calledWith).toContain('pageNo=2')
    expect(calledWith).toContain('pageSize=50')
    expect(calledWith).toContain('invoiceDirection=Sent')
    expect(calledWith).toContain('status=Valid')
  })

  it('normalises longID to longId', async () => {
    const context = makeContext({
      result: [{ uuid: 'abc', longID: 'LONG-1' }],
    })
    const documents = await getRecentDocuments(context, {})
    expect(documents[0].longId).toBe('LONG-1')
  })

  it('accepts a bare array response', async () => {
    const context = makeContext([{ uuid: 'abc', longId: 'LONG-2' }])
    const documents = await getRecentDocuments(context, {})
    expect(documents).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run test/getRecentDocuments.test.ts`
Expected: FAIL — `getRecentDocuments` is not exported from `src/api/documentManagement`.

- [ ] **Step 3: Implement the API function**

Append to `src/api/documentManagement.ts`. This mirrors the existing `searchDocuments` at line 66, including its response-shape fallback.

```ts
/**
 * Retrieves recently submitted or received documents.
 *
 * Official specification:
 * https://sdk.myinvois.hasil.gov.my/einvoicingapi/08-get-recent-documents/
 *
 * Rate limited to 12 requests per minute. The limiter category
 * `getRecentDocuments` already covers this path.
 */
export async function getRecentDocuments(
  context: DocumentContext,
  params: {
    pageNo?: number
    pageSize?: number
    submissionDateFrom?: string
    submissionDateTo?: string
    issueDateFrom?: string
    issueDateTo?: string
    invoiceDirection?: 'Sent' | 'Received'
    status?: DocumentStatus
    documentType?: EInvoiceTypeCode
    searchQuery?: string
  } = {},
): Promise<DocumentSummary[]> {
  const { fetch } = context
  const {
    pageNo,
    pageSize,
    submissionDateFrom,
    submissionDateTo,
    issueDateFrom,
    issueDateTo,
    invoiceDirection,
    status,
    documentType,
    searchQuery,
  } = params

  const queryParams = new URLSearchParams()

  if (pageNo) queryParams.set('pageNo', pageNo.toString())
  if (pageSize) queryParams.set('pageSize', pageSize.toString())
  if (submissionDateFrom)
    queryParams.set('submissionDateFrom', submissionDateFrom)
  if (submissionDateTo) queryParams.set('submissionDateTo', submissionDateTo)
  if (issueDateFrom) queryParams.set('issueDateFrom', issueDateFrom)
  if (issueDateTo) queryParams.set('issueDateTo', issueDateTo)
  if (invoiceDirection) queryParams.set('invoiceDirection', invoiceDirection)
  if (status) queryParams.set('status', status)
  if (documentType) queryParams.set('documentType', documentType)
  if (searchQuery) queryParams.set('searchQuery', searchQuery)

  const query = queryParams.toString()
  const response = await fetch(
    `/api/v1.0/documents/recent${query ? `?${query}` : ''}`,
  )

  const data = await response.json()

  if (rawLogs) {
    console.log('Raw recent documents:', data)
  }

  const documents: (DocumentSummary & { longID?: string })[] = Array.isArray(
    data,
  )
    ? data
    : (data?.result ?? [])

  return documents.map(doc => ({
    ...doc,
    longId: doc.longID ?? doc.longId,
  })) as DocumentSummary[]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run test/getRecentDocuments.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Expose the method on the client**

In `src/index.ts`, add this method immediately after the existing `searchDocuments` method (which ends before `getNotifications` at line 677):

```ts
  /**
   * Retrieves recently submitted or received documents.
   *
   * @param params - Optional paging and filter parameters
   * @returns Promise resolving to an array of document summaries
   *
   * @example
   * ```typescript
   * const recent = await client.getRecentDocuments({ pageSize: 20 })
   * ```
   *
   * @remarks
   * - Rate limited to 12 requests per minute
   */
  async getRecentDocuments(
    params: Parameters<typeof DocumentManagementAPI.getRecentDocuments>[1] = {},
  ): Promise<DocumentSummary[]> {
    return DocumentManagementAPI.getRecentDocuments(
      { fetch: this.fetch.bind(this), debug: this.debug },
      params,
    )
  }
```

- [ ] **Step 6: Verify typecheck and full suite**

Run: `bunx tsc --noEmit && bunx vitest run 2>&1 | tail -5`
Expected: no type errors; `Tests  12 failed | 64 passed | 1 skipped (77)`

- [ ] **Step 7: Lint and commit**

```bash
bunx oxlint
git add src/api/documentManagement.ts src/index.ts test/getRecentDocuments.test.ts
git commit -m "feat: add getRecentDocuments endpoint

The rate limiter already declared the getRecentDocuments category
(apiQueue.ts:34), its 12-per-minute budget (:61), and the
/documents/recent path match (:319). Only the client method was
missing.

Specification:
https://sdk.myinvois.hasil.gov.my/einvoicingapi/08-get-recent-documents/"
```

---

## Task 3: `MyInvoisClient.create()` factory

**Files:**
- Modify: `src/index.ts`
- Test: `test/client-create-factory.test.ts` (create)

**Interfaces:**
- Consumes: the existing `MyInvoisClient` constructor, unchanged.
- Produces: `MyInvoisClient.create(options: MyInvoisClientOptions): MyInvoisClient` and the exported interface `MyInvoisClientOptions`.

Rationale: `clientId` and `clientSecret` are adjacent `string` parameters, so transposing them yields a runtime `400` rather than a compile error. Enabling `debug` currently requires passing `undefined` for `onBehalfOf`. Future options each append another optional positional. The seven-parameter constructor stays and is **not** deprecated.

- [ ] **Step 1: Write the failing test**

Create `test/client-create-factory.test.ts`. It reuses the same PEM fixtures the existing `MyInvoisClient.test.ts` uses — read that file first and copy its certificate/key setup verbatim so the key-pair validation in the constructor passes.

```ts
import { describe, expect, it } from 'vitest'
import { MyInvoisClient } from '../src/index'
import { readFileSync } from 'node:fs'

const certificatePem = readFileSync('myinvois-test-cert.pem', 'utf8')
const privateKeyPem = readFileSync('myinvois-test-key.pem', 'utf8')

describe('MyInvoisClient.create', () => {
  it('builds a client from an options object', () => {
    const client = MyInvoisClient.create({
      clientId: 'id',
      clientSecret: 'secret',
      environment: 'sandbox',
      certificatePem,
      privateKeyPem,
    })
    expect(client).toBeInstanceOf(MyInvoisClient)
  })

  it('accepts debug without requiring a placeholder for onBehalfOf', () => {
    const client = MyInvoisClient.create({
      clientId: 'id',
      clientSecret: 'secret',
      environment: 'sandbox',
      certificatePem,
      privateKeyPem,
      debug: true,
    })
    expect(client).toBeInstanceOf(MyInvoisClient)
  })

  it('produces a client equivalent to the positional constructor', () => {
    const viaFactory = MyInvoisClient.create({
      clientId: 'id',
      clientSecret: 'secret',
      environment: 'sandbox',
      certificatePem,
      privateKeyPem,
      onBehalfOf: 'TIN123',
    })
    const viaConstructor = new MyInvoisClient(
      'id',
      'secret',
      'sandbox',
      certificatePem,
      privateKeyPem,
      'TIN123',
    )
    expect(Object.keys(viaFactory)).toEqual(Object.keys(viaConstructor))
  })

  it('still rejects a mismatched certificate and key', () => {
    expect(() =>
      MyInvoisClient.create({
        clientId: 'id',
        clientSecret: 'secret',
        environment: 'sandbox',
        certificatePem,
        privateKeyPem: privateKeyPem.replace(/A/, 'B'),
      }),
    ).toThrow()
  })
})
```

If `myinvois-test-cert.pem` / `myinvois-test-key.pem` are absent (they are gitignored), generate them first using the instructions already in `README.md` under "Generating Test Certificates for Development".

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run test/client-create-factory.test.ts`
Expected: FAIL — `MyInvoisClient.create is not a function`.

- [ ] **Step 3: Add the options interface**

In `src/index.ts`, add above the `MyInvoisClient` class declaration (before line 42):

```ts
/**
 * Options for {@link MyInvoisClient.create}.
 *
 * Preferred over the positional constructor: new options can be added here
 * without changing any existing call site.
 */
export interface MyInvoisClientOptions {
  /** Client ID issued by the MyInvois portal. */
  clientId: string
  /** Client secret issued by the MyInvois portal. */
  clientSecret: string
  /** Target environment. */
  environment: 'sandbox' | 'production'
  /** Signing certificate in PEM format. */
  certificatePem: string
  /** Private key in PEM format. Must match the certificate. */
  privateKeyPem: string
  /** TIN of the taxpayer being represented, for intermediary access. */
  onBehalfOf?: string
  /** Enable verbose logging. Defaults to `MYINVOIS_DEBUG === 'true'`. */
  debug?: boolean
}
```

- [ ] **Step 4: Add the static factory**

In `src/index.ts`, add immediately before the existing `static fromP12(` at line 839:

```ts
  /**
   * Creates a client from an options object.
   *
   * Equivalent to the positional constructor, but avoids ordering mistakes
   * between same-typed parameters and does not require placeholder
   * arguments to reach optional ones.
   *
   * @example
   * ```typescript
   * const client = MyInvoisClient.create({
   *   clientId,
   *   clientSecret,
   *   environment: 'sandbox',
   *   certificatePem,
   *   privateKeyPem,
   * })
   * ```
   */
  static create(options: MyInvoisClientOptions): MyInvoisClient {
    return new MyInvoisClient(
      options.clientId,
      options.clientSecret,
      options.environment,
      options.certificatePem,
      options.privateKeyPem,
      options.onBehalfOf,
      options.debug,
    )
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bunx vitest run test/client-create-factory.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Verify typecheck and full suite**

Run: `bunx tsc --noEmit && bunx vitest run 2>&1 | tail -5`
Expected: no type errors; passing count is 68.

- [ ] **Step 7: Lint and commit, then release 0.5.0**

```bash
bunx oxlint
git add src/index.ts test/client-create-factory.test.ts
git commit -m "feat: add MyInvoisClient.create options factory

The positional constructor takes seven parameters, two adjacent pairs
of which are same-typed strings, so transposing them fails at runtime
rather than at compile time. Reaching debug also requires passing
undefined for onBehalfOf.

The constructor is unchanged and not deprecated. New options can now
be added without touching existing call sites."
```

---

## Task 4: Serialisation stability harness

**Files:**
- Test: `test/serialization-stability.test.ts` (create)

**Interfaces:**
- Consumes: `generateCleanInvoiceObject` from `src/utils/document.ts`.
- Produces: a committed snapshot that every later task must leave unchanged.

This task ships no production code. It exists so the remaining tasks have a mechanical guard for the byte-identical constraint. **Do this before any type change.**

- [ ] **Step 1: Write the snapshot test**

Create `test/serialization-stability.test.ts`. Build the fixture by copying a complete `InvoiceV1_1` object from the existing `test/signAndSubmitInvoice.test.ts` — read that file and reuse its invoice fixture verbatim so the snapshot reflects a realistic document.

```ts
import { describe, expect, it } from 'vitest'
import { canonicalizeJSON, generateCleanInvoiceObject } from '../src/utils/document'
import type { InvoiceV1_1 } from '../src/types'

// Copied verbatim from test/signAndSubmitInvoice.test.ts so this snapshot
// reflects a realistic document. Do not add new optional fields to this
// fixture — its whole purpose is to represent a pre-Phase-2 document.
const legacyInvoice: InvoiceV1_1 = {
  // <-- paste the existing invoice fixture here
} as InvoiceV1_1

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
```

- [ ] **Step 2: Run to generate the snapshot**

Run: `bunx vitest run test/serialization-stability.test.ts`
Expected: PASS, and `test/__snapshots__/serialization-stability.test.ts.snap` is created.

If the second assertion fails, the serialiser already emits empty strings for some absent field (`invoice.supplier.contactNumber || ''` at `document.ts:244` is one such case). That is pre-existing behaviour — relax that assertion to match today's output rather than changing the serialiser. Record what you relaxed in the commit body.

- [ ] **Step 3: Inspect the snapshot**

Run: `head -40 test/__snapshots__/serialization-stability.test.ts.snap`
Expected: readable canonical JSON of the invoice. Confirm it contains `AccountingSupplierParty` and `AccountingCustomerParty`.

- [ ] **Step 4: Commit**

```bash
bunx oxlint
git add test/serialization-stability.test.ts test/__snapshots__/
git commit -m "test: snapshot serialisation of a pre-field-coverage document

Guards the byte-identical constraint for Phase 2. Any change that
alters the UBL output of a document using no new optional field will
fail this snapshot."
```

---

## Task 5: Supplier tax registrations and email

**Files:**
- Modify: `src/types/documents.d.ts:35-71` (the `Supplier` interface)
- Modify: `src/utils/document.ts:191-208` (supplier `PartyIdentification`)
- Test: `test/field-coverage.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Supplier.sstRegistrationNumber?: string`, `Supplier.tourismTaxRegistrationNumber?: string`, `Supplier.email?: string`.

Specification: https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/ — Supplier SST Registration `[1-1]` max 35, Supplier Tourism Tax Registration `[1-1]` max 17, Supplier Email `[0-1]` max 320.

Current state: `Buyer` has `sstRegistrationNumber?` (`documents.d.ts:103`) and the serialiser emits it with an `'NA'` fallback (`document.ts:278`). `Supplier` has no such field, and its `PartyIdentification` array (`document.ts:191-208`) contains only TIN and registration number.

> **DECISION RESOLVED — Option B, confirmed by the author and by the official sample.**
>
> The official sample document was checked directly:
> https://sdk.myinvois.hasil.gov.my/files/sdksamples/1.1-Invoice-Sample.json
>
> **Both** parties carry exactly four `PartyIdentification` entries:
>
> | schemeID | Supplier sample value | Buyer sample value |
> | --- | --- | --- |
> | `TIN` | Supplier's TIN | Buyer's TIN |
> | `BRN` | Supplier's BRN | Buyer's BRN |
> | `SST` | `NA` | `NA` |
> | `TTX` | `NA` | `NA` |
>
> So `SST` and `TTX` are **always emitted**, with the literal string `NA` when the registration does not apply. This is what the buyer already does for SST at `document.ts:278`, so the convention is established in this codebase — it was simply applied to one field on one party.
>
> **Consequences, which the implementer must handle deliberately:**
>
> 1. This is the one place in the plan where the byte-identical constraint is intentionally broken. Supplier gains two entries, buyer gains one.
> 2. **Task 4's snapshot must be regenerated in this task's commit** (`bunx vitest run test/serialization-stability.test.ts -u`), and the regenerated diff must be inspected before committing — it must show *only* the added `SST`/`TTX` entries and nothing else.
> 3. Already-submitted documents are unaffected; signatures are computed fresh per submission. What changes is the payload from the next submission onward, in the direction of specification compliance.
> 4. This task therefore also covers the **buyer's** missing `TTX` entry and `tourismTaxRegistrationNumber` field, not just the supplier's.

- [ ] **Step 1: Write the failing test**

Create `test/field-coverage.test.ts`. Reuse the same invoice fixture as Task 4.

```ts
import { describe, expect, it } from 'vitest'
import { generateCleanInvoiceObject } from '../src/utils/document'
import type { InvoiceV1_1 } from '../src/types'

// Same fixture as test/serialization-stability.test.ts
const baseInvoice: InvoiceV1_1 = {
  // <-- paste the existing invoice fixture here
} as InvoiceV1_1

const supplierIdentifications = (invoice: InvoiceV1_1) => {
  const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
  const supplierParty = (clean.AccountingSupplierParty as Array<Record<string, unknown>>)[0]
  const party = (supplierParty.Party as Array<Record<string, unknown>>)[0]
  return party.PartyIdentification as Array<{ ID: Array<{ _: string; schemeID: string }> }>
}

const buyerIdentifications = (invoice: InvoiceV1_1) => {
  const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
  const buyerParty = (clean.AccountingCustomerParty as Array<Record<string, unknown>>)[0]
  const party = (buyerParty.Party as Array<Record<string, unknown>>)[0]
  return party.PartyIdentification as Array<{ ID: Array<{ _: string; schemeID: string }> }>
}

describe('party tax registrations', () => {
  it('emits four supplier identifications matching the official sample', () => {
    const schemes = supplierIdentifications(baseInvoice).map(
      entry => entry.ID[0].schemeID,
    )
    expect(schemes).toContain('TIN')
    expect(schemes).toContain('SST')
    expect(schemes).toContain('TTX')
    expect(schemes).toHaveLength(4)
  })

  it('emits NA for supplier SST when not supplied', () => {
    const ids = supplierIdentifications(baseInvoice)
    const sst = ids.find(entry => entry.ID[0].schemeID === 'SST')
    expect(sst?.ID[0]._).toBe('NA')
  })

  it('emits NA for supplier TTX when not supplied', () => {
    const ids = supplierIdentifications(baseInvoice)
    const ttx = ids.find(entry => entry.ID[0].schemeID === 'TTX')
    expect(ttx?.ID[0]._).toBe('NA')
  })

  it('emits the supplier SST number when supplied', () => {
    const invoice = {
      ...baseInvoice,
      supplier: { ...baseInvoice.supplier, sstRegistrationNumber: 'A01-2345-67891012' },
    }
    const ids = supplierIdentifications(invoice)
    const sst = ids.find(entry => entry.ID[0].schemeID === 'SST')
    expect(sst?.ID[0]._).toBe('A01-2345-67891012')
  })

  it('emits the supplier tourism tax number when supplied', () => {
    const invoice = {
      ...baseInvoice,
      supplier: { ...baseInvoice.supplier, tourismTaxRegistrationNumber: 'T-1234-5678' },
    }
    const ids = supplierIdentifications(invoice)
    const ttx = ids.find(entry => entry.ID[0].schemeID === 'TTX')
    expect(ttx?.ID[0]._).toBe('T-1234-5678')
  })

  it('emits four buyer identifications including TTX', () => {
    const schemes = buyerIdentifications(baseInvoice).map(
      entry => entry.ID[0].schemeID,
    )
    expect(schemes).toContain('SST')
    expect(schemes).toContain('TTX')
    expect(schemes).toHaveLength(4)
  })

  it('emits the buyer tourism tax number when supplied', () => {
    const invoice = {
      ...baseInvoice,
      buyer: { ...baseInvoice.buyer, tourismTaxRegistrationNumber: 'T-9999-0000' },
    }
    const ids = buyerIdentifications(invoice)
    const ttx = ids.find(entry => entry.ID[0].schemeID === 'TTX')
    expect(ttx?.ID[0]._).toBe('T-9999-0000')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run test/field-coverage.test.ts`
Expected: FAIL — `sstRegistrationNumber` does not exist on type `Supplier`; the TTX assertions find nothing.

- [ ] **Step 3: Add the type fields**

In `src/types/documents.d.ts`, inside the `Supplier` interface, add after `registrationNumber`:

```ts
  /**
   * Supplier's SST registration number. Max 35 chars.
   * Mandatory for SST registrants. Serialised as 'NA' when absent.
   * @example A01-2345-67891012
   */
  sstRegistrationNumber?: string
  /**
   * Supplier's Tourism Tax registration number. Max 17 chars.
   * Mandatory for tourism tax registrants. Serialised as 'NA' when absent.
   * @example T-1234-5678
   */
  tourismTaxRegistrationNumber?: string
  /**
   * Supplier's email address. Max 320 chars.
   */
  email?: string
```

Then, inside the `Buyer` interface, add after the existing `sstRegistrationNumber`:

```ts
  /**
   * Buyer's Tourism Tax registration number. Max 17 chars.
   * Serialised as 'NA' when absent.
   * @example T-9999-0000
   */
  tourismTaxRegistrationNumber?: string
  /**
   * Buyer's email address. Max 320 chars.
   */
  email?: string
```

- [ ] **Step 4: Serialise the new identifiers**

In `src/utils/document.ts`, replace the supplier `PartyIdentification` array at lines 191-208 with:

```ts
            // Party Identifications
            PartyIdentification: [
              {
                ID: [
                  {
                    _: invoice.supplier.tin,
                    schemeID: 'TIN',
                  },
                ],
              },
              {
                ID: [
                  {
                    _: formatIdValue(invoice.supplier.registrationNumber),
                    schemeID: invoice.supplier.registrationType || 'NRIC',
                  },
                ],
              },
              // SST and TTX are always present, falling back to 'NA', to match
              // the official sample document, which shows four identifications
              // for both parties:
              // https://sdk.myinvois.hasil.gov.my/files/sdksamples/1.1-Invoice-Sample.json
              {
                ID: [
                  {
                    _: invoice.supplier.sstRegistrationNumber || 'NA',
                    schemeID: 'SST',
                  },
                ],
              },
              {
                ID: [
                  {
                    _: invoice.supplier.tourismTaxRegistrationNumber || 'NA',
                    schemeID: 'TTX',
                  },
                ],
              },
            ],
```

Then add the buyer's missing `TTX` entry. In the buyer `PartyIdentification` array, immediately after the existing `SST` entry at `document.ts:275-282`, add:

```ts
              {
                ID: [
                  {
                    _: invoice.buyer.tourismTaxRegistrationNumber || 'NA',
                    schemeID: 'TTX',
                  },
                ],
              },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bunx vitest run test/field-coverage.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 6: Confirm the snapshot fails, and inspect exactly how**

Run: `bunx vitest run test/serialization-stability.test.ts`
Expected: **FAIL.** This is the one task in the plan where that is correct. Read the printed diff carefully before doing anything else.

The diff must show **only**:
- two added supplier `PartyIdentification` entries, `SST` and `TTX`, both with value `NA`
- one added buyer `PartyIdentification` entry, `TTX`, with value `NA`

If it shows anything else — a reordered key, a changed value, a removed entry — stop and fix the implementation. Do not update the snapshot to make an unexplained diff go away.

- [ ] **Step 7: Regenerate the snapshot**

Run: `bunx vitest run test/serialization-stability.test.ts -u`
Then: `git diff test/__snapshots__/`
Expected: exactly the three added entries described above and nothing more. Confirm this by reading the diff, not by assuming.

- [ ] **Step 8: Verify typecheck and full suite**

Run: `bunx tsc --noEmit && bunx vitest run 2>&1 | tail -5`
Expected: no type errors; passing count is 77.

- [ ] **Step 9: Lint and commit**

```bash
bunx oxlint
git add src/types/documents.d.ts src/utils/document.ts test/field-coverage.test.ts test/__snapshots__/
git commit -m "fix: emit SST and tourism tax identifications for both parties

The official sample document shows four PartyIdentification entries
for both supplier and buyer: TIN, BRN, SST and TTX, with the literal
string NA where a registration does not apply.

This library emitted two for the supplier and three for the buyer.
The supplier had no SST field at all, even though the supplier issues
the invoice and so is the party whose SST number the platform
validates. Neither party could declare a tourism tax registration,
although tax type 03 already existed for line items, so a registrant
could charge the tax without declaring the registration authorising
it.

This changes the UBL payload for every document from the next
submission onward, in the direction of specification compliance.
Already-submitted documents are unaffected, since signatures are
computed fresh per submission. The serialisation snapshot was
regenerated and its diff verified to contain only the three added
identification entries.

Sample:
https://sdk.myinvois.hasil.gov.my/files/sdksamples/1.1-Invoice-Sample.json
Specification:
https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/"
```

---

## Task 6: Address optional lines and postal zone

**Files:**
- Modify: `src/types/documents.d.ts:18-29` (the `Address` interface)
- Modify: `src/utils/document.ts` (supplier and buyer `PostalAddress` blocks)
- Test: `test/field-coverage.test.ts` (append)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Address.addressLine1?: string`, `Address.addressLine2?: string`, `Address.postalZone?: string`.

Specification: https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/ — Address Line 1 `[0-1]` max 150, Address Line 2 `[0-1]` max 150, Postal Zone `[0-1]` max 50.

Current state: `Address` has only `addressLine0`, `cityName`, `state`, `country`. The serialiser emits a single `AddressLine` entry (`document.ts:215-219` for supplier) and no `PostalZone`.

- [ ] **Step 1: Write the failing test**

Append to `test/field-coverage.test.ts`:

```ts
const supplierAddress = (invoice: InvoiceV1_1) => {
  const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
  const supplierParty = (clean.AccountingSupplierParty as Array<Record<string, unknown>>)[0]
  const party = (supplierParty.Party as Array<Record<string, unknown>>)[0]
  return (party.PostalAddress as Array<Record<string, unknown>>)[0]
}

describe('address optional fields', () => {
  it('emits a single address line when only addressLine0 is set', () => {
    const address = supplierAddress(baseInvoice)
    expect(address.AddressLine).toHaveLength(1)
  })

  it('omits PostalZone when not supplied', () => {
    const address = supplierAddress(baseInvoice)
    expect(address.PostalZone).toBeUndefined()
  })

  it('emits additional address lines when supplied', () => {
    const invoice = {
      ...baseInvoice,
      supplier: {
        ...baseInvoice.supplier,
        address: {
          ...baseInvoice.supplier.address,
          addressLine1: 'Bangunan Merdeka',
          addressLine2: 'Persiaran Jaya',
        },
      },
    }
    const address = supplierAddress(invoice)
    expect(address.AddressLine).toHaveLength(3)
  })

  it('emits PostalZone when supplied', () => {
    const invoice = {
      ...baseInvoice,
      supplier: {
        ...baseInvoice.supplier,
        address: { ...baseInvoice.supplier.address, postalZone: '50480' },
      },
    }
    const address = supplierAddress(invoice)
    expect(address.PostalZone).toEqual([{ _: '50480' }])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run test/field-coverage.test.ts`
Expected: FAIL — `addressLine1` does not exist on type `Address`.

- [ ] **Step 3: Add the type fields**

In `src/types/documents.d.ts`, inside `Address`, add after `addressLine0`:

```ts
  /** Second address line. Max 150 chars. */
  addressLine1?: string
  /** Third address line. Max 150 chars. */
  addressLine2?: string
  /** Postal zone / postcode. Max 50 chars. */
  postalZone?: string
```

- [ ] **Step 4: Serialise the new address fields**

`generateCleanInvoiceObject` builds `PostalAddress` separately for supplier and buyer. To avoid duplicating the logic twice, add a module-level helper above `generateCleanInvoiceObject` (before line 109):

```ts
/**
 * Builds the UBL PostalAddress block for a party.
 *
 * Optional lines and postal zone are omitted entirely when absent, so
 * addresses that set only addressLine0 serialise exactly as before.
 */
const buildPostalAddress = (address: Address) => ({
  CityName: [{ _: address.cityName }],
  CountrySubentityCode: [{ _: address.state }],
  ...(address.postalZone ? { PostalZone: [{ _: address.postalZone }] } : {}),
  AddressLine: [
    { Line: [{ _: address.addressLine0 }] },
    ...(address.addressLine1 ? [{ Line: [{ _: address.addressLine1 }] }] : []),
    ...(address.addressLine2 ? [{ Line: [{ _: address.addressLine2 }] }] : []),
  ],
  Country: [
    {
      IdentificationCode: [
        {
          _: address.country || 'MYS',
          listID: '3166-1',
          listAgencyID: 'ISO',
        },
      ],
    },
  ],
})
```

Add `Address` to the existing type import at the top of `src/utils/document.ts`.

Then replace the supplier `PostalAddress` block (lines 211-232) with:

```ts
            PostalAddress: [buildPostalAddress(invoice.supplier.address)],
```

and the equivalent buyer `PostalAddress` block with:

```ts
            PostalAddress: [buildPostalAddress(invoice.buyer.address)],
```

**Important:** `canonicalizeJSON` sorts object keys, so the key order in the helper does not affect the signed output. But confirm this with Step 6 rather than assuming it.

- [ ] **Step 5: Run the test to verify it passes**

Run: `bunx vitest run test/field-coverage.test.ts`
Expected: PASS — 11 tests.

- [ ] **Step 6: Verify the stability snapshot is untouched**

Run: `bunx vitest run test/serialization-stability.test.ts`
Expected: PASS with no snapshot update. This is the step that proves the refactor into `buildPostalAddress` did not change output.

- [ ] **Step 7: Verify typecheck and full suite**

Run: `bunx tsc --noEmit && bunx vitest run 2>&1 | tail -5`
Expected: no type errors; passing count is 81.

- [ ] **Step 8: Lint and commit**

```bash
bunx oxlint
git add src/types/documents.d.ts src/utils/document.ts test/field-coverage.test.ts
git commit -m "feat: add optional address lines and postal zone

Address supported only a single line with no postcode. The
specification allows two further lines and a postal zone, all optional.

Supplier and buyer address serialisation is now shared by one helper
rather than duplicated. The stability snapshot confirms the refactor
did not change output.

Specification:
https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/"
```

---

## Task 7: Line item tariff code and country of origin

**Files:**
- Modify: `src/types/documents.d.ts:117-223` (the `InvoiceLineItem` interface)
- Modify: `src/utils/document.ts` (the `InvoiceLine` serialisation block)
- Test: `test/field-coverage.test.ts` (append)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `InvoiceLineItem.productTariffCode?: string`, `InvoiceLineItem.countryOfOrigin?: CountryCode`.

Specification: https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/ — Product Tariff Code `[0-1]` max 12 (period allowed), Country of Origin `[0-1]` max 3.

In UBL these map to `cac:InvoiceLine / cac:Item / cac:CommodityClassification / cbc:ItemClassificationCode` with `listID="PTC"`, and `cac:InvoiceLine / cac:Item / cac:OriginCountry / cbc:IdentificationCode`.

- [ ] **Step 1: Locate the existing item classification block**

Run: `grep -n "CommodityClassification\|OriginCountry\|ItemClassificationCode" src/utils/document.ts`

Read the surrounding lines before editing. The existing block emits the classification code with `listID: 'CLASS'`. The new tariff code is a **second** `CommodityClassification` entry with `listID: 'PTC'`, not a replacement.

- [ ] **Step 2: Write the failing test**

Append to `test/field-coverage.test.ts`:

```ts
const firstLineItem = (invoice: InvoiceV1_1) => {
  const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
  const lines = clean.InvoiceLine as Array<Record<string, unknown>>
  return (lines[0].Item as Array<Record<string, unknown>>)[0]
}

describe('line item trade fields', () => {
  it('omits origin country when not supplied', () => {
    expect(firstLineItem(baseInvoice).OriginCountry).toBeUndefined()
  })

  it('emits origin country when supplied', () => {
    const invoice = {
      ...baseInvoice,
      invoiceLineItems: [
        { ...baseInvoice.invoiceLineItems[0], countryOfOrigin: 'GBR' as const },
      ],
    }
    const item = firstLineItem(invoice)
    const origin = item.OriginCountry as Array<Record<string, unknown>>
    expect(origin[0].IdentificationCode).toEqual([{ _: 'GBR' }])
  })

  it('emits the tariff code as an additional PTC classification', () => {
    const invoice = {
      ...baseInvoice,
      invoiceLineItems: [
        { ...baseInvoice.invoiceLineItems[0], productTariffCode: '9800.00.0010' },
      ],
    }
    const item = firstLineItem(invoice)
    const classifications = item.CommodityClassification as Array<{
      ItemClassificationCode: Array<{ _: string; listID: string }>
    }>
    const ptc = classifications.find(
      entry => entry.ItemClassificationCode[0].listID === 'PTC',
    )
    expect(ptc?.ItemClassificationCode[0]._).toBe('9800.00.0010')
  })

  it('keeps the original CLASS classification alongside PTC', () => {
    const invoice = {
      ...baseInvoice,
      invoiceLineItems: [
        { ...baseInvoice.invoiceLineItems[0], productTariffCode: '9800.00.0010' },
      ],
    }
    const item = firstLineItem(invoice)
    const classifications = item.CommodityClassification as Array<{
      ItemClassificationCode: Array<{ listID: string }>
    }>
    expect(classifications).toHaveLength(2)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bunx vitest run test/field-coverage.test.ts`
Expected: FAIL — `productTariffCode` does not exist on type `InvoiceLineItem`.

- [ ] **Step 4: Add the type fields**

In `src/types/documents.d.ts`, inside `InvoiceLineItem`, add after `itemDescription`:

```ts
  /**
   * Harmonised System tariff code for the product. Max 12 chars.
   * Period is permitted.
   * @example 9800.00.0010
   */
  productTariffCode?: string
  /**
   * Country of origin (ISO 3166-1 alpha-3). Max 3 chars.
   * @example GBR
   */
  countryOfOrigin?: CountryCode
```

Confirm `CountryCode` is already imported in `documents.d.ts`; it is used by `Address.country`.

- [ ] **Step 5: Serialise the new fields**

Inside the `Item` object of the `InvoiceLine` block, append the tariff classification to the existing `CommodityClassification` array using a spread guard, and add `OriginCountry` as a guarded key:

```ts
                  ...(item.countryOfOrigin
                    ? {
                        OriginCountry: [
                          {
                            IdentificationCode: [{ _: item.countryOfOrigin }],
                          },
                        ],
                      }
                    : {}),
```

and within `CommodityClassification`, after the existing `CLASS` entry:

```ts
                    ...(item.productTariffCode
                      ? [
                          {
                            ItemClassificationCode: [
                              {
                                _: item.productTariffCode,
                                listID: 'PTC',
                              },
                            ],
                          },
                        ]
                      : []),
```

Match the surrounding indentation and the local variable name for the line item — read the block first; it may be `item`, `lineItem`, or a destructured name.

- [ ] **Step 6: Run the test to verify it passes**

Run: `bunx vitest run test/field-coverage.test.ts`
Expected: PASS — 15 tests.

- [ ] **Step 7: Verify the stability snapshot is untouched**

Run: `bunx vitest run test/serialization-stability.test.ts`
Expected: PASS with no snapshot update.

- [ ] **Step 8: Verify typecheck and full suite**

Run: `bunx tsc --noEmit && bunx vitest run 2>&1 | tail -5`
Expected: no type errors; passing count is 85.

- [ ] **Step 9: Lint and commit**

```bash
bunx oxlint
git add src/types/documents.d.ts src/utils/document.ts test/field-coverage.test.ts
git commit -m "feat: add line item tariff code and country of origin

Both are optional in the specification and were absent, which ruled
out export invoicing. The tariff code is emitted as an additional
commodity classification with listID PTC, alongside the existing CLASS
entry rather than replacing it.

Specification:
https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/"
```

---

## Task 8: Self-Billed Debit Note (type 13)

**Files:**
- Modify: `src/types/documents.d.ts` (add interface, extend union)
- Test: `test/field-coverage.test.ts` (append)

**Interfaces:**
- Consumes: `Supplier`, `Buyer`, `InvoiceLineItem`, `LegalMonetaryTotal`, `TaxTotal`, `CurrencyCode`, `EInvoiceTypeCode` — all already defined in `documents.d.ts`.
- Produces: `SelfBilledDebitNoteV1_1`, added as a member of `AllDocumentsV1_1`.

Specification: https://sdk.myinvois.hasil.gov.my/documents/self-billed-debit-v1-1/ — `InvoiceTypeCode` is `13` with `listVersionID="1.1"`.

Current state: `EInvoiceTypeCodeEnum.SelfBilledDebitNote = '13'` exists at `src/types/e-invoice.d.ts:39` and `'13'` is in the `EInvoiceTypeCode` union, but no interface exists and the type is absent from `AllDocumentsV1_1` (`documents.d.ts:507-515`), so type 13 cannot be submitted.

Note the union currently has **seven** members, not eight.

- [ ] **Step 1: Write the failing test**

Append to `test/field-coverage.test.ts`:

```ts
import type { SelfBilledDebitNoteV1_1 } from '../src/types'

describe('self-billed debit note', () => {
  it('accepts a type 13 document and serialises its line items', () => {
    const note: SelfBilledDebitNoteV1_1 = {
      supplier: baseInvoice.supplier,
      buyer: baseInvoice.buyer,
      eInvoiceVersion: '1.1',
      eInvoiceTypeCode: '13',
      eInvoiceCodeOrNumber: 'SBDN-001',
      originalEInvoiceReferenceNumber: 'F9D425P6DS7D8IU',
      originalEInvoiceInternalId: 'SBINV-001',
      eInvoiceDate: baseInvoice.eInvoiceDate,
      eInvoiceTime: baseInvoice.eInvoiceTime,
      invoiceCurrencyCode: 'MYR',
      selfBilledDebitNoteLineItems: baseInvoice.invoiceLineItems,
      legalMonetaryTotal: baseInvoice.legalMonetaryTotal,
      taxTotal: baseInvoice.taxTotal,
    }

    const clean = generateCleanInvoiceObject(note) as Record<string, unknown>
    expect(clean.InvoiceLine).toHaveLength(
      baseInvoice.invoiceLineItems.length,
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run test/field-coverage.test.ts`
Expected: FAIL — `SelfBilledDebitNoteV1_1` is not exported from `../src/types`.

- [ ] **Step 3: Add the interface**

In `src/types/documents.d.ts`, add immediately after `SelfBilledCreditNoteV1_1` (which ends at line 473). Model it on that interface, changing the type code and the line items field name.

```ts
/**
 * Self-Billed Debit Note (e-Invoice type 13), version 1.1.
 *
 * Issued by a buyer to record additional charges on a previously issued
 * self-billed e-Invoice.
 *
 * Specification:
 * https://sdk.myinvois.hasil.gov.my/documents/self-billed-debit-v1-1/
 */
export interface SelfBilledDebitNoteV1_1 {
  /** Supplier information (AccountingSupplierParty). */
  supplier: Supplier
  /** Buyer information (AccountingCustomerParty). */
  buyer: Buyer

  /** e-Invoice version. Fixed value '1.1'. */
  eInvoiceVersion: '1.1'
  /** e-Invoice type code for Self-Billed Debit Note. Fixed value '13'. */
  eInvoiceTypeCode: EInvoiceTypeCode
  /** Document reference number used by the issuer. Max 50 chars. */
  eInvoiceCodeOrNumber: string
  /** LHDNM Unique Identifier Number of the original self-billed document being adjusted. 26 chars. */
  originalEInvoiceReferenceNumber: string
  /** Issuer's internal identifier for the original self-billed document. */
  originalEInvoiceInternalId: string
  /** Date of issuance (YYYY-MM-DD) in UTC. */
  eInvoiceDate: string
  /** Time of issuance (HH:mm:ssZ) in UTC. */
  eInvoiceTime: string

  /** Currency used for the monetary values in this document. */
  invoiceCurrencyCode: CurrencyCode
  /**
   * Rate at which a non-Malaysian currency converts to Malaysian Ringgit.
   * Mandatory when invoiceCurrencyCode is not 'MYR'.
   */
  currencyExchangeRate?: number

  /** Self-billed debit note line items. */
  selfBilledDebitNoteLineItems: InvoiceLineItem[]

  /** Overall monetary totals. */
  legalMonetaryTotal: LegalMonetaryTotal
  /** Total tax amounts and subtotals. */
  taxTotal: TaxTotal
}
```

- [ ] **Step 4: Add it to the union**

In `src/types/documents.d.ts`, change lines 507-515 from seven members to eight:

```ts
export type AllDocumentsV1_1 =
  | InvoiceV1_1
  | CreditNoteV1_1
  | DebitNoteV1_1
  | RefundNoteV1_1
  | SelfBilledInvoiceV1_1
  | SelfBilledCreditNoteV1_1
  | SelfBilledDebitNoteV1_1
  | SelfBilledRefundNoteV1_1
```

- [ ] **Step 5: Teach the line item extractor about the new field**

`getLineItems` at `src/utils/document.ts:54` resolves the per-type line items field. Read it, then add a branch for `selfBilledDebitNoteLineItems` following the existing pattern for `selfBilledCreditNoteLineItems`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `bunx vitest run test/field-coverage.test.ts`
Expected: PASS — 16 tests.

- [ ] **Step 7: Verify typecheck and full suite**

Run: `bunx tsc --noEmit && bunx vitest run 2>&1 | tail -5`
Expected: no type errors; passing count is 86.

If `tsc` reports a non-exhaustive switch over `AllDocumentsV1_1` anywhere, fix that switch — it is exactly the risk the spec flagged when adding a union member.

- [ ] **Step 8: Lint and commit**

```bash
bunx oxlint
git add src/types/documents.d.ts src/utils/document.ts test/field-coverage.test.ts
git commit -m "feat: add self-billed debit note (type 13)

The enum entry and the '13' type code already existed, but no
interface did and the type was absent from AllDocumentsV1_1, so type
13 could not be submitted. Seven of the eight document types were
supported.

Specification:
https://sdk.myinvois.hasil.gov.my/documents/self-billed-debit-v1-1/"
```

---

## Task 9: Document-level optional fields

**Files:**
- Modify: `src/types/documents.d.ts` (all eight document interfaces)
- Modify: `src/utils/document.ts` (`generateCleanInvoiceObject`)
- Test: `test/field-coverage.test.ts` (append)

**Interfaces:**
- Consumes: `Address` (for `ShippingRecipient`), `CountryCode`, `PaymentMode` from `src/types/payment-modes.d.ts`.
- Produces: `ShippingRecipient` interface, `BillingPeriod` interface, `PaymentInformation` interface, `TradeInformation` interface, and optional members on all eight document interfaces.

Specification: https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/

This is the largest task. All fields are optional and omitted when absent.

Current state: `frequencyOfBilling`, `billingPeriodStartDate`, and `billingPeriodEndDate` exist **only** on `SelfBilledInvoiceV1_1` (`documents.d.ts:426-430`). The specification allows billing period on every type. Those three existing fields keep their names and position on `SelfBilledInvoiceV1_1`; the shared block is added to the other seven types using the same three field names, so the shape is uniform.

- [ ] **Step 1: Define the shared sub-interfaces**

In `src/types/documents.d.ts`, add above the document interfaces (after `TaxTotal`, which ends at line 262):

```ts
/**
 * Shipping recipient, when goods are delivered to a party other than the
 * buyer. All fields optional per the specification.
 */
export interface ShippingRecipient {
  /** Shipping recipient's name. Max 300 chars. */
  name?: string
  /** Shipping recipient's address. */
  address?: Address
  /** Shipping recipient's TIN. Max 14 chars. */
  tin?: string
  /** Shipping recipient's registration / identification number. */
  registrationNumber?: string
}

/**
 * Trade and customs information, for export invoicing.
 */
export interface TradeInformation {
  /** Customs Form No. 1 / 9 reference. Max 1000 chars. */
  customsFormReference?: string
  /** Incoterms code. Max 3 chars. @example CIF */
  incoterms?: string
  /** Free Trade Agreement information. Max 300 chars. */
  ftaInformation?: string
  /** Certified exporter authorisation number. Max 300 chars. */
  certifiedExporterAuthorisationNumber?: string
  /** Customs Form No. 2 reference. Max 1000 chars. */
  customsFormNo2Reference?: string
}

/**
 * Payment information. All fields optional per the specification.
 */
export interface PaymentInformation {
  /** Payment mode code. Max 2 chars. Refer to /codes/payment-methods/. */
  paymentMode?: PaymentModeCode
  /** Supplier's bank account number. Max 150 chars. */
  supplierBankAccountNumber?: string
  /** Payment terms. Max 300 chars. */
  paymentTerms?: string
  /** Prepayment amount. */
  prepaymentAmount?: number
  /** Prepayment date (YYYY-MM-DD). Max 10 chars. */
  prepaymentDate?: string
  /** Prepayment time (HH:mm:ssZ). Max 9 chars. */
  prepaymentTime?: string
  /** Prepayment reference number. Max 150 chars. */
  prepaymentReferenceNumber?: string
  /** Bill reference number. Max 150 chars. */
  billReferenceNumber?: string
}
```

Check the exported name in `src/types/payment-modes.d.ts` first — run `grep -n "^export" src/types/payment-modes.d.ts` — and use the actual exported code type in place of `PaymentModeCode`. Import it into `documents.d.ts` if it is not already imported.

- [ ] **Step 2: Define the shared optional block and add it to all eight interfaces**

Add this named interface after the sub-interfaces:

```ts
/**
 * Optional fields shared by every e-Invoice document type.
 *
 * Kept as a separate interface so the eight document types stay in
 * step. Every member is optional, so extending a document interface
 * with this block does not affect existing callers.
 */
export interface CommonDocumentOptionalFields {
  /** Tax currency code. Max 3 chars. */
  taxCurrencyCode?: CurrencyCode
  /** Frequency of billing. Max 50 chars. @example Monthly */
  frequencyOfBilling?: string
  /** Billing period start date (YYYY-MM-DD). Max 10 chars. */
  billingPeriodStartDate?: string
  /** Billing period end date (YYYY-MM-DD). Max 10 chars. */
  billingPeriodEndDate?: string
  /** Payment information. */
  paymentInformation?: PaymentInformation
  /** Shipping recipient, when different from the buyer. */
  shippingRecipient?: ShippingRecipient
  /** Trade and customs information, for export invoicing. */
  tradeInformation?: TradeInformation
  /** Amount exempted from tax at document level. */
  taxExemptionAmount?: number
  /** Tax exemption description at document level. Max 300 chars. */
  taxExemptionDescription?: string
}
```

Then make each of the eight document interfaces extend it:

```ts
export interface InvoiceV1_1 extends CommonDocumentOptionalFields {
```

Apply the same `extends CommonDocumentOptionalFields` to `CreditNoteV1_1`, `DebitNoteV1_1`, `RefundNoteV1_1`, `SelfBilledInvoiceV1_1`, `SelfBilledCreditNoteV1_1`, `SelfBilledDebitNoteV1_1`, and `SelfBilledRefundNoteV1_1`.

**`SelfBilledInvoiceV1_1` needs care:** it already declares `frequencyOfBilling?`, `billingPeriodStartDate?`, and `billingPeriodEndDate?` at lines 426-430. Delete those three declarations from the interface body — they are now inherited with identical names and types, so this is not a breaking change. Confirm with `bunx tsc --noEmit` that no duplicate-member error remains.

- [ ] **Step 3: Write the failing test**

Append to `test/field-coverage.test.ts`:

```ts
describe('document level optional fields', () => {
  it('omits billing period when not supplied', () => {
    const clean = generateCleanInvoiceObject(baseInvoice) as Record<string, unknown>
    expect(clean.InvoicePeriod).toBeUndefined()
  })

  it('emits billing period when supplied', () => {
    const invoice = {
      ...baseInvoice,
      frequencyOfBilling: 'Monthly',
      billingPeriodStartDate: '2026-07-01',
      billingPeriodEndDate: '2026-07-31',
    }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    const period = (clean.InvoicePeriod as Array<Record<string, unknown>>)[0]
    expect(period.StartDate).toEqual([{ _: '2026-07-01' }])
    expect(period.EndDate).toEqual([{ _: '2026-07-31' }])
    expect(period.Description).toEqual([{ _: 'Monthly' }])
  })

  it('omits delivery block when no shipping recipient is supplied', () => {
    const clean = generateCleanInvoiceObject(baseInvoice) as Record<string, unknown>
    expect(clean.Delivery).toBeUndefined()
  })

  it('emits payment means when a payment mode is supplied', () => {
    const invoice = {
      ...baseInvoice,
      paymentInformation: { paymentMode: '01' as const },
    }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    const means = (clean.PaymentMeans as Array<Record<string, unknown>>)[0]
    expect(means.PaymentMeansCode).toEqual([{ _: '01' }])
  })

  it('omits payment means when no payment information is supplied', () => {
    const clean = generateCleanInvoiceObject(baseInvoice) as Record<string, unknown>
    expect(clean.PaymentMeans).toBeUndefined()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `bunx vitest run test/field-coverage.test.ts`
Expected: FAIL — the guarded blocks are not emitted yet.

- [ ] **Step 5: Serialise the new blocks**

In `generateCleanInvoiceObject`, add these guarded keys to the returned object. Place them after the existing top-level document keys and before `AccountingSupplierParty`, matching the surrounding style.

```ts
    // Billing period. Omitted entirely when no part of it is supplied.
    ...(invoice.billingPeriodStartDate ||
    invoice.billingPeriodEndDate ||
    invoice.frequencyOfBilling
      ? {
          InvoicePeriod: [
            {
              ...(invoice.billingPeriodStartDate
                ? { StartDate: [{ _: invoice.billingPeriodStartDate }] }
                : {}),
              ...(invoice.billingPeriodEndDate
                ? { EndDate: [{ _: invoice.billingPeriodEndDate }] }
                : {}),
              ...(invoice.frequencyOfBilling
                ? { Description: [{ _: invoice.frequencyOfBilling }] }
                : {}),
            },
          ],
        }
      : {}),

    // Payment means and terms.
    ...(invoice.paymentInformation?.paymentMode ||
    invoice.paymentInformation?.supplierBankAccountNumber
      ? {
          PaymentMeans: [
            {
              ...(invoice.paymentInformation.paymentMode
                ? {
                    PaymentMeansCode: [
                      { _: invoice.paymentInformation.paymentMode },
                    ],
                  }
                : {}),
              ...(invoice.paymentInformation.supplierBankAccountNumber
                ? {
                    PayeeFinancialAccount: [
                      {
                        ID: [
                          {
                            _: invoice.paymentInformation
                              .supplierBankAccountNumber,
                          },
                        ],
                      },
                    ],
                  }
                : {}),
            },
          ],
        }
      : {}),
    ...(invoice.paymentInformation?.paymentTerms
      ? {
          PaymentTerms: [
            { Note: [{ _: invoice.paymentInformation.paymentTerms }] },
          ],
        }
      : {}),

    // Delivery / shipping recipient.
    ...(invoice.shippingRecipient
      ? {
          Delivery: [
            {
              DeliveryParty: [
                {
                  ...(invoice.shippingRecipient.name
                    ? {
                        PartyLegalEntity: [
                          {
                            RegistrationName: [
                              { _: invoice.shippingRecipient.name },
                            ],
                          },
                        ],
                      }
                    : {}),
                  ...(invoice.shippingRecipient.tin
                    ? {
                        PartyIdentification: [
                          {
                            ID: [
                              {
                                _: invoice.shippingRecipient.tin,
                                schemeID: 'TIN',
                              },
                            ],
                          },
                        ],
                      }
                    : {}),
                  ...(invoice.shippingRecipient.address
                    ? {
                        PostalAddress: [
                          buildPostalAddress(invoice.shippingRecipient.address),
                        ],
                      }
                    : {}),
                },
              ],
            },
          ],
        }
      : {}),
```

`buildPostalAddress` comes from Task 6.

**Note on `taxCurrencyCode`, `tradeInformation`, and the prepayment fields:** these map to UBL constructs (`cbc:TaxCurrencyCode`, `cac:AdditionalDocumentReference`, `cac:PrepaidPayment`) whose exact placement must be read off the specification page before writing them. Fetch https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/ and locate each mapping. If any mapping is ambiguous from the page, **land the type fields in this task and open a follow-up task for that field's serialisation** rather than guessing — an incorrect UBL path is worse than an absent one, because it produces a document the platform rejects with an unhelpful error.

- [ ] **Step 6: Run the test to verify it passes**

Run: `bunx vitest run test/field-coverage.test.ts`
Expected: PASS — 21 tests.

- [ ] **Step 7: Verify the stability snapshot is untouched**

Run: `bunx vitest run test/serialization-stability.test.ts`
Expected: PASS with no snapshot update. This is the most important verification in the plan: it proves that adding nine optional document-level fields changed nothing for documents that do not use them.

- [ ] **Step 8: Verify typecheck and full suite**

Run: `bunx tsc --noEmit && bunx vitest run 2>&1 | tail -5`
Expected: no type errors; passing count is 91.

- [ ] **Step 9: Lint and commit**

```bash
bunx oxlint
git add src/types/documents.d.ts src/utils/document.ts test/field-coverage.test.ts
git commit -m "feat: add document level optional fields

Adds tax currency code, billing period, payment information,
shipping recipient, trade and customs information, and document level
tax exemption to all eight document types, via a shared
CommonDocumentOptionalFields interface.

Billing period previously existed only on self-billed invoices, though
the specification allows it on every type. Those three fields keep
their names and are now inherited rather than declared per type.

Every field is optional and omitted from the UBL output when absent,
so documents that use none of them serialise unchanged. The stability
snapshot verifies this.

Specification:
https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/"
```

---

## Task 10: Release 0.6.0

**Files:**
- Modify: `CHANGELOG.md` (generated)
- Modify: `package.json` (version, generated)

**Interfaces:**
- Consumes: all preceding tasks.
- Produces: a published 0.6.0.

- [ ] **Step 1: Confirm the whole suite is at baseline or better**

Run: `bunx vitest run 2>&1 | tail -5`
Expected: `Tests  12 failed | 91 passed`. The 12 failures must be the same live-sandbox tests as at baseline. Confirm with:

Run: `bunx vitest run 2>&1 | grep "×"`
Expected: only tests in `MyInvoiClientWithRealData.test.ts`, `documentSubmission.test.ts`, and `signAndSubmitInvoiceP12.test.ts`.

- [ ] **Step 2: Confirm the build succeeds**

Run: `bun run build`
Expected: `dist/index.js`, `dist/index.cjs`, and `dist/index.d.ts` are produced.

- [ ] **Step 3: Confirm the new types are exported from the built bundle**

Run: `grep -c "SelfBilledDebitNoteV1_1\|tourismTaxRegistrationNumber\|MyInvoisClientOptions" dist/index.d.ts`
Expected: 3 or more.

- [ ] **Step 4: Release**

Run: `bun run release:minor`

This runs lint, build, changelog generation, and `npm publish`. Review the generated `CHANGELOG.md` before it publishes.

---

## Self-Review

**Spec coverage.** Phase 0 → Task 1. Phase 1 → Tasks 2 and 3. Phase 2 → Tasks 5 through 9, with Task 4 as the safety harness the spec's byte-identical constraint requires. Phase 3 (builders) and Phase 4 (documentation) are deliberately out of scope for this plan and get their own plan once Phase 2 lands. Phase 5 remains deferred per the spec.

**Known gaps carried forward, deliberately.**

- Task 9 lands the type fields for `taxCurrencyCode`, `tradeInformation`, and the prepayment group, but instructs the implementer to open a follow-up task for any UBL mapping that cannot be read unambiguously off the specification page. Guessing a UBL path produces documents the platform rejects with unhelpful errors, which is worse than the field simply being unserialised.
- Buyer `email` and `tourismTaxRegistrationNumber` are folded into Task 5 alongside the supplier equivalents rather than getting their own task, since they touch the same two files and the same serialisation block.
- Party `email` fields land as types in Task 5 but are not serialised there. The official sample places them under `cac:Party / cac:Contact / cbc:ElectronicMail`; confirm that path against the sample before wiring it, and if it is not unambiguous, open a follow-up rather than guessing.

**Both author decisions are resolved.**

1. Task 1 — copyright holder is **Jia Jing Teoh**.
2. Task 5 — **Option B**, and the official sample extended it further than the original question: `SST` and `TTX` are always emitted with an `'NA'` fallback on **both** parties, not just the supplier. The buyer was also missing its `TTX` entry. Task 5 therefore changes three identification entries, regenerates the snapshot once, and verifies the diff.

**Type consistency.** `buildPostalAddress` is introduced in Task 6 and reused in Task 9. `CommonDocumentOptionalFields` is defined in Task 9 Step 2 and extended onto all eight interfaces including `SelfBilledDebitNoteV1_1` from Task 8, so Task 8 must precede Task 9. `MyInvoisClientOptions` is defined and used only in Task 3. The `selfBilledDebitNoteLineItems` field name is used identically in Task 8's interface, its test, and the `getLineItems` branch.

**Test count arithmetic.** Baseline 60 passing. Task 2 adds 4 (64), Task 3 adds 4 (68), Task 4 adds 2 snapshot tests (70), Task 5 adds 7 (77), Task 6 adds 4 (81), Task 7 adds 4 (85), Task 8 adds 1 (86), Task 9 adds 5 (91). If Task 4's second assertion is relaxed per its Step 2 note, the count still holds since both tests remain.

Note that the per-file counts quoted inside Tasks 5 through 9 refer to `test/field-coverage.test.ts` alone (7, 11, 15, 16, 21), while the counts in the typecheck steps refer to the whole suite. They are different numbers on purpose.
