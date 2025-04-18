interface TokenResponse {
  access_token: string
  expires_in: number
}

export class MyInvoisClient {
  private readonly baseUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private token = ''
  private tokenExpiration: Date | undefined

  constructor(
    clientId: string,
    clientSecret: string,
    environment: 'sandbox' | 'production',
  ) {
    this.clientId = clientId
    this.clientSecret = clientSecret

    if (environment === 'sandbox') {
      this.baseUrl = 'https://preprod-api.myinvois.hasil.gov.my'
    } else {
      this.baseUrl = 'https://api.myinvois.hasil.gov.my'
    }
  }

  private async refreshToken() {
    try {
      const response = await fetch(`${this.baseUrl}/connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'InvoicingAPI',
        }),
      })

      const tokenResponse: TokenResponse = await response.json()

      this.token = tokenResponse.access_token
      this.tokenExpiration = new Date(
        Date.now() + tokenResponse.expires_in * 1000,
      )
    } catch (error) {
      console.error(error)
    }
  }

  private async getToken() {
    if (!this.tokenExpiration || this.tokenExpiration < new Date()) {
      await this.refreshToken()
    }

    return this.token
  }

  private async fetch(path: string, options: Parameters<typeof fetch>[1] = {}) {
    const token = await this.getToken()

    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    })
  }

  /**
   * Validates a TIN against a NRIC
   *
   * @param tin
   * @param nric
   * @returns
   */
  async verifyTin(tin: string, nric: string) {
    try {
      const response = await this.fetch(
        `/api/v1.0/taxpayer/validate/${tin}?idType=NRIC&idValue=${nric}`,
        {
          method: 'GET',
        },
      )

      if (response.status === 200) {
        return true
      }

      return false
    } catch (error) {
      console.error(error)
      return false
    }
  }
}
