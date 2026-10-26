import type { ClientCredentials, TokenResponse } from '../types'
import { MyInvoisApiError, toApiError } from '../errors'

const oauthErrorDescription = (body: string): string | undefined => {
  try {
    const description = JSON.parse(body)?.error_description
    return typeof description === 'string' ? description : undefined
  } catch {
    return undefined
  }
}

export const platformLogin = async (
  client: ClientCredentials,
): Promise<{
  token: string
  tokenExpiration: Date
}> => {
  const { clientId, clientSecret, baseUrl, onBehalfOf, debug } = client
  try {
    const response = await fetch(`${baseUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(onBehalfOf ? { onbehalfof: onBehalfOf } : {}),
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'InvoicingAPI',
      }),
    })

    // If authentication fails, surface the error details immediately
    if (!response.ok) {
      const error = await toApiError(response, 'log in')
      // OAuth errors carry the useful text in `error_description`
      // (e.g. "invalid_client"); use it as the message. A 429 keeps its
      // MyInvoisRateLimitError type.
      const description = oauthErrorDescription(error.body)
      throw description && error.status !== 429
        ? new MyInvoisApiError(description, error.status, error.body)
        : error
    }

    const tokenResponse: TokenResponse = await response.json()

    if (!tokenResponse.access_token) {
      throw new Error('Platform login response did not include an access_token')
    }

    return {
      token: tokenResponse.access_token,
      tokenExpiration: new Date(Date.now() + tokenResponse.expires_in * 1000),
    }
  } catch (error) {
    if (debug) console.error(error)
    throw error
  }
}
