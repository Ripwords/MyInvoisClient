---
layout: home

hero:
  name: MyInvois Client
  text: Malaysia e-invoicing for TypeScript
  tagline: Document building, XAdES (JSON) signing, submission, polling, taxpayer validation and built-in rate limiting for the LHDN MyInvois API.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: Official LHDN SDK Docs
      link: https://sdk.myinvois.hasil.gov.my/

features:
  - title: Full submission pipeline
    details: Build UBL-in-JSON documents, sign them with XAdES, submit, poll to a terminal status, cancel or reject — one typed client for the whole flow.
  - title: Sign once, store, submit
    details: buildSignedDocuments returns the exact wire bytes and hash so you can store the payload and resubmit it byte-for-byte — perfect audit trails.
  - title: Rate limiting built in
    details: A per-clientId sliding-window queue keeps every call inside the official limits, with automatic 429 Retry-After back-off and injectable stores for multi-process deployments.
  - title: Typed against the official spec
    details: Every code list (MSIC, UOM, currencies, states…) is a TypeScript union generated from the official SDK tables, plus runtime arrays under the /codes subpath.
---

## Install

```bash
npm install @ripwords/myinvois-client
# or: bun add / pnpm add / yarn add @ripwords/myinvois-client
```

## At a glance

```typescript
import { MyInvoisClient } from '@ripwords/myinvois-client'

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

> **Scope:** Malaysia MyInvois only. Singapore's InvoiceNow / Peppol e-invoicing is a different system and out of scope.
>
> **Agents:** a machine-readable summary of this site lives at [llms.txt](/llms.txt).
