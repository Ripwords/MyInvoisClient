import {
  DocumentStatus,
  DocumentSummary,
  DocumentTypeResponse,
  DocumentTypesResponse,
  DocumentTypeVersionResponse,
  DocumentValidationResult,
  DocumentValidationStepResult,
  EInvoiceTypeCode,
  NotificationResponse,
  NotificationSearchParams,
  RegistrationType,
  SigningCredentials,
  StandardError,
  SubmissionResponse,
  SubmissionStatus,
  TaxpayerQRCodeResponse,
  TinSearchParams,
  TinSearchResponse,
  AllDocumentsV1_1,
} from './types'

import * as DocumentManagementAPI from './api/documentManagement'
import * as DocumentSubmissionAPI from './api/documentSubmission'
import * as DocumentTypeManagementAPI from './api/documentTypeManagement'
import * as NotificationManagementAPI from './api/notificationManagement'
import { platformLogin } from './api/platformLogin'
import * as TaxpayerValidationAPI from './api/taxpayerValidation'
import {
  extractCertificateInfo,
  validateKeyPair,
  getPemFromP12,
} from './utils/certificate'
import { getBaseUrl } from './utils/getBaseUrl'
import { queueRequest, categorizeRequest } from './utils/apiQueue'

export type * from './types/index.d.ts'
export class MyInvoisClient {
  private readonly baseUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly environment: 'sandbox' | 'production'
  private onBehalfOf?: string
  private readonly signingCredentials: SigningCredentials
  private readonly debug: boolean
  private token = ''
  private tokenExpiration: Date | undefined = undefined

  constructor(
    clientId: string,
    clientSecret: string,
    environment: 'sandbox' | 'production',
    certificatePem: string,
    privateKeyPem: string,
    onBehalfOf?: string,
    debug?: boolean,
  ) {
    // Check if basic signing credentials are available
    if (!privateKeyPem || !certificatePem) {
      throw new Error(
        'Missing required environment variables: PRIVATE_KEY and CERTIFICATE',
      )
    }

    // Validate that the key pair matches
    if (!validateKeyPair(certificatePem, privateKeyPem)) {
      throw new Error('Certificate and private key do not match')
    }

    this.clientId = clientId
    this.clientSecret = clientSecret
    this.baseUrl = getBaseUrl(environment)
    this.environment = environment
    this.onBehalfOf = onBehalfOf
    this.debug = (debug ?? process.env.MYINVOIS_DEBUG === 'true') ? true : false

    // Extract certificate information
    const { issuerName, serialNumber } = extractCertificateInfo(certificatePem)

    this.signingCredentials = {
      privateKeyPem,
      certificatePem,
      issuerName,
      serialNumber,
    }
  }

