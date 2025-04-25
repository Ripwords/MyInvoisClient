import * as crypto from 'crypto'
import { InvoiceV1_1 } from 'src/types'
import { platformLogin } from '../api/platform/platformLogin'
import { encodeToBase64 } from '../utils/base64'
import { getBaseUrl } from '../utils/getBaseUrl'
import { transformInvoiceToDocument } from './transformers/invoiceToDocument'

/**
 * Response from document submission
 */
export interface SubmitDocumentResponse {
  /**
   * Response code indicating the status of the submission
   */
  code: string

  /**
   * Human-readable message describing the result
   */
  message: string

  /**
   * Unique identifier assigned to the submitted document
   */
  documentId?: string
}

/**
 * Error details returned from the API
 */
export interface ApiError {
  code: string
  message: string
  details?: string[]
}

/**
 * Options for document submission
 */
export interface SubmitDocumentOptions {
  /**
   * Additional headers to include in the request
   */
  additionalHeaders?: Record<string, string>
}

/**
 * MyInvois client for interacting with the Malaysian e-Invoicing API
 */
export class MyInvoisClient {
  private readonly baseUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly onBehalfOf?: string
  private readonly debug: boolean
  private token = ''
  private tokenExpiration: Date | undefined

  /**
   * Creates a new instance of the MyInvoisClient
   *
   * @param clientId - Client ID provided by LHDN for API access
   * @param clientSecret - Client Secret provided by LHDN for API access
   * @param environment - API environment ('sandbox' or 'production')
   * @param onBehalfOf - Optional identifier for acting on behalf of another entity
   * @param debug - Enable debug logging (defaults to false)
   */
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

  /**
   * Refreshes the authentication token
   * @private
   */
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

  /**
   * Gets a valid authentication token, refreshing if necessary
   * @private
   */
  private async getToken() {
    if (!this.tokenExpiration || this.tokenExpiration < new Date()) {
      if (this.debug) {
        console.log('Refreshing token')
      }
      await this.refreshToken()
    }

    return this.token
  }

  /**
   * Makes an authenticated fetch request to the API
   * @private
   */
  private async fetch<T = any>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await this.getToken()

    const url = `${this.baseUrl}${path}`

    if (this.debug) {
      console.log(`Making request to ${url}`, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: 'Bearer **********', // Hide the actual token in logs
        },
      })
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorBody = await response.json()
      console.log(JSON.stringify(errorBody, null, 2))
      throw new Error(errorBody.error)
    }

    return (await response.json()) as T
  }

  /**
   * Submits a document to the MyInvois API
   *
   * @param document - Document string (XML or JSON)
   * @param format - Format of the document ('xml' or 'json')
   * @param options - Options for document submission
   * @returns Promise resolving to the submission response
   * @throws Error if the submission fails
   */
  public async submitDocument(
    document: string | object,
    codeNumber: string,
    format: 'xml' | 'json' = 'json',
    options: SubmitDocumentOptions = {},
  ): Promise<SubmitDocumentResponse> {
    try {
      // Prepare the document string
      let documentString: string

      if (typeof document === 'object') {
        // If document is an object, stringify it
        documentString = JSON.stringify(document)
      } else {
        // Use the document string as is
        documentString = document
      }

      // Encode the document to Base64
      const base64Document = encodeToBase64(documentString)

      const hash = crypto.createHash('sha256')
      hash.update(base64Document, 'utf8')
      const documentHash = hash.digest('base64')
      // Prepare request body
      const requestBody = {
        documents: [
          {
            format,
            codeNumber,
            documentHash,
            document: base64Document,
          },
        ],
      }

      if (this.debug) {
        console.log(`Submitting ${format} document to API`)
      }

      // Submit the document
      const response = await this.fetch<SubmitDocumentResponse>(
        '/api/v1.0/documentsubmissions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.additionalHeaders,
          },
          body: JSON.stringify(requestBody),
        },
      )

      if (this.debug) {
        console.log('Document submission response:', response)
      }

      return response
    } catch (error) {
      if (this.debug) {
        console.error('Error submitting document:', error)
      }
      throw error
    }
  }

  /**
   * Submits a JSON invoice to the MyInvois API
   *
   * @param jsonInvoice - Invoice data in JSON format
   * @param options - Options for document submission
   * @returns Promise resolving to the submission response
   */
  public async submitJsonInvoice(
    invoice: InvoiceV1_1,
    codeNumber: string = '',
    options: SubmitDocumentOptions = {},
  ): Promise<SubmitDocumentResponse> {
    // Use the code number from the invoice if not provided as parameter
    const invoiceCodeNumber = codeNumber || invoice.eInvoiceCodeOrNumber

    // Transform the InvoiceV1_1 format to the nested array document format
    const transformedDocument = transformInvoiceToDocument(invoice)

    if (this.debug) {
      console.log(
        'Transformed document:',
        JSON.stringify(transformedDocument, null, 2),
      )
    }

    // Submit the transformed document
    return await this.submitDocument(
      transformedDocument,
      invoiceCodeNumber,
      'json',
      options,
    )
  }

  /**
   * Submits multiple JSON invoices to the MyInvois API
   *
   * @param jsonInvoices - Array of invoice data in JSON format
   * @param options - Options for document submission
   * @returns Promise resolving to an array of submission responses
   */
  // public async submitMultipleJsonInvoices(
  //   jsonInvoices: Record<string, any>[],
  //   options: SubmitDocumentOptions = {},
  // ): Promise<SubmitDocumentResponse[]> {
  //   const results: SubmitDocumentResponse[] = []

  //   for (const jsonInvoice of jsonInvoices) {
  //     try {
  //       const result = await this.submitJsonInvoice(jsonInvoice, '', options)
  //       results.push(result)
  //     } catch (error) {
  //       if (this.debug) {
  //         console.error('Error submitting JSON invoice in batch:', error)
  //       }

  //       // Add failed response to results
  //       results.push({
  //         code: 'ERROR',
  //         message:
  //           error instanceof Error
  //             ? error.message
  //             : 'Unknown error during invoice submission',
  //       })
  //     }
  //   }

  //   return results
  // }

  /**
   * Validates a TIN against a NRIC
   *
   * @param tin - Tax Identification Number
   * @param nric - National Registration Identity Card number
   * @returns true if the TIN is valid, false otherwise
   */
  public async verifyTin(tin: string, nric: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1.0/taxpayer/validate/${tin}?idType=NRIC&idValue=${nric}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${await this.getToken()}`,
          },
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

  /**
   * Get invoice status by document ID
   *
   * @param documentId - The document ID returned from submitDocument
   * @returns Status information for the document
   */
  public async getInvoiceStatus(documentId: string): Promise<any> {
    try {
      if (this.debug) {
        console.log(`Getting status for document: ${documentId}`)
      }

      const response = await this.fetch(
        `/api/v1.0/document/status/${documentId}`,
        {
          method: 'GET',
        },
      )

      return response
    } catch (error) {
      if (this.debug) {
        console.error('Error getting invoice status:', error)
      }
      throw error
    }
  }
}
