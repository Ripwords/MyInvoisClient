import type {
  DocumentSummary,
  DocumentSearchResult,
  DocumentStatus,
  EInvoiceTypeCode,
  DocumentValidationResult,
  DocumentValidationStepResult,
  Fetch,
} from '../types'
import { ensureOk } from '../errors'

interface DocumentContext {
  fetch: Fetch
}

const rawLogs = process.env.E_INV_RAW_LOGS === 'true'

/**
 * The search/recent endpoints are inconsistent about field casing across the
 * official docs (`submissionUID` vs `submissionUid`, `supplierTIN` vs
 * `supplierTin`, `longID` vs `longId`). Normalise every variant to camelCase.
 */
const normalizeSearchResult = (
  doc: DocumentSearchResult & {
    longID?: string
    submissionUID?: string
    supplierTIN?: string
    buyerTIN?: string
  },
): DocumentSearchResult => {
  const { longID, submissionUID, supplierTIN, buyerTIN, ...rest } = doc
  return {
    ...rest,
    longId: longID ?? doc.longId,
    submissionUid: submissionUID ?? doc.submissionUid,
    supplierTin: supplierTIN ?? doc.supplierTin,
    buyerTin: buyerTIN ?? doc.buyerTin,
  }
}

export async function getDocument(
  context: DocumentContext,
  documentUid: string,
): Promise<DocumentSummary & { document: string }> {
  const { fetch } = context

  const response = await fetch(
    `/api/v1.0/documents/${encodeURIComponent(documentUid)}/raw`,
  )
  await ensureOk(response, 'get document')
  const data = await response.json()

  if (rawLogs) {
    console.log('Raw document:', data)
  }

  return { ...data, longId: data.longID ?? data.longId } as DocumentSummary & {
    document: string
  }
}

export async function getDocumentDetails(
  context: DocumentContext,
  documentUid: string,
): Promise<
  DocumentSummary & {
    validationResults: {
      status: DocumentValidationResult
      validationSteps: DocumentValidationStepResult[]
    }
  }
> {
  const { fetch } = context

  const response = await fetch(
    `/api/v1.0/documents/${encodeURIComponent(documentUid)}/details`,
  )
  await ensureOk(response, 'get document details')
  const data = await response.json()
  const resp = {
    ...data,
    longId: data.longID ?? data.longId,
  } as DocumentSummary & {
    validationResults: {
      status: DocumentValidationResult
      validationSteps: DocumentValidationStepResult[]
    }
  }

  if (rawLogs) {
    console.log('Raw document details:', resp)
  }

  return resp
}

export interface SearchDocumentsParams {
  uuid?: string
  submissionDateFrom?: string
  submissionDateTo?: string
  pageSize?: number
  pageNo?: number
  issueDateFrom?: string
  issueDateTo?: string
  invoiceDirection?: 'Sent' | 'Received'
  status?: DocumentStatus
  documentType?: EInvoiceTypeCode
  searchQuery?: string
  /** Comma-separated classification codes to filter by. */
  classificationCode?: string
}

export async function searchDocuments(
  context: DocumentContext,
  params: SearchDocumentsParams,
): Promise<DocumentSearchResult[]> {
  const { fetch } = context
  const {
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
    classificationCode,
  } = params

  // The API requires a complete date window: either both submission dates or
  // both issue dates (each max 31 days apart), unless searching by uuid.
  // https://sdk.myinvois.hasil.gov.my/einvoicingapi/09-search-documents/
  const hasSubmissionWindow = !!submissionDateFrom && !!submissionDateTo
  const hasIssueWindow = !!issueDateFrom && !!issueDateTo
  if (!uuid && !hasSubmissionWindow && !hasIssueWindow) {
    throw new Error(
      'searchDocuments requires a complete date window: provide both submissionDateFrom and submissionDateTo, or both issueDateFrom and issueDateTo (or a uuid)',
    )
  }

  const queryParams = new URLSearchParams()

  if (uuid) queryParams.set('uuid', uuid)
  if (submissionDateFrom)
    queryParams.set('submissionDateFrom', submissionDateFrom)
  if (submissionDateTo) queryParams.set('submissionDateTo', submissionDateTo)
  if (pageSize != null) queryParams.set('pageSize', pageSize.toString())
  if (pageNo != null) queryParams.set('pageNo', pageNo.toString())
  if (issueDateFrom) queryParams.set('issueDateFrom', issueDateFrom)
  if (issueDateTo) queryParams.set('issueDateTo', issueDateTo)
  // NOT a bug: searchDocuments genuinely uses lowercase `invoiceDirection`,
  // while getRecentDocuments genuinely uses `InvoiceDirection` (capital I
  // and D) — verified against both official pages. Do NOT harmonise these.
  // https://sdk.myinvois.hasil.gov.my/einvoicingapi/09-search-documents/
  // https://sdk.myinvois.hasil.gov.my/einvoicingapi/05-get-recent-documents/
  if (invoiceDirection) queryParams.set('invoiceDirection', invoiceDirection)
  if (status) queryParams.set('status', status)
  if (documentType) queryParams.set('documentType', documentType)
  if (searchQuery) queryParams.set('searchQuery', searchQuery)
  if (classificationCode)
    queryParams.set('classificationCode', classificationCode)

  const response = await fetch(
    `/api/v1.0/documents/search?${queryParams.toString()}`,
  )
  await ensureOk(response, 'search documents')

  const data = await response.json()

  if (rawLogs) {
    console.log('Raw search documents:', data)
  }

  // The MyInvois API wraps results in `{ result: [...], metadata: {...} }`.
  // Fall back to a bare array for forward/backward compatibility.
  const documents: DocumentSearchResult[] = Array.isArray(data)
    ? data
    : (data?.result ?? [])

  return documents.map(normalizeSearchResult)
}

