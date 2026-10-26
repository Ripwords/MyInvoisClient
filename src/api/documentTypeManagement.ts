import type {
  DocumentTypeResponse,
  DocumentTypesResponse,
  DocumentTypeVersionResponse,
  Fetch,
} from '../types'
import { ensureOk } from '../errors'

interface DocumentTypeContext {
  fetch: Fetch
}

export async function getDocumentTypes(
  context: DocumentTypeContext,
): Promise<DocumentTypesResponse> {
  const { fetch } = context

  const response = await fetch('/api/v1.0/documenttypes')
  await ensureOk(response, 'get document types')
  const data = (await response.json()) as DocumentTypesResponse

  return data
}

export async function getDocumentType(
  context: DocumentTypeContext,
  id: number,
): Promise<DocumentTypeResponse> {
  const { fetch } = context

  const response = await fetch(`/api/v1.0/documenttypes/${id}`)
  await ensureOk(response, 'get document type')
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
  await ensureOk(response, 'get document type version')

  const data = (await response.json()) as DocumentTypeVersionResponse

  return data
}
