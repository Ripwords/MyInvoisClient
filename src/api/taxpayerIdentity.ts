import { queueRequest, type RateLimitStore } from '../utils/apiQueue'
import { getBaseUrl } from '../utils/getBaseUrl'
import { platformLogin } from './platformLogin'

/** The taxpayer a MyInvois access token acts for, as LHDN put it in the token. */
export interface TaxpayerIdentity {
  /** `TaxpayerTIN`, trimmed and upper-cased. */
  tin: string
  /** The taxpayer's registered name, when the token carries one. */
  name?: string
  /** Whether these credentials belong to an intermediary system. */
  isIntermediary: boolean
}

/**
 * Reads the represented taxpayer from an LHDN access token (a JWT). The
 * signature is not checked: only pass a token that came straight from
 * LHDN's token endpoint. Throws when the token carries no `TaxpayerTIN`, so
 * an ownership check built on it fails closed.
 */
export function decodeTaxpayerIdentity(token: string): TaxpayerIdentity {
  const parts = token.split('.')
  let claims: unknown
  try {
    if (parts.length !== 3 || !parts[1]) throw new Error()
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    throw new Error('The MyInvois token is not a JWT; cannot read the taxpayer')
  }
  if (!claims || typeof claims !== 'object' || Array.isArray(claims))
    throw new Error('The MyInvois token has no claims; cannot read the taxpayer')

  const { TaxpayerTIN, name, IsIntermediary } = claims as Record<string, unknown>
  if (typeof TaxpayerTIN !== 'string' || !TaxpayerTIN.trim())
    throw new Error('The MyInvois token does not name a taxpayer (no TaxpayerTIN)')
  return {
    tin: TaxpayerTIN.trim().toUpperCase(),
    name: typeof name === 'string' ? name : undefined,
    isIntermediary: IsIntermediary === true || String(IsIntermediary).toLowerCase() === 'true',
  }
}

/**
 * Logs in once as a taxpayer system (no `onbehalfof`) and returns the
 * taxpayer the credentials belong to. Only someone who controls a
 * taxpayer's MyInvois account can register an ERP for it, so a match with a
 * claimed TIN proves the claimant controls that TIN. No certificate is
 * needed, and the token is not cached or returned.
 *
 * @example
 * ```typescript
 * const { tin } = await getTaxpayerIdentity({ clientId, clientSecret, environment: 'sandbox' })
 * if (tin !== claimedTin) throw new Error(`These credentials belong to ${tin}`)
 * ```
 */
export async function getTaxpayerIdentity(options: {
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'production'
  /** Shared limiter; the login counts against the client ID's taxpayer-login limit. */
  rateLimitStore?: RateLimitStore
  debug?: boolean
}): Promise<TaxpayerIdentity> {
  const { clientId, clientSecret, environment, rateLimitStore, debug = false } = options
  const { token } = await queueRequest(
    clientId,
    'loginTaxpayer',
    () => platformLogin({ clientId, clientSecret, baseUrl: getBaseUrl(environment), debug }),
    debug,
    rateLimitStore,
  )
  return decodeTaxpayerIdentity(token)
}