/**
 * Retrieves recently submitted or received documents.
 *
 * Official specification:
 * https://sdk.myinvois.hasil.gov.my/einvoicingapi/05-get-recent-documents/
 *
 * Rate limited to 12 requests per minute. The limiter category
 * `getRecentDocuments` already covers this path.
 *
 * @remarks
 * - Only returns documents issued within the last 31 days
 * - Intended for troubleshooting; excessive use may result in throttling
 */
export async function getRecentDocuments(
  context: DocumentContext,
  params: {
    pageNo?: number
    pageSize?: number
    submissionDateFrom?: string
    submissionDateTo?: string
    issueDateFrom?: string
    issueDateTo?: string
    invoiceDirection?: 'Sent' | 'Received'
    status?: DocumentStatus
    documentType?: EInvoiceTypeCode
    receiverIdType?: string
    receiverId?: string
    issuerIdType?: string
    issuerId?: string
    receiverTin?: string
    issuerTin?: string
  } = {},
): Promise<DocumentSearchResult[]> {
  const { fetch } = context
  const {
    pageNo,
    pageSize,
    submissionDateFrom,
    submissionDateTo,
    issueDateFrom,
    issueDateTo,
    invoiceDirection,
    status,
    documentType,
    receiverIdType,
    receiverId,
    issuerIdType,
    issuerId,
    receiverTin,
    issuerTin,
  } = params

  const queryParams = new URLSearchParams()

  if (pageNo != null) queryParams.set('pageNo', pageNo.toString())
  if (pageSize != null) queryParams.set('pageSize', pageSize.toString())
  if (submissionDateFrom)
    queryParams.set('submissionDateFrom', submissionDateFrom)
  if (submissionDateTo) queryParams.set('submissionDateTo', submissionDateTo)
  if (issueDateFrom) queryParams.set('issueDateFrom', issueDateFrom)
  if (issueDateTo) queryParams.set('issueDateTo', issueDateTo)
  // NOT a bug: getRecentDocuments genuinely uses `InvoiceDirection` (capital
  // I and D), while searchDocuments genuinely uses lowercase
  // `invoiceDirection` — verified against both official pages. Do NOT
  // harmonise these.
  // https://sdk.myinvois.hasil.gov.my/einvoicingapi/05-get-recent-documents/
  // https://sdk.myinvois.hasil.gov.my/einvoicingapi/09-search-documents/
  if (invoiceDirection) queryParams.set('InvoiceDirection', invoiceDirection)
  if (status) queryParams.set('status', status)
  if (documentType) queryParams.set('documentType', documentType)
  if (receiverIdType) queryParams.set('receiverIdType', receiverIdType)
  if (receiverId) queryParams.set('receiverId', receiverId)
  if (issuerIdType) queryParams.set('issuerIdType', issuerIdType)
  if (issuerId) queryParams.set('issuerId', issuerId)
  if (receiverTin) queryParams.set('receiverTin', receiverTin)
  if (issuerTin) queryParams.set('issuerTin', issuerTin)

  const query = queryParams.toString()
  const response = await fetch(
    `/api/v1.0/documents/recent${query ? `?${query}` : ''}`,
  )
  await ensureOk(response, 'get recent documents')

  const data = await response.json()

  if (rawLogs) {
    console.log('Raw recent documents:', data)
  }

  const documents: DocumentSearchResult[] = Array.isArray(data)
    ? data
    : (data?.result ?? [])

  return documents.map(normalizeSearchResult)
}
