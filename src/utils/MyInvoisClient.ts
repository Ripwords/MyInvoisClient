import { ofetch } from 'ofetch'

interface TokenResponse {
  access_token: string
  expires_in: number
}

export class MyInvoisClient {
  private readonly baseUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private token = ''
  private tokenExpiration = new Date()

  constructor(
    clientId: string,
    clientSecret: string,
    environment: 'sandbox' | 'production',
  ) {
    this.clientId = clientId
    this.clientSecret = clientSecret

    if (environment === 'sandbox') {
      this.baseUrl = 'https://preprod-mytax.hasil.gov.my/'
    } else {
      this.baseUrl = 'https://mytax.hasil.gov.my'
    }
  }

  private async refreshToken() {
    const tokenResponse = await ofetch<TokenResponse>(
      `${this.baseUrl}/connect/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'InvoicingAPI',
        },
      },
    )

    this.token = tokenResponse.access_token
    this.tokenExpiration = new Date(
      Date.now() + tokenResponse.expires_in * 1000,
    )
  }

  private async getToken() {
    if (this.tokenExpiration < new Date()) {
      await this.refreshToken()
    }

    return this.token
  }

  private async fetch<T>(
    path: string,
    options: Parameters<typeof ofetch>[1] = {},
  ) {
    const token = await this.getToken()

    return ofetch<T>(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
      responseType: 'json',
    })
  }

  async verifyTin(tin: string, nric: string) {
    try {
      await this.fetch<void>(
        `/api/v1.0/taxpayer/validate/${tin}?idType=NRIC&idValue=${nric}`,
        {
          method: 'GET',
        },
      )

      return true
    } catch {
      return false
    }
  }
}
