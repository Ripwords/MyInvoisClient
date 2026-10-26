# Rate Limiting & Stores

The client includes a built-in, per-`clientId` request queue that proactively
keeps each API category within the limits documented in the official
[integration practices](https://sdk.myinvois.hasil.gov.my/integration-practices/):

| Category | Limit (per 60s) |
|---|---|
| Login (taxpayer / intermediary) | 12 |
| Submit documents | 100 |
| Get submission | 300 |
| Cancel / reject document | 12 |
| Get document | 60 |
| Get document details | 125 |
| Get recent documents | 12 |
| Search documents | 12 |
| Search / validate TIN | 60 |
| Taxpayer QR code | 60 |

Requests that would exceed a category's limit are queued and released as the
sliding window frees up — fire calls freely and the queue paces them.

## Automatic 429 back-off

If the API still answers 429 (e.g. other processes share your client ID), the
client waits as instructed by the `Retry-After` header — seconds or HTTP-date,
5s when absent, capped at `maxDelayMs` — and retries through the limiter:

```typescript
const client = MyInvoisClient.create({
  // ...credentials...
  retryOn429: { maxRetries: 2, maxDelayMs: 60_000 }, // the defaults
  // retryOn429: false — disable and receive 429 responses raw
})
```

## Multi-process deployments: injectable stores

By default the rate-limit window and the token cache live in process memory.
Horizontally-scaled deployments (clusters, serverless, multiple pods) can back
both with shared storage:

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

- `tryAcquire` must be atomic across processes. Pending requests and retry
  timers stay in-process; the shared store only decides whether a slot is free.
- A shared `tokenStore` means one login serves all workers (the official limit
  is 12 logins/min per client ID) and tokens survive restarts.
- Defaults: `InMemoryRateLimitStore` (shared per process, keyed by clientId)
  and an in-memory token store per client instance — both exported if you want
  to compose them.

## Token handling

Logins go through the limiter; concurrent requests share a single in-flight
refresh per represented taxpayer; tokens are reused until 60 seconds before
expiry. Cache and reuse one client instance per credential set rather than
constructing clients per request.
