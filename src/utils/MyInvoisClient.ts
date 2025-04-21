import { getBaseUrl } from './getBaseUrl'
import { platformLogin } from '../api/platform/platformLogin'

export class MyInvoisClient {
  private readonly baseUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly onBehalfOf?: string
  private readonly debug: boolean
  private token = ''
  private tokenExpiration: Date | undefined

  constructor(
    clientId: string,
    clientSecret: string,
    environment: 'sandbox' | 'production',
    onBehalfOf?: string,
    debug?: boolean,
  ) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.baseUrl = getBaseUrl(environment)
    this.debug = (debug ?? process.env.MYINVOIS_DEBUG === 'true') ? true : false
    this.onBehalfOf = onBehalfOf
  }

  private async refreshToken() {
    const tokenResponse = await platformLogin({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      baseUrl: this.baseUrl,
      onBehalfOf: this.onBehalfOf,
      debug: this.debug,
    })

    this.token = tokenResponse.token
    this.tokenExpiration = tokenResponse.tokenExpiration
  }

  private async getToken() {
    if (!this.tokenExpiration || this.tokenExpiration < new Date()) {
      if (this.debug) {
        console.log('Refreshing token')
      }
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
   * @returns true if the TIN is valid, false otherwise
   */
  async verifyTin(tin: string, nric: string): Promise<boolean> {
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
      if (this.debug) {
        console.error(error)
      }
      return false
    }
  }
}
