import type {
  DocumentTypeResponse,
  DocumentTypesResponse,
  DocumentTypeVersionResponse,
  Fetch,
} from '../types'

interface DocumentTypeContext {
  fetch: Fetch
}

export async function getDocumentTypes(
  context: DocumentTypeContext,
): Promise<DocumentTypesResponse> {
  const { fetch } = context

  const response = await fetch('/api/v1.0/documenttypes')
  const data = (await response.json()) as DocumentTypesResponse

  return data
}

export async function getDocumentType(
  context: DocumentTypeContext,
  id: number,
): Promise<DocumentTypeResponse> {
  const { fetch } = context

  const response = await fetch(`/api/v1.0/documenttypes/${id}`)
  const data = (await response.json()) as DocumentTypeResponse

  return data
}

export async function getDocumentTypeVersion(
  context: DocumentTypeContext,
  id: number,
  versionId: number,
): Promise<DocumentTypeVersionResponse> {
  const { fetch } = context

  const response = await fetch(
    `/api/v1.0/documenttypes/${id}/versions/${versionId}`,
  )

  const data = (await response.json()) as DocumentTypeVersionResponse

  return data
}
