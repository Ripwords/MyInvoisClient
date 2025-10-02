import type { ClientCredentials, TokenResponse } from '../types'

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
      let errorBody: unknown
      try {
        errorBody = await response.json()
      } catch {
        /* ignored */
      }

      const errorMessage =
        typeof errorBody === 'object' &&
        errorBody !== null &&
        'error_description' in errorBody
          ? (errorBody as { error_description: string }).error_description
          : `Platform login failed with status ${response.status}`

      throw new Error(errorMessage)
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
