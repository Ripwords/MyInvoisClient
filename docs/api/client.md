# Client & Authentication

## `MyInvoisClient.create(options)`

Preferred factory. Options:

| Option | Type | Notes |
|---|---|---|
| `clientId` / `clientSecret` | `string` | From the MyInvois portal |
| `environment` | `'sandbox' \| 'production'` | Preprod vs live base URL |
| `certificatePem` / `privateKeyPem` | `string` | Signing credentials (validated as a pair) |
| `onBehalfOf?` | `string` | Intermediary access: TIN or `TIN:ROB` — see [Intermediaries](/guide/intermediaries) |
| `debug?` | `boolean` | Verbose logging (defaults to `MYINVOIS_DEBUG === 'true'`) |
| `rateLimitStore?` | `RateLimitStore` | Shared limiter backend — see [Rate Limiting](/guide/rate-limiting) |
| `tokenStore?` | `TokenStore` | Shared token cache |
| `retryOn429?` | `false \| { maxRetries?, maxDelayMs? }` | Automatic Retry-After back-off (default `{ maxRetries: 2, maxDelayMs: 60000 }`) |

## `MyInvoisClient.fromP12(clientId, clientSecret, environment, p12Input, passphrase, onBehalfOf?, debug?)`

Creates a client from a PKCS#12 bundle (path or `Buffer`) — extracts the
certificate and private key for you.

## `new MyInvoisClient(...)`

Positional constructor, kept stable for existing callers:
`(clientId, clientSecret, environment, certificatePem, privateKeyPem, onBehalfOf?, debug?, advanced?)`.

## Authentication

There is no explicit login call. The client logs in lazily before the first
API request, per the official OAuth2 client-credentials flow:

- [Login as Taxpayer System](https://sdk.myinvois.hasil.gov.my/api/07-login-as-taxpayer-system/)
- [Login as Intermediary System](https://sdk.myinvois.hasil.gov.my/api/08-login-as-intermediary-system/)

Tokens are cached (per represented taxpayer) and refreshed 60 seconds before
expiry; concurrent calls share one in-flight login; logins are rate-limited to
the official 12/min per client ID.

## `updateOnBehalfOf(onBehalfOf)`

Switches the represented taxpayer (intermediary access) and logs in for them.
Accepts a TIN (`'C1234567890'`) or `TIN:ROB` (`'C1234567890:201901234567'`).
Tokens are cached per represented taxpayer, so switching back reuses a still
valid token.

```typescript
await client.updateOnBehalfOf('C9876543210:201901234567')
```

## `buildSignedDocuments(documents)`

Signs and encodes documents locally **without submitting** — returns
`SignedDocumentPayload[]` with the exact wire bytes (`document`, base64), the
submission hash (`documentHash`, SHA-256 hex) and a parsed preview
(`signedDocument`). Store the payload and pass it to `submitDocument` later
for byte-identical submission. See [Signing & Submission](/guide/signing).
