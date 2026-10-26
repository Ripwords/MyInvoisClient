import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  MyInvoisClient,
  InMemoryTokenStore,
  type RateLimitStore,
  type TokenStore,
  type StoredToken,
} from '../../src'
import { queueRequest } from '../../src/utils/apiQueue'
import { getTestCredentials } from '../fixtures/test-credentials'

const buildClient = (stores: {
  rateLimitStore?: RateLimitStore
  tokenStore?: TokenStore
}) => {
  const { certificatePem, privateKeyPem } = getTestCredentials()
  return MyInvoisClient.create({
    clientId: 'store-client',
    clientSecret: 'secret',
    environment: 'sandbox',
    certificatePem,
    privateKeyPem,
    debug: false,
    ...stores,
  })
}

/** Stub global fetch: answers logins with a token, everything else with 200. */
const stubFetch = () => {
  const mockFetch = vi.fn().mockImplementation((url: string) => {
    if (String(url).includes('/connect/token')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ access_token: 'fresh-token', expires_in: 3600 }),
      } as Response)
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response)
  })
  vi.stubGlobal('fetch', mockFetch)
  return mockFetch
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('injectable RateLimitStore', () => {
  it('queueRequest consults the injected store with the clientId:category key', async () => {
    const calls: Array<{ key: string; max: number; windowMs: number }> = []
    const store: RateLimitStore = {
      tryAcquire: (key, max, windowMs) => {
        calls.push({ key, max, windowMs })
        return Promise.resolve({ ok: true })
      },
    }

    const result = await queueRequest(
      'client-a',
      'searchTin',
      () => Promise.resolve('done'),
      false,
      store,
    )

    expect(result).toBe('done')
    expect(calls).toEqual([
      { key: 'client-a:searchTin', max: 60, windowMs: 60000 },
    ])
  })

  it('defers the task until retryAfterMs when the store refuses a slot', async () => {
    vi.useFakeTimers()
    let refusals = 1
    const store: RateLimitStore = {
      tryAcquire: () => {
        if (refusals > 0) {
          refusals--
          return Promise.resolve({ ok: false, retryAfterMs: 1000 })
        }
        return Promise.resolve({ ok: true })
      },
    }

    let executed = false
    const promise = queueRequest(
      'client-b',
      'searchTin',
      () => {
        executed = true
        return Promise.resolve('late')
      },
      false,
      store,
    )

    await vi.runAllTicks()
    expect(executed).toBe(false)

    // Retry fires at retryAfterMs + 50ms timer buffer
    await vi.advanceTimersByTimeAsync(1100)
    await expect(promise).resolves.toBe('late')
    expect(executed).toBe(true)
  })

  it('client API calls flow through the injected rate-limit store', async () => {
    stubFetch()
    const keys: string[] = []
    const store: RateLimitStore = {
      tryAcquire: key => {
        keys.push(key)
        return Promise.resolve({ ok: true })
      },
    }

    const client = buildClient({ rateLimitStore: store })
    await client.verifyTin('C26135266000', 'BRN', '201901030382')

    // Login + the validation call both went through the injected store
    expect(keys).toContain('store-client:loginTaxpayer')
    expect(keys).toContain('store-client:searchTin')
  })
})

describe('injectable TokenStore', () => {
  it('skips login when the store already holds a token valid beyond the margin', async () => {
    const mockFetch = stubFetch()
    const tokenStore = new InMemoryTokenStore()
    await tokenStore.set('store-client:', {
      token: 'stored-token',
      expiresAt: Date.now() + 3600_000,
    })

    const client = buildClient({ tokenStore })
    await client.verifyTin('C26135266000', 'BRN', '201901030382')

    const loginCalls = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes('/connect/token'),
    )
    expect(loginCalls).toHaveLength(0)
    // The stored token was sent on the wire
    const [, options] = mockFetch.mock.calls[0]! as [string, RequestInit]
    expect((options.headers as Record<string, string>).Authorization).toBe(
      'Bearer stored-token',
    )
  })

  it('refreshes and writes to the store when the token is inside the expiry margin', async () => {
    const mockFetch = stubFetch()
    const written: Array<{ key: string; value: StoredToken }> = []
    const tokenStore: TokenStore = {
      // 30s left — inside the 60s refresh margin
      get: () =>
        Promise.resolve({
          token: 'stale-token',
          expiresAt: Date.now() + 30_000,
        }),
      set: (key, value) => {
        written.push({ key, value })
        return Promise.resolve()
      },
    }

    const client = buildClient({ tokenStore })
    await client.verifyTin('C26135266000', 'BRN', '201901030382')

    const loginCalls = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes('/connect/token'),
    )
    expect(loginCalls).toHaveLength(1)
    expect(written).toHaveLength(1)
    expect(written[0]!.key).toBe('store-client:')
    expect(written[0]!.value.token).toBe('fresh-token')
    expect(written[0]!.value.expiresAt).toBeGreaterThan(Date.now())
  })

  it('a shared store lets a second client reuse the first login', async () => {
    const mockFetch = stubFetch()
    const shared = new InMemoryTokenStore()

    const first = buildClient({ tokenStore: shared })
    await first.verifyTin('C26135266000', 'BRN', '201901030382')

    const second = buildClient({ tokenStore: shared })
    await second.verifyTin('C26135266000', 'BRN', '201901030382')

    const loginCalls = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes('/connect/token'),
    )
    expect(loginCalls).toHaveLength(1)
  })
})
