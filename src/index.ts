import {
  DocumentSearchResult,
  DocumentSummary,
  DocumentTypeResponse,
  DocumentTypesResponse,
  DocumentTypeVersionResponse,
  DocumentValidationResult,
  DocumentValidationStepResult,
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
import {
  queueRequest,
  categorizeRequest,
  type RateLimitStore,
} from './utils/apiQueue'
import { InMemoryTokenStore, type TokenStore } from './utils/tokenStore'

export {
  InMemoryRateLimitStore,
  type RateLimitStore,
  type ApiCategory,
} from './utils/apiQueue'
export {
  InMemoryTokenStore,
  type TokenStore,
  type StoredToken,
} from './utils/tokenStore'

export type * from './types/index.d.ts'
export {
  aggregateLineItemsByTaxCategory,
  type AggregateByTaxCategoryOptions,
} from './utils/lineItems'
export {
  buildSignedDocument,
  type SignedDocumentPayload,
} from './api/documentSubmission'
// Low-level signing helpers, for consumers that need to inspect or reproduce
// the signature pipeline (e.g. storing digests alongside submissions).
export {
  generateCompleteDocument,
  calculateDocumentDigest,
  transformDocumentForHashing,
} from './utils/document'

/**
 * Options for {@link MyInvoisClient.create}.
 *
 * Preferred over the positional constructor: new options can be added here
 * without changing any existing call site.
 */
export interface MyInvoisClientOptions {
  /** Client ID issued by the MyInvois portal. */
  clientId: string
  /** Client secret issued by the MyInvois portal. */
  clientSecret: string
  /** Target environment. */
  environment: 'sandbox' | 'production'
  /** Signing certificate in PEM format. */
  certificatePem: string
  /** Private key in PEM format. Must match the certificate. */
  privateKeyPem: string
  /** TIN of the taxpayer being represented, for intermediary access. */
  onBehalfOf?: string
  /** Enable verbose logging. Defaults to `MYINVOIS_DEBUG === 'true'`. */
  debug?: boolean
  /**
   * Shared rate-limit backend for multi-process deployments. Defaults to an
   * in-process sliding window shared by all instances in this process.
   */
  rateLimitStore?: RateLimitStore
  /**
   * Shared access-token cache for multi-process deployments, keyed
   * `${clientId}:${onBehalfOf ?? ''}`. Defaults to in-memory per instance.
   */
  tokenStore?: TokenStore
}

export class MyInvoisClient {
  private readonly baseUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly environment: 'sandbox' | 'production'
  private onBehalfOf?: string
  private readonly signingCredentials: SigningCredentials
  private readonly debug: boolean
  private token = ''
  private requestCount = 0
  /** Single-flight guard: concurrent calls share one in-flight login. */
  private tokenRefreshPromise: Promise<void> | null = null
  private readonly rateLimitStore?: RateLimitStore
  private readonly tokenStore: TokenStore
  /** Refresh this long before actual expiry so a token never dies mid-request. */
  private static readonly TOKEN_EXPIRY_MARGIN_MS = 60_000

  constructor(
    clientId: string,
    clientSecret: string,
    environment: 'sandbox' | 'production',
    certificatePem: string,
    privateKeyPem: string,
    onBehalfOf?: string,
    debug?: boolean,
    stores?: { rateLimitStore?: RateLimitStore; tokenStore?: TokenStore },
  ) {
    // Check if basic signing credentials are available
    if (!privateKeyPem || !certificatePem) {
      throw new Error(
        'Missing signing credentials: certificatePem and privateKeyPem are required',
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
    this.rateLimitStore = stores?.rateLimitStore
    this.tokenStore = stores?.tokenStore ?? new InMemoryTokenStore()

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

  /** Token-cache key: one entry per represented TIN for intermediaries. */
  private tokenKey(): string {
    return `${this.clientId}:${this.onBehalfOf ?? ''}`
  }

  private async refreshToken() {
    // Share a single in-flight login between concurrent callers, and route it
    // through the rate limiter (the official limit is 12 logins/min/clientId).
    if (!this.tokenRefreshPromise) {
      const category = this.onBehalfOf ? 'loginIntermediary' : 'loginTaxpayer'
      this.tokenRefreshPromise = queueRequest(
        this.clientId,
        category,
        () =>
          platformLogin({
            clientId: this.clientId,
            clientSecret: this.clientSecret,
            baseUrl: this.baseUrl,
            onBehalfOf: this.onBehalfOf,
            debug: this.debug,
          }),
        this.debug,
        this.rateLimitStore,
      )
        .then(async tokenResponse => {
          this.token = tokenResponse.token
          const expiresAt = tokenResponse.tokenExpiration.getTime()
          if (!isNaN(expiresAt)) {
            await this.tokenStore.set(this.tokenKey(), {
              token: tokenResponse.token,
              expiresAt,
            })
          }
        })
        .finally(() => {
          this.tokenRefreshPromise = null
        })
    }
    return this.tokenRefreshPromise
  }

  private async getToken() {
    const stored = await this.tokenStore.get(this.tokenKey())
    const valid =
      stored &&
      !isNaN(stored.expiresAt) &&
      stored.expiresAt - Date.now() >= MyInvoisClient.TOKEN_EXPIRY_MARGIN_MS
    if (valid) {
      return stored.token
    }

    if (this.debug) {
      console.log('Token missing or expiring soon — refreshing')
    }
    await this.refreshToken()
    return this.token
  }

  private async fetch(path: string, options: Parameters<typeof fetch>[1] = {}) {
    this.requestCount++
    if (this.debug) console.log(`[fetch] Request count: ${this.requestCount}`)

    const token = await this.getToken()

    // Dynamically categorise the request and enqueue it so we never exceed the
    // vendor-specified rate-limits. Unrecognised paths fall back to the
    // conservative `default` bucket (12 requests/minute).

    const category = categorizeRequest(
      path,
      options?.method as string | undefined,
    )

    return queueRequest(
      this.clientId,
      category,
      () =>
        fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${token}` },
        }),
      this.debug,
      this.rateLimitStore,
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
   * - Throws if the search criteria are invalid or the API returns an error
   *   (e.g. 400 "Search criteria is not conclusive" when multiple taxpayers match)
   * - Debug mode provides detailed error logging for troubleshooting
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
   * This method looks up the taxpayer behind a scanned MyInvois QR code and
   * returns detailed taxpayer data including TIN, name, contact details, and
   * business information.
   *
   * @param qrCodeText - The scanned QR content. Pass either the raw Base64
   *   string from the QR code or its decoded value — both are handled.
   * @returns Promise resolving to the taxpayer QR code response
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
   * - Throws if the QR code is unknown (HTTP 404 NotFound) or the request fails
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
   * @param reason - The reason for the status change (max 300 characters)
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
   * - Reason is required, max 300 characters
   * - Action is irreversible once completed
   * - Returns error if document cannot be found or action is invalid
   */
  private async performDocumentAction(
    documentUid: string,
    status: 'rejected' | 'cancelled',
    reason: string,
  ): Promise<{
    uuid: string
    status: string
    error?: StandardError
  }> {
    return DocumentSubmissionAPI.performDocumentAction(
      { fetch: this.fetch.bind(this) },
      documentUid,
      status,
      reason,
    )
  }

  /**
   * Cancels a document that was previously submitted.
   *
   * This is a convenience method that wraps performDocumentAction with 'cancelled' status.
   * Documents can only be cancelled within 72 hours of validation.
   *
   * @param documentUid - The unique identifier of the document to cancel
   * @param reason - The reason for cancellation (max 300 characters)
   * @returns Promise resolving to document action response containing UUID, status, and any errors
   *
   * @example
   * ```typescript
   * const result = await client.cancelDocument(
   *   'doc-456',
   *   'Duplicate submission'
   * );
   * if (!result.error) {
   *   console.log('Document cancelled:', result.uuid);
   * }
   * ```
   *
   * @remarks
   * - Must be called within 72 hours of document validation
   * - Reason is required, max 300 characters
   * - Action is irreversible once completed
   * - Rate limited to 12 requests per minute
   */
  async cancelDocument(
    documentUid: string,
    reason: string,
  ): Promise<{ uuid: string; status: string; error?: StandardError }> {
    return this.performDocumentAction(documentUid, 'cancelled', reason)
  }

  /**
   * Rejects a document received from another party.
   *
   * This is a convenience method that wraps performDocumentAction with 'rejected' status.
   * Only documents received from other taxpayers can be rejected.
   *
   * @param documentUid - The unique identifier of the document to reject
   * @param reason - The reason for rejection (max 300 characters)
   * @returns Promise resolving to document action response containing UUID, status, and any errors
   *
   * @example
   * ```typescript
   * const result = await client.rejectDocument(
   *   'doc-123',
   *   'Invalid tax calculation'
   * );
   * if (!result.error) {
   *   console.log('Document rejected:', result.uuid);
   * }
   * ```
   *
   * @remarks
   * - Only applicable to received documents
   * - Reason is required, max 300 characters
   * - Action is irreversible once completed
   * - Rate limited to 12 requests per minute
   */
  async rejectDocument(
    documentUid: string,
    reason: string,
  ): Promise<{ uuid: string; status: string; error?: StandardError }> {
    return this.performDocumentAction(documentUid, 'rejected', reason)
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
   * @throws {Error} If a submission limit is exceeded (max 100 documents,
   *   300KB per document, 5MB total payload)
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
   * - Each document is digitally signed (MyInvois JSON XAdES profile) with the
   *   credentials supplied to the constructor before submission
   * - Documents are base64-encoded for transmission
   * - API limits are enforced locally and THROW when exceeded: max 100
   *   documents per submission, 5MB total payload, 300KB per document
   * - Debug mode provides detailed logging of payload sizes
   * - Returns HTTP 202 for successful submissions that require processing
   */
  async submitDocument(
    documents: (
      | AllDocumentsV1_1
      | DocumentSubmissionAPI.SignedDocumentPayload
    )[],
  ): Promise<{
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
   * Signs documents and returns the exact submission entries WITHOUT
   * submitting them. Use this to store or preview precisely what will be
   * sent; pass the returned payloads to {@link submitDocument} later to
   * submit them byte-for-byte as stored.
   *
   * @example
   * ```typescript
   * const [payload] = client.buildSignedDocuments([invoice])
   * await db.save(payload) // persist document (base64) + documentHash
   * await client.submitDocument([payload])
   * ```
   *
   * @remarks
   * - The signature embeds the signing time, so build time = signing time
   * - Throws if a signed document exceeds the 300KB limit
   */
  buildSignedDocuments(
    documents: AllDocumentsV1_1[],
  ): DocumentSubmissionAPI.SignedDocumentPayload[] {
    return documents.map(doc =>
      DocumentSubmissionAPI.buildSignedDocument(doc, this.signingCredentials),
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
   * @param pollInterval - Time in milliseconds between status checks
   *   (default: 3000ms — the official docs recommend polling every 3-5s)
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
   * - Terminal statuses: 'Valid', 'PartiallyValid' and 'Invalid'
   * - Automatically retries on network errors until maxRetries is reached
   * - Returns 'TimedOut' status with a timeout error if processing takes too long
   * - Debug mode provides detailed logging of polling attempts and responses
   * - Use reasonable poll intervals to avoid overwhelming the API (300 requests/min limit)
   */
  async getSubmissionStatus(
    submissionUid: string,
    pollInterval: number = 3000,
    maxRetries: number = 10,
    pageNo: number = 1,
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
   * console.log(details.validationResults.status); // 'Submitted' | 'Valid' | 'Invalid'
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
   * @param params.submissionDateFrom - Start of the submission date window (UTC ISO 8601, e.g. '2024-01-01T00:00:00Z')
   * @param params.submissionDateTo - End of the submission date window (UTC ISO 8601)
   * @param params.pageSize - Optional number of results per page (max 100)
   * @param params.pageNo - Optional page number for pagination
   * @param params.issueDateFrom - Start of the issue date window (UTC ISO 8601)
   * @param params.issueDateTo - End of the issue date window (UTC ISO 8601)
   * @param params.invoiceDirection - Optional filter by invoice direction ('Sent' or 'Received')
   * @param params.status - Optional filter by document status
   * @param params.documentType - Optional filter by e-invoice type code
   * @param params.searchQuery - Optional text search across uuid, buyerTIN, supplierTIN, buyerName, supplierName, internalID, total
   * @param params.classificationCode - Optional comma-separated classification codes
   * @returns Promise resolving to array of search results matching the criteria
   * @throws {Error} If no complete date window (or uuid) is given, or the request fails
   *
   * @example
   * ```typescript
   * // Search within a submission-date window (max 31 days)
   * const documents = await client.searchDocuments({
   *   submissionDateFrom: '2024-01-01T00:00:00Z',
   *   submissionDateTo: '2024-01-31T23:59:59Z',
   *   status: 'Valid',
   *   pageSize: 10
   * });
   *
   * // Search by supplier name within an issue-date window
   * const supplierDocs = await client.searchDocuments({
   *   issueDateFrom: '2024-01-01T00:00:00Z',
   *   issueDateTo: '2024-01-31T23:59:59Z',
   *   searchQuery: 'ACME Corp',
   *   invoiceDirection: 'Received'
   * });
   * ```
   *
   * @remarks
   * - The API requires EITHER both submission dates OR both issue dates
   *   (each window at most 31 days), unless searching by uuid
   */
  async searchDocuments(
    params: DocumentManagementAPI.SearchDocumentsParams,
  ): Promise<DocumentSearchResult[]> {
    return DocumentManagementAPI.searchDocuments(
      { fetch: this.fetch.bind(this) },
      params,
    )
  }

  /**
   * Retrieves recently submitted or received documents.
   *
   * @param params - Optional paging and filter parameters
   * @returns Promise resolving to an array of document summaries
   *
   * @example
   * ```typescript
   * const recent = await client.getRecentDocuments({ pageSize: 20 })
   * ```
   *
   * @remarks
   * - Rate limited to 12 requests per minute
   */
  async getRecentDocuments(
    params: Parameters<typeof DocumentManagementAPI.getRecentDocuments>[1] = {},
  ): Promise<DocumentSearchResult[]> {
    return DocumentManagementAPI.getRecentDocuments(
      { fetch: this.fetch.bind(this) },
      params,
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
   * @param params.dateFrom - Optional start of the date range (UTC ISO 8601, e.g. '2024-01-01T00:00:00Z')
   * @param params.dateTo - Optional end of the date range (UTC ISO 8601)
   * @param params.type - Optional notification type filter
   * @param params.language - Optional language preference ('ms' or 'en')
   * @param params.status - Optional delivery status filter (1-5)
   * @param params.pageNo - Optional page number for pagination
   * @param params.pageSize - Optional number of results per page (max 100)
   * @returns Promise resolving to `{ result, metadata }` — notifications live in `result`
   *
   * @example
   * ```typescript
   * // Get notifications from the first week of January
   * const { result, metadata } = await client.getNotifications({
   *   dateFrom: '2024-01-01T00:00:00Z',
   *   dateTo: '2024-01-07T23:59:59Z',
   *   pageSize: 20
   * });
   * for (const notification of result) {
   *   console.log(notification.notificationSubject);
   * }
   * if (metadata.hasNext) {
   *   // fetch the next page
   * }
   * ```
   *
   * @remarks
   * - All parameters are optional, allowing flexible filtering
   * - The API wraps notifications in a `result` array with `metadata.hasNext`
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
   * console.log('Description:', invoiceType.description);
   * for (const version of invoiceType.documentTypeVersions) {
   *   console.log(version.name, version.versionNumber, version.status);
   * }
   * // Workflow parameters carry e.g. the cancellation window in seconds
   * console.log(invoiceType.workflowParameters);
   * ```
   *
   * @remarks
   * - The API returns a 404 error response if the document type ID doesn't exist
   * - Use this method to discover supported document formats and versions
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
    const qrCodeBaseLink = `https://${this.environment === 'sandbox' ? 'preprod.' : ''}myinvois.hasil.gov.my/`

    // Only fetch the document when the caller didn't already supply the longId.
    const resolvedLongId =
      longId ??
      (
        await DocumentManagementAPI.getDocument(
          { fetch: this.fetch.bind(this) },
          documentUid,
        )
      ).longId

    if (!resolvedLongId) {
      return null
    }
    return qrCodeBaseLink + documentUid + '/share/' + resolvedLongId
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
   * console.log('Version number:', invoiceV1_1.versionNumber);
   * console.log('Status:', invoiceV1_1.status);
   * ```
   *
   * @remarks
   * - The API returns a 404 error response if the document type or version ID doesn't exist
   * - Different versions may have different validation rules and field requirements
   * - Version status is 'published' or 'deactivated'
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

  /**
   * Creates a client from an options object.
   *
   * Equivalent to the positional constructor, but avoids ordering mistakes
   * between same-typed parameters and does not require placeholder
   * arguments to reach optional ones.
   *
   * @example
   * ```typescript
   * const client = MyInvoisClient.create({
   *   clientId,
   *   clientSecret,
   *   environment: 'sandbox',
   *   certificatePem,
   *   privateKeyPem,
   * })
   * ```
   */
  static create(options: MyInvoisClientOptions): MyInvoisClient {
    return new MyInvoisClient(
      options.clientId,
      options.clientSecret,
      options.environment,
      options.certificatePem,
      options.privateKeyPem,
      options.onBehalfOf,
      options.debug,
      { rateLimitStore: options.rateLimitStore, tokenStore: options.tokenStore },
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