  async updateOnBehalfOf(onBehalfOf: string): Promise<void> {
    this.onBehalfOf = onBehalfOf
    await this.refreshToken()
    return
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
        console.log('Refreshing token')
      }
      await this.refreshToken()
    }

    return this.token
  }

  private async fetch(path: string, options: Parameters<typeof fetch>[1] = {}) {
    const token = await this.getToken()

    // Dynamically categorise the request and enqueue it so we never exceed the
    // vendor-specified rate-limits. If the path isn't recognised it will fall
    // back to the `default` category which has a very high allowance.

    const category = categorizeRequest(
      path,
      options?.method as string | undefined,
    )

    return queueRequest(
      category,
      () =>
        fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${token}` },
        }),
      this.debug,
    )
  }

  /**
   * Validates a TIN against a NRIC/ARMY/PASSPORT/BRN (Business Registration Number)
   *
   * This method verifies if a given Tax Identification Number (TIN) is valid by checking it against
   * the provided identification type and value through the MyInvois platform's validation service.
   *
   * @param tin - The TIN to validate
   * @param idType - The type of ID to validate against ('NRIC', 'ARMY', 'PASSPORT', or 'BRN')
   * @param idValue - The value of the ID to validate against
   * @returns Promise resolving to true if the TIN is valid, false otherwise
   *
   * @example
   * ```typescript
   * // Validate TIN against NRIC
   * const isValid = await client.verifyTin('C12345678901234', 'NRIC', '123456789012');
   * if (isValid) {
   *   console.log('TIN is valid');
   * }
   *
   * // Validate TIN against Business Registration Number
   * const isValidBusiness = await client.verifyTin('C98765432109876', 'BRN', '123456-K');
   * ```
   *
   * @remarks
   * - Returns false if validation fails due to network errors or invalid credentials
   * - Debug mode provides error logging for troubleshooting validation failures
   * - This is a non-blocking validation that won't throw exceptions on failure
   */
  async verifyTin(
    tin: string,
    idType: RegistrationType,
    idValue: string,
  ): Promise<boolean> {
    return TaxpayerValidationAPI.verifyTin(
      { fetch: this.fetch.bind(this), debug: this.debug },
      tin,
      idType,
      idValue,
    )
  }

  /**
   * Searches for a Tax Identification Number (TIN) using taxpayer information.
   *
   * This method allows searching for a TIN using either a taxpayer name or a combination
   * of identification type and value. The search is flexible and supports multiple
   * identification types including NRIC, ARMY, PASSPORT, and BRN.
   *
   * @param params - Search parameters object
   * @param params.taxpayerName - Optional name of the taxpayer to search for
   * @param params.idType - Optional type of ID to search with (NRIC, ARMY, PASSPORT, BRN)
   * @param params.idValue - Optional value of the ID to search with
   * @returns Promise resolving to TIN search response or standard error
   *
   * @example
   * ```typescript
   * // Search by taxpayer name
   * const result = await client.searchTin({ taxpayerName: 'John Doe' });
   * if ('tin' in result) {
   *   console.log('Found TIN:', result.tin);
   * }
   *
   * // Search by ID type and value
   * const result = await client.searchTin({
   *   idType: 'NRIC',
   *   idValue: '123456789012'
   * });
   * ```
   *
   * @remarks
   * - Either taxpayerName or both idType and idValue must be provided
   * - Returns StandardError object if search criteria are invalid or inconclusive
   * - Debug mode provides detailed error logging for troubleshooting
   * - Search results are not guaranteed to be unique
   */
  async searchTin(params: TinSearchParams): Promise<TinSearchResponse> {
    return TaxpayerValidationAPI.tinSearch(
      { fetch: this.fetch.bind(this), debug: this.debug },
      params,
    )
  }

  /**
   * Retrieves taxpayer information from a QR code.
   *
   * This method decodes a QR code containing taxpayer information and returns
   * detailed taxpayer data including TIN, name, contact details, and business information.
   *
   * @param qrCodeText - The QR code text to decode
   * @returns Promise resolving to taxpayer QR code response or standard error
   *
   * @example
   * ```typescript
   * // Get taxpayer info from QR code
   * const taxpayerInfo = await client.getTaxpayerQRCode('QR_CODE_TEXT');
   * if ('tin' in taxpayerInfo) {
   *   console.log('Taxpayer TIN:', taxpayerInfo.tin);
   *   console.log('Business Name:', taxpayerInfo.name);
   *   console.log('Address:', taxpayerInfo.addressLine1);
   * }
   * ```
   *
   * @remarks
   * - QR code must be in the correct format specified by MyInvois
   * - Returns StandardError if QR code is invalid or cannot be decoded
   * - Debug mode provides detailed error logging
   */
  async getTaxpayerQRCode(qrCodeText: string): Promise<TaxpayerQRCodeResponse> {
    return TaxpayerValidationAPI.taxpayerQRCode(
      { fetch: this.fetch.bind(this), debug: this.debug },
      qrCodeText,
    )
  }

  /**
   * Performs an action on a document such as rejection or cancellation.
   *
   * This method allows updating the status of a document to either rejected or cancelled,
   * along with providing a reason for the action. Useful for managing document workflow
   * and maintaining audit trails.
   *
   * @param documentUid - The unique identifier of the document
   * @param status - The new status to set ('rejected' or 'cancelled')
   * @param reason - The reason for the status change
   * @returns Promise resolving to document action response containing UUID, status, and any errors
   *
   * @example
   * ```typescript
   * // Reject a document with reason
   * const result = await client.performDocumentAction(
   *   'doc-123',
   *   'rejected',
   *   'Invalid tax calculation'
   * );
   *
   * // Cancel a document
   * const result = await client.performDocumentAction(
   *   'doc-456',
   *   'cancelled',
   *   'Duplicate submission'
   * );
   * ```
   *
   * @remarks
   * - Only valid for documents in appropriate states
   * - Reason is required and should be descriptive
   * - Action is irreversible once completed
   * - Returns error if document cannot be found or action is invalid
   */
  async performDocumentAction(
    documentUid: string,
    status: 'rejected' | 'cancelled',
    reason: string,
  ): Promise<{
    uuid: string
    status: string
    error: StandardError
  }> {
    return DocumentSubmissionAPI.performDocumentAction(
      documentUid,
      status,
      reason,
    )
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
  async submitDocument(documents: AllDocumentsV1_1[]): Promise<{
    data: SubmissionResponse
    status: number
  }> {
    return DocumentSubmissionAPI.submitDocument(
      {
        fetch: this.fetch.bind(this),
        debug: this.debug,
        signingCredentials: this.signingCredentials,
      },
      documents,
    )
  }

  /**
   * Polls the MyInvois platform to get the current status of a document submission.
   *
   * This method continuously checks the submission status until it receives a final result
   * (Valid or Invalid) or reaches the maximum retry limit. It's designed to handle the
   * asynchronous nature of document processing on the MyInvois platform.
   *
   * @param submissionUid - The unique identifier of the submission to check
   * @param pollInterval - Time in milliseconds between status checks (default: 1000ms)
   * @param maxRetries - Maximum number of retry attempts (default: 10)
   * @returns Promise resolving to submission status object with document summary and any errors
   *
   * @example
   * ```typescript
   * // Check submission status with default polling
   * const result = await client.getSubmissionStatus('submission-uid-123');
   * if (result.status === 'Valid') {
   *   console.log('All documents processed successfully');
   *   console.log('Document summaries:', result.documentSummary);
   * }
   *
   * // Custom polling interval and retry count
   * const result = await client.getSubmissionStatus(
   *   'submission-uid-123',
   *   2000, // Poll every 2 seconds
   *   20    // Try up to 20 times
   * );
   * ```
   *
   * @remarks
   * - Automatically retries on network errors until maxRetries is reached
   * - Returns 'Invalid' status with timeout error if submission processing takes too long
   * - Debug mode provides detailed logging of polling attempts and responses
   * - Use reasonable poll intervals to avoid overwhelming the API
   */
  async getSubmissionStatus(
    submissionUid: string,
    pollInterval: number = 1000,
    maxRetries: number = 10,
    pageNo: number = 0,
    pageSize: number = 10,
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
    return DocumentSubmissionAPI.getSubmissionStatus(
      { fetch: this.fetch.bind(this), debug: this.debug },
      submissionUid,
      pollInterval,
      maxRetries,
      pageNo,
      pageSize,
    )
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
    return DocumentManagementAPI.getDocument(
      { fetch: this.fetch.bind(this) },
      documentUid,
    )
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
    return DocumentManagementAPI.getDocumentDetails(
      { fetch: this.fetch.bind(this) },
      documentUid,
    )
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
    return DocumentManagementAPI.searchDocuments(
      { fetch: this.fetch.bind(this) },
      {
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
      },
    )
  }

  /**
   * Retrieves notifications from the MyInvois platform based on specified search criteria.
   *
   * This method allows you to search for system notifications, alerts, and messages
   * sent by the MyInvois platform regarding document processing, system updates,
   * or account-related information.
   *
   * @param params - Search parameters object for filtering notifications
   * @param params.dateFrom - Optional start date for notification date range (ISO date string)
   * @param params.dateTo - Optional end date for notification date range (ISO date string)
   * @param params.type - Optional notification type filter
   * @param params.language - Optional language preference for notifications
   * @param params.status - Optional notification status filter
   * @param params.pageNo - Optional page number for pagination (0-based)
   * @param params.pageSize - Optional number of results per page
   * @returns Promise resolving to notification response object or standard error
   *
   * @example
   * ```typescript
   * // Get all notifications from the last 7 days
   * const notifications = await client.getNotifications({
   *   dateFrom: '2024-01-01',
   *   dateTo: '2024-01-07',
   *   pageSize: 20
   * });
   *
   * // Get unread notifications only
   * const unreadNotifications = await client.getNotifications({
   *   status: 0, // Assuming 0 = unread
   *   language: 'en'
   * });
   *
   * // Paginated notification retrieval
   * const firstPage = await client.getNotifications({
   *   dateFrom: '2024-01-01',
   *   pageNo: 0,
   *   pageSize: 10
   * });
   * ```
   *
   * @remarks
   * - All parameters are optional, allowing flexible filtering
   * - Returns paginated results when pageNo and pageSize are specified
   * - Date parameters should be in ISO format (YYYY-MM-DD)
   * - May return StandardError object if the request fails
   */
  async getNotifications({
    dateFrom,
    dateTo,
    type,
    language,
    status,
    pageNo,
    pageSize,
  }: NotificationSearchParams): Promise<NotificationResponse> {
    return NotificationManagementAPI.getNotifications(
      { fetch: this.fetch.bind(this) },
      {
        dateFrom,
        dateTo,
        type,
        language,
        status,
        pageNo,
        pageSize,
      },
    )
  }

  async getDocumentTypes(): Promise<DocumentTypesResponse> {
    return DocumentTypeManagementAPI.getDocumentTypes({
      fetch: this.fetch.bind(this),
    })
  }

  /**
   * Retrieves detailed information about a specific document type from the MyInvois platform.
   *
   * This method fetches metadata and configuration details for a specific document type,
   * including supported versions, validation rules, and structural requirements.
   * Useful for understanding document format requirements before submission.
   *
   * @param id - The unique identifier of the document type to retrieve
   * @returns Promise resolving to document type response object or standard error
   *
   * @example
   * ```typescript
   * // Get details for e-invoice document type
   * const invoiceType = await client.getDocumentType(1);
   * if ('id' in invoiceType) {
   *   console.log('Document type name:', invoiceType.name);
   *   console.log('Available versions:', invoiceType.versionNumber);
   *   console.log('Description:', invoiceType.description);
   * }
   *
   * // Handle potential errors
   * const documentType = await client.getDocumentType(999);
   * if ('error' in documentType) {
   *   console.error('Failed to retrieve document type:', documentType.error.message);
   * }
   * ```
   *
   * @remarks
   * - Returns StandardError object if the document type ID doesn't exist
   * - Document type information includes validation schemas and business rules
   * - Use this method to discover supported document formats and versions
   * - Essential for understanding submission requirements for different document types
   */
  async getDocumentType(id: number): Promise<DocumentTypeResponse> {
    return DocumentTypeManagementAPI.getDocumentType(
      { fetch: this.fetch.bind(this) },
      id,
    )
  }

  /**
   * Generates a shareable QR code URL for a specific document.
   *
   * This method retrieves the document details using its unique identifier,
   * then constructs a URL that can be used to access or share the document
   * via the MyInvois platform. The URL format differs between sandbox and
   * production environments.
   *
   * @param documentUid - The unique identifier of the document
   * @returns Promise resolving to a string containing the QR code URL
   *
   * @example
   * ```typescript
   * const qrCodeUrl = await client.getDocumentQrCode('abc123');
   * console.log('Shareable QR code URL:', qrCodeUrl);
   * // Output (sandbox): https://preprod.myinvois.hasil.gov.my/abc123/share/longId
   * // Output (production): https://myinvois.hasil.gov.my/abc123/share/longId
   * ```
   *
   * @remarks
   * - The returned URL can be embedded in a QR code for document sharing.
   * - The method fetches the document to obtain its longId, which is required for the URL.
   * - Ensure the documentUid is valid and accessible by the current client.
   */
  async getDocumentQrCode(
    documentUid: string,
    longId?: string,
  ): Promise<string | null> {
    const doc = await DocumentManagementAPI.getDocument(
      { fetch: this.fetch.bind(this) },
      documentUid,
    )

    const qrCodeBaseLink = `https://${this.environment === 'sandbox' ? 'preprod.' : ''}myinvois.hasil.gov.my/`
    if (!doc.longId && !longId) {
      return null
    }
    return qrCodeBaseLink + documentUid + '/share/' + (longId ?? doc.longId)
  }

  /**
   * Retrieves detailed information about a specific version of a document type.
   *
   * This method fetches version-specific metadata, schema definitions, and validation rules
   * for a particular document type version. Essential for understanding the exact format
   * and requirements for document submission in a specific version.
   *
   * @param id - The unique identifier of the document type
   * @param versionId - The unique identifier of the specific version to retrieve
   * @returns Promise resolving to document type version response object or standard error
   *
   * @example
   * ```typescript
   * // Get specific version details for e-invoice
   * const invoiceV1_1 = await client.getDocumentTypeVersion(1, 1);
   * if ('id' in invoiceV1_1) {
   *   console.log('Version number:', invoiceV1_1.versionNumber);
   *   console.log('Schema:', invoiceV1_1.jsonSchema);
   *   console.log('Status:', invoiceV1_1.status);
   * }
   *
   * // Compare different versions
   * const [v1_0, v1_1] = await Promise.all([
   *   client.getDocumentTypeVersion(1, 0),
   *   client.getDocumentTypeVersion(1, 1)
   * ]);
   *
   * // Handle version not found
   * const result = await client.getDocumentTypeVersion(1, 999);
   * if ('error' in result) {
   *   console.error('Version not found:', result.error.message);
   * }
   * ```
   *
   * @remarks
   * - Returns StandardError object if document type ID or version ID doesn't exist
   * - Version information includes JSON schema for validation
   * - Different versions may have different validation rules and field requirements
   * - Use this to ensure your documents conform to the specific version requirements
   * - Version status indicates if the version is active, deprecated, or under development
   */
  async getDocumentTypeVersion(
    id: number,
    versionId: number,
  ): Promise<DocumentTypeVersionResponse> {
    return DocumentTypeManagementAPI.getDocumentTypeVersion(
      { fetch: this.fetch.bind(this) },
      id,
      versionId,
    )
  }

  // Static helper: create a client directly from a PKCS#12 (.p12) bundle
  static fromP12(
    clientId: string,
    clientSecret: string,
    environment: 'sandbox' | 'production',
    p12Input: Buffer | string,
    passphrase: string,
    onBehalfOf?: string,
    debug?: boolean,
  ): MyInvoisClient {
    const { certificatePem, privateKeyPem } = getPemFromP12(
      p12Input,
      passphrase,
    )

    return new MyInvoisClient(
      clientId,
      clientSecret,
      environment,
      certificatePem,
      privateKeyPem,
      onBehalfOf,
      debug,
    )
  }
}
