import type {
  DocumentSummary,
  DocumentStatus,
  EInvoiceTypeCode,
  DocumentValidationResult,
  DocumentValidationStepResult,
  Fetch,
} from '../types'

interface DocumentContext {
  fetch: Fetch
}

const rawLogs = process.env.E_INV_RAW_LOGS === 'true'

export async function getDocument(
  context: DocumentContext,
  documentUid: string,
): Promise<DocumentSummary & { document: string }> {
  const { fetch } = context

  const response = await fetch(`/api/v1.0/documents/${documentUid}/raw`)
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

  const response = await fetch(`/api/v1.0/documents/${documentUid}/details`)
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

export async function searchDocuments(
  context: DocumentContext,
  params: {
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
    searchQuery?: string
  },
): Promise<DocumentSummary[]> {
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
  } = params

  const queryParams = new URLSearchParams()

  if (uuid) queryParams.set('uuid', uuid)
  if (submissionDateFrom)
    queryParams.set('submissionDateFrom', submissionDateFrom)
  if (submissionDateTo) queryParams.set('submissionDateTo', submissionDateTo)
  if (pageSize) queryParams.set('pageSize', pageSize.toString())
  if (pageNo) queryParams.set('pageNo', pageNo.toString())
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

  const response = await fetch(
    `/api/v1.0/documents/search?${queryParams.toString()}`,
  )

  const data = await response.json()

  if (rawLogs) {
    console.log('Raw search documents:', data)
  }

  // The MyInvois API wraps results in `{ result: [...], metadata: {...} }`.
  // Fall back to a bare array for forward/backward compatibility.
  const documents: (DocumentSummary & { longID?: string })[] = Array.isArray(
    data,
  )
    ? data
    : (data?.result ?? [])

  return documents.map(doc => ({
    ...doc,
    longId: doc.longID ?? doc.longId,
  })) as DocumentSummary[]
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
): Promise<DocumentSummary[]> {
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

  if (pageNo) queryParams.set('pageNo', pageNo.toString())
  if (pageSize) queryParams.set('pageSize', pageSize.toString())
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

  const data = await response.json()

  if (rawLogs) {
    console.log('Raw recent documents:', data)
  }

  const documents: (DocumentSummary & { longID?: string })[] = Array.isArray(
    data,
  )
    ? data
    : (data?.result ?? [])

  return documents.map(doc => ({
    ...doc,
    longId: doc.longID ?? doc.longId,
  })) as DocumentSummary[]
}
