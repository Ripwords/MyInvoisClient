import type { ClientCredentials, TokenResponse } from 'src/types'

export const taxpayerLogin = async (client: ClientCredentials) => {
  const { clientId, clientSecret, baseUrl, debug } = client
  try {
    const response = await fetch(`${baseUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'InvoicingAPI',
      }),
    })

    const tokenResponse: TokenResponse = await response.json()
    return {
      token: tokenResponse.access_token,
      tokenExpiration: new Date(Date.now() + tokenResponse.expires_in * 1000),
    }
  } catch (error) {
    if (debug) console.error(error)
    throw error
  }
}
