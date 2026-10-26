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

### Known limitations

These are intentional trade-offs for a dependency-free, in-process limiter.
Plan around them for production deployments:

- **In-process only.** Limits are tracked in memory per Node.js process. If you
  run multiple instances/workers (clustered NestJS, PM2 cluster, serverless,
  multiple pods), each process tracks its own counts, so the *combined* traffic
  can exceed the MyInvois limit. For horizontally-scaled deployments, throttle
  upstream or route MyInvois calls through a single worker.
- **Bursts within the cap.** The limiter allows up to `max` requests in the same
  instant (as long as the 60s window allows it). This is within the documented
  limit, but if you observe `429`s under heavy concurrency, reduce upstream
  concurrency.
- **No automatic `429` / `Retry-After` back-off.** The limiter is proactive
  only; it does not currently inspect rate-limit response headers and retry.
  If you see a `429`, honour its `Retry-After` header in your own retry logic.
- **Token refreshes are queued and deduplicated.** Logins go through the
  limiter (12/min per client ID) and concurrent requests share a single
  in-flight refresh; tokens are reused until shortly before expiry. Still,
  cache and reuse one client instance per credential set rather than
  constructing clients per request.

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
