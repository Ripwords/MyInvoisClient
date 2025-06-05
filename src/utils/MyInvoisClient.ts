import { EInvoiceTypeCode } from 'src/types'
import { platformLogin } from '../api/platform/platformLogin'
import type {
  DocumentStatus,
  InvoiceV1_1,
} from '../types/documents/invoice-1_1.d.ts'
import { getBaseUrl } from './getBaseUrl'
import {
  createSigningCredentials,
  encodeDocumentForSubmission,
  generateDocumentHash,
  generateSignedInvoiceXML,
} from './invoice1-1'

import type {
  DocumentSummary,
  DocumentValidationResult,
  DocumentValidationStepResult,
  GetSubmissionResponse,
  SubmissionResponse,
  SubmissionStatus,
} from '../types/documents/invoice-1_1.d.ts'

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

  /**
   * Submits one or more e-invoice documents to the MyInvois platform for processing.
   *
   * This method digitally signs each document using the provided certificate and private key,
   * generates document hashes, encodes them for submission, and sends them to the platform.
   * The method includes comprehensive validation warnings for document size and count limits.
   *
   * @param documents - Array of InvoiceV1_1 documents to be submitted
   * @returns Promise resolving to submission response containing the submission data and HTTP status
   * @throws {Error} If PRIVATE_KEY or CERTIFICATE environment variables are missing
   * @throws {Error} If document signing, encoding, or API submission fails
   *
   * @example
   * ```typescript
   * // Submit a single invoice
   * const result = await client.submitDocument([invoiceData]);
   * console.log(result.data.submissionUid); // Track submission with this UID
   *
   * // Submit multiple invoices
   * const result = await client.submitDocument([invoice1, invoice2, invoice3]);
   * if (result.status === 202) {
   *   console.log('Documents submitted successfully');
   * }
   * ```
   *
   * @remarks
   * - Requires PRIVATE_KEY and CERTIFICATE environment variables for document signing
   * - Each document is digitally signed with XML-DSIG before submission
   * - Documents are base64-encoded for transmission
   * - API limits: Max 100 documents per submission, 5MB total payload, 300KB per document
   * - Debug mode provides detailed logging of payload sizes and validation warnings
   * - Returns HTTP 202 for successful submissions that require processing
   */
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

  async getSubmissionStatus(
    submissionUid: string,
    pollInterval: number = 1000,
    maxRetries: number = 10,
  ): Promise<{
    status: SubmissionStatus
    documentSummary?: DocumentSummary[]
    error?: {
      code: string
      message: string | null
      target: string
      details: {
        code: string
        message: string
        target: string
      }[]
    }
  }> {
    try {
      const response = await this.fetch(
        `/api/v1.0/documentsubmissions/${submissionUid}`,
      )

      const data = (await response.json()) as GetSubmissionResponse

      if (this.debug) {
        console.log('Submission:', data)
        if (data.error) {
          console.log('Submission error details:', data.error.details)
        }
      }

      // If we have a successful response and status is completed, return success
      if (data.overallStatus === 'Valid') {
        return {
          status: data.overallStatus,
          documentSummary: data.documentSummary,
        }
      }
      if (data.overallStatus === 'Invalid') {
        return {
          status: 'Invalid',
          documentSummary: data.documentSummary,
        }
      }

      // If we have retries left, continue polling for any non-completed status or errors
      if (maxRetries > 0) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        return await this.getSubmissionStatus(
          submissionUid,
          pollInterval,
          maxRetries - 1,
        )
      }

      // No retries left - return timeout
      return {
        status: 'Invalid',
        error: {
          code: 'Timeout',
          message: 'Submission timed out',
          target: 'submission',
          details: [],
        },
      }
    } catch (error) {
      // Handle any request errors by retrying if we have retries left
      if (maxRetries > 0) {
        if (this.debug) {
          console.log('Request error, retrying...', error)
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        return await this.getSubmissionStatus(
          submissionUid,
          pollInterval,
          maxRetries - 1,
        )
      }

      // No retries left - return timeout
      return {
        status: 'Invalid',
        error: {
          code: 'Timeout',
          message: 'Submission timed out after request errors',
          target: 'submission',
          details: [],
        },
      }
    }
  }

  /**
   * Retrieves a document by its unique identifier with the raw document content.
   *
   * @param documentUid - The unique identifier of the document to retrieve
   * @returns Promise resolving to document summary with raw document content as a string
   * @throws {Error} If the document is not found or request fails
   *
   * @example
   * ```typescript
   * const document = await client.getDocument('doc-uuid-123');
   * console.log(document.document); // Raw XML/JSON content
   * console.log(document.uuid); // Document UUID
   * ```
   */
  async getDocument(
    documentUid: string,
  ): Promise<DocumentSummary & { document: string }> {
    const response = await this.fetch(`/api/v1.0/documents/${documentUid}/raw`)

    const data = await response.json()

    return data as DocumentSummary & { document: string }
  }

  /**
   * Retrieves detailed information about a document including validation results.
   *
   * @param documentUid - The unique identifier of the document to get details for
   * @returns Promise resolving to document summary with detailed validation results
   * @throws {Error} If the document is not found or request fails
   *
   * @example
   * ```typescript
   * const details = await client.getDocumentDetails('doc-uuid-123');
   * console.log(details.validationResults.status); // 'Valid' | 'Invalid' | 'Processing'
   * console.log(details.validationResults.validationSteps); // Array of validation step results
   * ```
   */
  async getDocumentDetails(documentUid: string): Promise<
    DocumentSummary & {
      validationResults: {
        status: DocumentValidationResult
        validationSteps: DocumentValidationStepResult[]
      }
    }
  > {
    const response = await this.fetch(
      `/api/v1.0/documents/${documentUid}/details`,
    )

    const data = (await response.json()) as DocumentSummary & {
      validationResults: {
        status: DocumentValidationResult
        validationSteps: DocumentValidationStepResult[]
      }
    }

    return data
  }

  /**
   * Searches for documents based on various filter criteria.
   *
   * @param params - Search parameters object
   * @param params.uuid - Optional specific document UUID to search for
   * @param params.submissionDateFrom - Required start date for submission date range (ISO date string)
   * @param params.submissionDateTo - Optional end date for submission date range (ISO date string)
   * @param params.pageSize - Optional number of results per page (default handled by API)
   * @param params.pageNo - Optional page number for pagination (0-based)
   * @param params.issueDateFrom - Optional start date for issue date range (ISO date string)
   * @param params.issueDateTo - Optional end date for issue date range (ISO date string)
   * @param params.invoiceDirection - Optional filter by invoice direction ('Sent' or 'Received')
   * @param params.status - Optional filter by document status
   * @param params.documentType - Optional filter by e-invoice type code
   * @param params.searchQuery - Optional text search across uuid, buyerTIN, supplierTIN, buyerName, supplierName, internalID, total
   * @returns Promise resolving to array of document summaries matching the search criteria
   * @throws {Error} If the search request fails
   *
   * @example
   * ```typescript
   * // Search for documents submitted in the last 30 days
   * const documents = await client.searchDocuments({
   *   submissionDateFrom: '2024-01-01',
   *   submissionDateTo: '2024-01-31',
   *   status: 'Valid',
   *   pageSize: 10
   * });
   *
   * // Search by supplier name
   * const supplierDocs = await client.searchDocuments({
   *   submissionDateFrom: '2024-01-01',
   *   searchQuery: 'ACME Corp',
   *   invoiceDirection: 'Received'
   * });
   * ```
   */
  async searchDocuments({
    uuid,
    submissionDateFrom,
    submissionDateTo,
    pageSize,
    pageNo,
    issueDateFrom,
    issueDateTo,
    invoiceDirection,
    status,
    documentType,
    searchQuery,
  }: {
    uuid?: string
    submissionDateFrom: string
    submissionDateTo?: string
    pageSize?: number
    pageNo?: number
    issueDateFrom?: string
    issueDateTo?: string
    invoiceDirection?: 'Sent' | 'Received'
    status?: DocumentStatus
    documentType?: EInvoiceTypeCode
    searchQuery?: string // Search by uuid, buyerTIN, supplierTIN, buyerName, supplierName, internalID, total
  }): Promise<DocumentSummary[]> {
    const queryParams = new URLSearchParams()

    if (uuid) queryParams.set('uuid', uuid)
    if (submissionDateFrom)
      queryParams.set('submissionDateFrom', submissionDateFrom)
    if (submissionDateTo) queryParams.set('submissionDateTo', submissionDateTo)
    if (pageSize) queryParams.set('pageSize', pageSize.toString())
    if (pageNo) queryParams.set('pageNo', pageNo.toString())
    if (issueDateFrom) queryParams.set('issueDateFrom', issueDateFrom)
    if (issueDateTo) queryParams.set('issueDateTo', issueDateTo)
    if (invoiceDirection) queryParams.set('invoiceDirection', invoiceDirection)
    if (status) queryParams.set('status', status)
    if (documentType) queryParams.set('documentType', documentType)
    if (searchQuery) queryParams.set('searchQuery', searchQuery)

    const response = await this.fetch(
      `/api/v1.0/documents/search?${queryParams.toString()}`,
    )

    const data = (await response.json()) as DocumentSummary[]

    return data
  }
}
