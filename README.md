# MyInvois Client

[![npm](https://img.shields.io/npm/v/%40ripwords%2Fmyinvois-client)](https://www.npmjs.com/package/@ripwords/myinvois-client)

A TypeScript client for **Malaysia's MyInvois (LHDN) e-invoicing API**: UBL
document building, XAdES (JSON profile) digital signing, submission, polling,
cancellation/rejection, taxpayer validation and built-in rate limiting.

> **Scope:** Malaysia MyInvois only. Singapore's InvoiceNow / Peppol e-invoicing
> is a different system and out of scope for this library.

## Installation

```bash
npm install @ripwords/myinvois-client
# or: bun add / pnpm add / yarn add @ripwords/myinvois-client
```

## Quick start

```typescript
import { MyInvoisClient } from '@ripwords/myinvois-client'

// From a PKCS#12 bundle (recommended — single source of cert + key).
// Credentials are per-instance, so multi-tenant apps can hold one client
// per organisation; nothing is read from process.env.
const client = MyInvoisClient.fromP12(
  clientId,
  clientSecret,
  'sandbox', // or 'production'
  'path/to/certificate.p12',
  passphrase,
)

const { data, status } = await client.submitDocument([invoice])
if (status === 202) {
  const result = await client.getSubmissionStatus(data.submissionUid)
  console.log(result.status) // 'Valid' | 'PartiallyValid' | 'Invalid' | ...
}
```

Prefer PEM strings? Use `MyInvoisClient.create({ clientId, clientSecret, environment, certificatePem, privateKeyPem })`.

**Intermediaries:** pass `onBehalfOf` (in `create()` or as the constructor's
sixth argument) to act for a represented taxpayer. It accepts the taxpayer's
TIN alone (`'C1234567890'`) or `TIN:ROB` — TIN and registration number joined
by a colon (`'C1234567890:201901234567'`) — when the taxpayer registered with
both. Switch taxpayers at runtime with `client.updateOnBehalfOf(...)`; tokens
are cached per represented taxpayer.

## Build once, store, submit (`buildSignedDocuments`)

Signing is deterministic but timestamped, so the recommended pattern is to
build the signed payload once, store it, and submit the stored bytes — what
you store is byte-for-byte what MyInvois received, which makes audits and
resubmissions exact:

```typescript
// 1. Build (sign + hash + base64) without submitting
const [payload] = client.buildSignedDocuments([invoice])
// payload.document      — base64 of the signed JSON (the exact wire bytes)
// payload.documentHash  — SHA-256 hex of those bytes
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
interchangeably. The lower-level pieces (`buildSignedDocument`,
`generateCompleteDocument`, `calculateDocumentDigest`,
`transformDocumentForHashing`) are also exported for custom pipelines.

## Runtime code lists (`/codes`)

The official MyInvois code tables ship as typed runtime arrays under a
separate subpath, so they stay out of your main bundle unless imported:

```typescript
import {
  TAX_TYPES, // { code: '01', description: 'Sales Tax' }, ...
  CLASSIFICATION_CODES,
  STATE_CODES,
  COUNTRY_CODES,
  CURRENCY_CODES,
  E_INVOICE_TYPES,
  PAYMENT_MODES,
  UNIT_TYPES, // 2000+ UOM codes
  MSIC_CODES, // 1000+ industry codes, with categoryReference
} from '@ripwords/myinvois-client/codes'
```

Every entry's `code` is checked against the same union types the document
builder uses, so the lists and the compile-time types can't drift apart. The
tables are regenerated from the official SDK JSON files with
`bun run scripts/generate-codes.ts`.

## Environment Variables (for this repo's integration tests)

The library itself takes all credentials as constructor arguments. The
variables below are only used by this repository's live integration test
suite. Configuration lives in a git-ignored `.env` file — copy `.env.example`
and fill it in. The PKCS#12 bundle is the single source of the signing
certificate and private key.

```bash
# MyInvois API credentials (from the MyInvois portal)
MYINVOIS_CLIENT_ID=your_client_id
MYINVOIS_CLIENT_SECRET=your_client_secret

# PKCS#12 signing certificate
MYINVOIS_P12_PATH=path/to/certificate.p12
MYINVOIS_P12_PASSPHRASE=your_passphrase

# Supplier identity (must match the certificate holder)
MYINVOIS_SUPPLIER_NAME=My Company Sdn Bhd
MYINVOIS_SUPPLIER_TIN=C12345678900
MYINVOIS_SUPPLIER_ID_TYPE=BRN   # BRN for companies, NRIC for individuals
MYINVOIS_SUPPLIER_ID_VALUE=202301234567
```

⚠️ **Important**: Never commit your actual TIN, certificates, or API credentials to version control.

## Testing

Unit tests are deterministic and need no environment — certificates are
generated on the fly:

```bash
bun run test:run          # unit tests (test/unit)
```

The live sandbox integration suite (`test/integration`) signs and submits a
real invoice to the LHDN preprod API. It requires the `.env` variables above
and is gated behind an explicit flag:

```bash
bun run test:integration  # sets RUN_INTEGRATION=true
```

Each run writes a step-by-step report to `test/integration/.artifacts/` and
cancels the submitted invoice at the end, so the sandbox stays clean.

> **Expired certificate:** if your signing certificate has expired, documents
> fail only `Step08` signature validation with `DS304`/`DS329` (certificate
> validity / chain of trust). The suite recognises that case and reports it as
> an environment limitation rather than a library failure — renew the
> certificate to get fully `Valid` runs.

Because the integration suite needs real preprod credentials, CI runs only the
unit tests; unit coverage never touches the live LHDN API.

> **Running vitest under Bun:** the suite targets the Node runtime
> (`bun run test:run` invokes vitest on Node, which is fine). Running vitest
> *on* Bun (`bun x --bun vitest`) does not work: the default forks pool
> crashes (Bun's IPC channel lacks `unref`, breaking tinypool), and with
> `--pool=threads` the two tests that rely on `vi.mock` module mocking fail.
> The library itself runs fine on Bun — only the test tooling is Node-bound.

## Generating Test Certificates for Development

For testing purposes, you can generate self-signed certificates with MyInvois-required fields:

### 1. Create Certificate Configuration

Create `myinvois-cert.conf`:

```ini
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = MY
ST = YOUR_STATE
L = YOUR_CITY
O = YOUR_COMPANY_NAME
CN = YOUR_COMPANY_NAME
emailAddress = YOUR_EMAIL
serialNumber = YOUR_BUSINESS_REGISTRATION_NUMBER

[v3_req]
keyUsage = keyEncipherment, dataEncipherment, digitalSignature, nonRepudiation
# 1.3.6.1.4.1.311.10.3.12 is the Document Signing EKU MyInvois expects
extendedKeyUsage = 1.3.6.1.4.1.311.10.3.12, clientAuth, emailProtection
subjectAltName = @alt_names

[alt_names]
email.1 = YOUR_EMAIL
DNS.1 = YOUR_DOMAIN
```

### 2. Generate Private Key

```bash
openssl genrsa -out myinvois-test-key.pem 2048
```

### 3. Generate Certificate with Required MyInvois Fields

```bash
# Basic certificate with SERIALNUMBER
openssl req -new -x509 -key myinvois-test-key.pem -out myinvois-test-cert.pem -days 365 -config myinvois-cert.conf

# Enhanced certificate with organizationIdentifier (OI) field for TIN
openssl req -new -x509 -key myinvois-test-key.pem -out myinvois-enhanced-cert.pem -days 365 \
  -subj "/C=MY/ST=YOUR_STATE/L=YOUR_CITY/O=YOUR_COMPANY_NAME/CN=YOUR_COMPANY_NAME/serialNumber=YOUR_BUSINESS_REG/2.5.4.97=YOUR_TIN/emailAddress=YOUR_EMAIL"
```

### 4. Verify Certificate Fields

```bash
# Check certificate details
openssl x509 -in myinvois-enhanced-cert.pem -text -noout | grep -A 2 -B 2 "Subject:"

# Should show both:
# serialNumber=YOUR_BUSINESS_REG
# organizationIdentifier=YOUR_TIN
```

## Example Values

Replace the placeholders with your actual values:

- `YOUR_STATE`: `Kuala Lumpur`
- `YOUR_CITY`: `Kuala Lumpur` 
- `YOUR_COMPANY_NAME`: `My Company Sdn Bhd`
- `YOUR_EMAIL`: `admin@mycompany.com`
- `YOUR_BUSINESS_REG`: `202301234567` (SSM registration)
- `YOUR_TIN`: `IG12345678901` (MyInvois TIN)
- `YOUR_DOMAIN`: `mycompany.com`

## Rate Limiting

The client includes a built-in, per-`clientId` request queue that proactively
keeps each API category within the MyInvois-documented limits (e.g. submit
documents 100/min, get submission 300/min, cancel/reject 12/min). Requests that
would exceed a category's limit are queued and released as the sliding window
frees up — you can fire calls freely and the queue paces them.

### Automatic `429` back-off

If the API still answers `429` (e.g. other processes share your client ID),
the client waits as instructed by the `Retry-After` header — seconds or
HTTP-date, 5s when absent, capped at `maxDelayMs` — and retries, re-queued
through the limiter:

```typescript
const client = MyInvoisClient.create({
  // ...credentials...
  retryOn429: { maxRetries: 2, maxDelayMs: 60_000 }, // the defaults
  // retryOn429: false — disable and receive 429 responses raw
})
```

### Multi-process deployments: injectable stores

By default the rate-limit window and the token cache live in process memory,
so horizontally-scaled deployments (clusters, serverless, multiple pods) each
track their own counts and perform their own logins. Both can be backed by
shared storage instead:

```typescript
import type { RateLimitStore, TokenStore } from '@ripwords/myinvois-client'

// Sketch: Postgres-backed stores (any shared store works — Redis, etc.)
const rateLimitStore: RateLimitStore = {
  async tryAcquire(key, max, windowMs) {
    // In one transaction: delete rows older than windowMs, count the rest;
    // if count < max insert a row and return { ok: true }, else return
    // { ok: false, retryAfterMs: oldestRow + windowMs - now }.
    return acquireSlot(key, max, windowMs)
  },
}

const tokenStore: TokenStore = {
  // Keys are `${clientId}:${onBehalfOf ?? ''}` — one token per represented TIN
  get: key => selectToken(key), // -> { token, expiresAt } | undefined
  set: (key, value) => upsertToken(key, value),
}

const client = MyInvoisClient.create({
  // ...credentials...
  rateLimitStore,
  tokenStore,
})
```

`tryAcquire` must be atomic across processes. Pending requests and retry
timers stay in-process; the shared store only decides whether a slot is free.
A shared `tokenStore` also means one login serves all workers (the official
limit is 12 logins/min per client ID) and tokens survive process restarts.

### Known limitations

These are intentional trade-offs for a dependency-free default setup. Plan
around them for production deployments:

- **In-process by default.** Without an injected `rateLimitStore`, limits are
  tracked in memory per Node.js process, so the *combined* traffic of several
  processes can exceed the MyInvois limit (the built-in `429` back-off then
  recovers reactively). For horizontally-scaled deployments, inject shared
  stores as above or route MyInvois calls through a single worker.
- **Bursts within the cap.** The limiter allows up to `max` requests in the same
  instant (as long as the 60s window allows it). This is within the documented
  limit, but if you observe `429`s under heavy concurrency, reduce upstream
  concurrency.
- **Token refreshes are queued and deduplicated.** Logins go through the
  limiter (12/min per client ID) and concurrent requests share a single
  in-flight refresh per represented taxpayer; tokens are reused until shortly
  before expiry. Still, cache and reuse one client instance per credential set
  rather than constructing clients per request.

## Production Certificates

⚠️ **For production use, obtain official business certificates from MyInvois-approved Certificate Authorities:**

- **MSC Trustgate**: https://www.msctrustgate.com/
- **Digicert Sdn Bhd**
- **Cybersign Asia**

The certificate must include:
- `organizationIdentifier` field with your TIN
- `SERIALNUMBER` field with your business registration number
- Issued by a MyInvois-trusted CA

This project was created using `bun init` in bun v1.2.10. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## License

MIT — see [LICENSE](LICENSE).
