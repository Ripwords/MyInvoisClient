# Intermediaries (TIN:ROB)

Intermediary systems act on behalf of represented taxpayers. See the official
[Login as Intermediary System](https://sdk.myinvois.hasil.gov.my/api/08-login-as-intermediary-system/)
documentation.

## Representing a taxpayer

Pass `onBehalfOf` when creating the client:

```typescript
const client = MyInvoisClient.create({
  // ...intermediary credentials...
  onBehalfOf: 'C1234567890',
})
```

`onBehalfOf` accepts either form the API supports:

- the taxpayer's **TIN** alone: `'C1234567890'`
- **TIN:ROB** — TIN and registration number joined by a colon:
  `'C1234567890:201901234567'` — when the taxpayer registered with both.

## Switching taxpayers at runtime

```typescript
await client.updateOnBehalfOf('C9876543210')
```

This logs in for the new taxpayer. Tokens are cached per represented taxpayer
(key `${clientId}:${onBehalfOf}`), so switching back to a previous taxpayer
reuses its token if still valid — and a login in flight during a switch can
never be credited to the wrong taxpayer.

With a shared [token store](/guide/rate-limiting#multi-process-deployments-injectable-stores),
per-TIN tokens also survive process boundaries and restarts.

## Proving TIN ownership

LHDN grants intermediary permission to your system as a whole, so it can't
tell which of your customers is asking. If customers type their own TIN, one
of them could type another customer's TIN. To prove a customer owns its TIN:

1. The customer registers an ERP system in its own MyInvois portal, which
   only someone controlling that taxpayer can do.
2. It gives you that client ID and secret, once.
3. You compare the TIN those credentials belong to with the TIN it claimed:

```typescript
import { getTaxpayerIdentity } from '@ripwords/myinvois-client'

const { tin } = await getTaxpayerIdentity({ clientId, clientSecret, environment: 'production' })
if (tin !== claimedTin.toUpperCase()) throw new Error(`These credentials belong to ${tin}`)
// Verified. The credentials can be discarded.
```
