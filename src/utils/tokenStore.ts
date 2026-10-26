/**
 * Pluggable access-token cache so multiple processes can share one login
 * (the official limit is 12 logins/min/clientId). The default is an
 * in-memory store scoped to a single client instance.
 */

export interface StoredToken {
  /** The bearer access token. */
  token: string
  /** Absolute expiry as epoch milliseconds. */
  expiresAt: number
}

/**
 * Keys are `${clientId}:${onBehalfOf ?? ''}`, so an intermediary caching
 * tokens for several taxpayers keeps one entry per represented TIN.
 */
export interface TokenStore {
  get(key: string): Promise<StoredToken | undefined>
  set(key: string, value: StoredToken): Promise<void>
}

export class InMemoryTokenStore implements TokenStore {
  private readonly tokens = new Map<string, StoredToken>()

  get(key: string): Promise<StoredToken | undefined> {
    return Promise.resolve(this.tokens.get(key))
  }

  set(key: string, value: StoredToken): Promise<void> {
    this.tokens.set(key, value)
    return Promise.resolve()
  }
}
