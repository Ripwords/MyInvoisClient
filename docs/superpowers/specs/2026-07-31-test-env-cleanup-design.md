# Test suite & .env cleanup — design

Date: 2026-07-31
Status: approved

## Goal

Replace the accumulated ad-hoc test files and `.env` sprawl with a clean split:
deterministic unit tests that need no environment, and one consolidated live
integration suite driven by the real PKCS#12 certificate (`CERT_20600277.p12`).

## Environment variables

Canonical scheme (matches the existing `MYINVOIS_DEBUG` prefix):

| Variable | Purpose |
| --- | --- |
| `MYINVOIS_CLIENT_ID` / `MYINVOIS_CLIENT_SECRET` | Sandbox API credentials |
| `MYINVOIS_P12_PATH` | Path to the PKCS#12 bundle (single source of cert + key) |
| `MYINVOIS_P12_PASSPHRASE` | Passphrase for the bundle |
| `MYINVOIS_SUPPLIER_NAME` | Supplier legal name |
| `MYINVOIS_SUPPLIER_TIN` | Supplier TIN |
| `MYINVOIS_SUPPLIER_ID_TYPE` | `BRN` or `NRIC` |
| `MYINVOIS_SUPPLIER_ID_VALUE` | Registration number matching the type |
| `RUN_INTEGRATION` | Set truthy to enable the live sandbox suite |

The inline PEM blobs (`PRIVATE_KEY`, `CERTIFICATE`, `TEST_PRIVATE_KEY`,
`TEST_CERTIFICATE`) are removed — `MyInvoisClient.fromP12` derives both from
the P12. A committed `.env.example` documents every variable.

Outcome note (2026-07-31): of the three credential sets found in the old
`.env`, only the previously commented-out pair (`1bdf0a33-…`) authenticates
against the sandbox; the other two return HTTP 400 and are kept commented in
`.env` marked as likely revoked. The live suite passed end to end with that
set + `CERT_20600277.p12`.

## Test layout

```
test/
  fixtures/
    legacy-invoice.ts          (existing)
    test-credentials.ts        (new: generates a throwaway self-signed cert)
  unit/                        deterministic, no .env required
    ... 14 unit test files + __snapshots__/
  integration/
    live-sandbox.test.ts       gated by RUN_INTEGRATION + required env vars
```

Unit tests that previously read PEMs from env or loose `.pem` files
(`MyInvoisClient`, `client-create-factory`, `extractCertificateInfo.consistency`)
use the generated fixture instead.

The integration suite covers: client construction from the P12, sign + submit a
minimal invoice, poll submission status, fetch the QR code URL, and list recent
documents. It self-skips with a clear message when the gate or any variable is
missing.

## Deletions

Redundant/dead live suites: `signAndSubmitInvoice`, `signAndSubmitInvoiceP12`,
`MyInvoiClientWithRealData`, `signature-diagnostics`, `rateLimitingIntegration`
(read env vars that were never defined). Scenario variants (batch/TIN variants)
are intentionally dropped — recoverable from git history.

Stale local artifacts: `myinvois-test-cert.pem`, `myinvois-test-key.pem`,
`myinvois-enhanced-cert.pem`, `EMCQ_SDN_BHD.p12`.

## Scripts

- `test` → `vitest` (integration self-gates)
- `test:run` → `vitest run`
- `test:integration` → `RUN_INTEGRATION=true vitest run test/integration`

README's environment/testing sections are updated to match.
