import { getBaseUrl } from './getBaseUrl'
import { platformLogin } from '../api/platform/platformLogin'
import {
  createSigningCredentials,
  encodeDocumentForSubmission,
  generateDocumentHash,
  generateSignedInvoiceXML,
  SubmissionResponse,
} from './invoice1-1'
import type { InvoiceV1_1 } from '../types/documents/invoice-1_1.d.ts'

export class MyInvoisClient {
  private readonly baseUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly onBehalfOf?: string
  private readonly debug: boolean
  private token = ''
  private tokenExpiration: Date | undefined = undefined

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
    if (
      !this.tokenExpiration ||
      this.tokenExpiration < new Date() ||
      isNaN(this.tokenExpiration.getTime())
    ) {
      if (this.debug) {
        console.log('Token expired')
      }
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
   * Validates a TIN against a NRIC/ARMY/PASSPORT/BRN (Business Registration Number)
   *
   * @param tin - The TIN to validate
   * @param idType - The type of ID to validate against
   * @param idValue - The value of the ID to validate against
   * @returns true if the TIN is valid, false otherwise
   */
  async verifyTin(
    tin: string,
    idType: 'NRIC' | 'ARMY' | 'PASSPORT' | 'BRN',
    idValue: string,
  ): Promise<boolean> {
    try {
      const response = await this.fetch(
        `/api/v1.0/taxpayer/validate/${tin}?idType=${idType}&idValue=${idValue}`,
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

  async submitDocument(documents: InvoiceV1_1[]): Promise<{
    data: SubmissionResponse
    status: number
  }> {
    // Check if basic signing credentials are available
    if (!process.env.PRIVATE_KEY || !process.env.CERTIFICATE) {
      throw new Error(
        'Missing required environment variables: PRIVATE_KEY and CERTIFICATE',
      )
    }

    const signingCredentials = createSigningCredentials(
      process.env.CERTIFICATE!,
      process.env.PRIVATE_KEY!,
    )

    const signedDocuments = await Promise.all(
      documents.map(async d => {
        const signedXML = await generateSignedInvoiceXML(d, signingCredentials)
        const documentHash = generateDocumentHash(signedXML)
        const base64Document = encodeDocumentForSubmission(signedXML)

        return {
          format: 'XML',
          document: base64Document,
          documentHash,
          codeNumber: d.eInvoiceCodeOrNumber,
        }
      }),
    )

    try {
      const payload = { documents: signedDocuments }

      if (this.debug) {
        console.log('Submitting payload structure:')
        console.log(
          JSON.stringify(
            {
              documents: signedDocuments.map(doc => ({
                format: doc.format,
                codeNumber: doc.codeNumber,
                documentHash: doc.documentHash,
                documentSize: doc.document.length,
              })),
            },
            null,
            2,
          ),
        )

        // Additional debugging information
        const totalSize = JSON.stringify(payload).length
        console.log(
          `Total payload size: ${totalSize} bytes (${(totalSize / 1024 / 1024).toFixed(2)} MB)`,
        )
        console.log(`Number of documents: ${signedDocuments.length}`)

        signedDocuments.forEach((doc, index) => {
          const docSize = Buffer.from(doc.document, 'base64').length
          console.log(
            `Document ${index + 1}: ${docSize} bytes (${(docSize / 1024).toFixed(2)} KB)`,
          )
        })

        // Check against MyInvois limits
        if (totalSize > 5 * 1024 * 1024) {
          console.warn('⚠️  WARNING: Payload exceeds 5MB limit!')
        }
        if (signedDocuments.length > 100) {
          console.warn('⚠️  WARNING: More than 100 documents in submission!')
        }
        signedDocuments.forEach((doc, index) => {
          const docSize = Buffer.from(doc.document, 'base64').length
          if (docSize > 300 * 1024) {
            console.warn(
              `⚠️  WARNING: Document ${index + 1} exceeds 300KB limit!`,
            )
          }
        })
      }

      const response = await this.fetch(`/api/v1.0/documentsubmissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseBody = await response.json()

      if (this.debug) {
        console.log('API Response Status:', response.status)
        console.log(
          'API Response Headers:',
          Object.fromEntries(response.headers.entries()),
        )
      }

      return {
        data: responseBody as SubmissionResponse,
        status: response.status,
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}
