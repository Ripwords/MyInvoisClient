# Getting Started

`@ripwords/myinvois-client` is a TypeScript client for Malaysia's
[MyInvois (LHDN) e-invoicing API](https://sdk.myinvois.hasil.gov.my/): UBL
document building, XAdES (JSON profile) digital signing, submission, polling,
cancellation/rejection, taxpayer validation and built-in rate limiting.

> **Scope:** Malaysia MyInvois only. Singapore's InvoiceNow / Peppol
> e-invoicing is a different system and out of scope for this library.

## Installation

```bash
npm install @ripwords/myinvois-client
# or: bun add / pnpm add / yarn add @ripwords/myinvois-client
```

Node.js is the supported runtime (the library also runs on Bun). All
credentials are per-instance constructor arguments — nothing is read from
`process.env`, so multi-tenant apps can hold one client per organisation.

## Creating a client

From a PKCS#12 bundle (recommended — single source of certificate + key):

```typescript
import { MyInvoisClient } from '@ripwords/myinvois-client'

const client = MyInvoisClient.fromP12(
  clientId,
  clientSecret,
  'sandbox', // or 'production'
  'path/to/certificate.p12',
  passphrase,
)
```

From PEM strings, with the options factory (preferred for new code — new
options are added here without changing call sites):

```typescript
const client = MyInvoisClient.create({
  clientId,
  clientSecret,
  environment: 'sandbox',
  certificatePem,
  privateKeyPem,
  // optional:
  onBehalfOf: 'C1234567890',          // intermediary access (TIN or TIN:ROB)
  retryOn429: { maxRetries: 2 },      // automatic Retry-After back-off
  rateLimitStore: myRedisStore,       // shared limiter for multi-process apps
  tokenStore: myRedisTokenStore,      // shared token cache
  debug: false,
})
```

Client credentials come from the [MyInvois portal](https://mytax.hasil.gov.my/);
see the official [login documentation](https://sdk.myinvois.hasil.gov.my/api/07-login-as-taxpayer-system/)
for how clientId/clientSecret pairs work. The client logs in lazily on the
first API call, caches the token, and refreshes it 60 seconds before expiry
with single-flight deduplication.

## First submission

```typescript
const { data, status } = await client.submitDocument([invoice])
if (status === 202) {
  const result = await client.getSubmissionStatus(data.submissionUid)
  console.log(result.status) // 'Valid' | 'PartiallyValid' | 'Invalid' | ...
}
```

The invoice shape follows the official
[Invoice v1.1 structure](https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/) —
see [Signing & Submission](/guide/signing) for the full flow and the
[Document Submission API reference](/api/document-submission) for every method.

## Environments

| Environment  | Base URL |
|---|---|
| `sandbox`    | `https://preprod-api.myinvois.hasil.gov.my` |
| `production` | `https://api.myinvois.hasil.gov.my` |

The sandbox (preprod) environment and its setup are described in the official
[SDK docs](https://sdk.myinvois.hasil.gov.my/sdk-1-0-release/).
