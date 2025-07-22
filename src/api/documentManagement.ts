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

export async function getDocument(
  context: DocumentContext,
  documentUid: string,
): Promise<DocumentSummary & { document: string }> {
  const { fetch } = context

  const response = await fetch(`/api/v1.0/documents/${documentUid}/raw`)
  const data = await response.json()

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
  if (invoiceDirection) queryParams.set('invoiceDirection', invoiceDirection)
  if (status) queryParams.set('status', status)
  if (documentType) queryParams.set('documentType', documentType)
  if (searchQuery) queryParams.set('searchQuery', searchQuery)

  const response = await fetch(
    `/api/v1.0/documents/search?${queryParams.toString()}`,
  )

  const data = await response.json()

  return data.map((doc: DocumentSummary & { longID: string }) => ({
    ...doc,
    longId: doc.longID ?? doc.longId,
  })) as DocumentSummary[]
}
