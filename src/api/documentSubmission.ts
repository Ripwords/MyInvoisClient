import crypto from 'node:crypto'
import type {
  AllDocumentsV1_1,
  CompleteInvoice,
  SubmissionResponse,
  SigningCredentials,
  SubmissionStatus,
  DocumentSummary,
  Fetch,
  StandardError,
  GetSubmissionResponse,
} from '../types'
import { generateCompleteDocument } from '../utils/document'

interface SubmissionContext {
  fetch: Fetch
  debug: boolean
  signingCredentials: SigningCredentials
}

/**
 * The exact wire entry `submitDocument` sends for one document, plus the
 * parsed signed document for preview/storage. `document` (base64) and
 * `documentHash` (SHA-256 hex of the serialized signed document) are what the
 * MyInvois API receives — persist this object to keep a byte-exact record of
 * what was (or will be) submitted, and pass it back to `submitDocument` to
 * submit it unchanged.
 */
export interface SignedDocumentPayload {
  format: 'JSON'
  /** Base64 of the serialized signed document — the exact submitted bytes. */
  document: string
  /** SHA-256 hex digest of the serialized signed document. */
  documentHash: string
  /** The document's eInvoiceCodeOrNumber. */
  codeNumber: string
  /** The signed UBL document as an object, for preview/inspection. */
  signedDocument: CompleteInvoice
}

/**
 * Signs one document and builds the exact submission entry, without
 * submitting it. Throws if the signed document exceeds the 300KB limit.
 */
export function buildSignedDocument(
  doc: AllDocumentsV1_1,
  signingCredentials: SigningCredentials,
): SignedDocumentPayload {
  // Sign the single document (generateCompleteDocument expects an array)
  const signedDocument = generateCompleteDocument([doc], signingCredentials)

  const docJson = JSON.stringify(signedDocument)

  const documentHash = crypto
    .createHash('sha256')
    .update(docJson, 'utf8')
    .digest('hex')

  const docBase64 = Buffer.from(docJson, 'utf8').toString('base64')

  // Enforce the 300 KB per-document limit on the decoded size
  const rawSize = Buffer.byteLength(docBase64, 'base64')
  if (rawSize > 300 * 1024) {
    throw new Error(
      `Submission rejected: Document ${doc.eInvoiceCodeOrNumber} is ${rawSize} bytes – exceeds 300KB limit`,
    )
  }

  return {
    format: 'JSON',
    document: docBase64,
    documentHash,
    codeNumber: doc.eInvoiceCodeOrNumber,
    signedDocument,
  }
}

const isPrebuiltPayload = (
  doc: AllDocumentsV1_1 | SignedDocumentPayload,
): doc is SignedDocumentPayload =>
  (doc as SignedDocumentPayload).format === 'JSON' &&
  typeof (doc as SignedDocumentPayload).document === 'string' &&
  typeof (doc as SignedDocumentPayload).documentHash === 'string'

export async function submitDocument(
  context: SubmissionContext,
  documents: (AllDocumentsV1_1 | SignedDocumentPayload)[],
): Promise<{
  data: SubmissionResponse
  status: number
}> {
  const { fetch, debug, signingCredentials } = context

  // 🔒 Hard enforcement of platform submission limits
  if (documents.length > 100) {
    throw new Error(
      'Submission rejected: Cannot submit more than 100 documents at once',
    )
  }

  if (debug) {
    console.log(`📦 Preparing to submit ${documents.length} document(s)...`)
  }

  // Each document is signed and encoded separately. Prebuilt payloads (from
  // buildSignedDocument) are submitted byte-for-byte as stored; raw invoices
  // are signed here. The wire format carries no `signedDocument` field.
  const submissionPayload = {
    documents: documents.map(doc => {
      const { format, document, documentHash, codeNumber } = isPrebuiltPayload(
        doc,
      )
        ? doc
        : buildSignedDocument(doc, signingCredentials)

      if (debug) {
        console.log('—'.repeat(60))
        console.log(`📄 Prepared document: ${codeNumber}`)
        console.log(`   • Base64 size: ${document.length} bytes`)
      }

      return { format, document, documentHash, codeNumber }
    }),
  }

  const payloadSize = Buffer.byteLength(JSON.stringify(submissionPayload))

  if (payloadSize > 5 * 1024 * 1024) {
    throw new Error(
      `Submission rejected: Payload is ${payloadSize} bytes – exceeds 5MB limit`,
    )
  }

  if (debug) {
    console.log('🚀 Submission payload structure:')
    console.log('- Format: JSON')
    console.log('- Documents count:', submissionPayload.documents.length)
    console.log('- Total payload size:', payloadSize, 'bytes')
  }

  // Submit to MyInvois API with proper headers
  const response = await fetch('/api/v1.0/documentsubmissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submissionPayload),
  })

  const responseData = (await response.json()) as SubmissionResponse

  if (debug) {
    console.log(`📡 API Response status: ${response.status}`)

    if (responseData.rejectedDocuments?.length > 0) {
      responseData.rejectedDocuments.forEach((doc, index) => {
        console.log(`  Document ${index + 1}:`, doc.invoiceCodeNumber)
        if (doc.error) {
          console.log(`    Error:`, doc.error.message)
          if (doc.error.details) {
            doc.error.details.forEach((detail, detailIndex) => {
              console.log(`      Detail ${detailIndex + 1}:`, detail.message)
            })
          }
        }
      })
    }
  }

  const data = responseData as SubmissionResponse

  if (debug) {
    if (response.status !== 202) {
      console.error('❌ Submission failed with status:', response.status)
      console.error('❌ Response data:', JSON.stringify(data, null, 2))
    } else {
      console.log('✅ Submission successful!')
      console.log(`📋 Submission UID: ${data.submissionUid}`)
      console.log(
        `✅ Accepted documents: ${data.acceptedDocuments?.length || 0}`,
      )
      console.log(
        `❌ Rejected documents: ${data.rejectedDocuments?.length || 0}`,
      )
    }
  }

  return {
    data,
    status: response.status,
  }
}

export async function getSubmissionStatus(
  context: Pick<SubmissionContext, 'fetch' | 'debug'>,
  submissionUid: string,
  // Official guidance: poll every 3-5 seconds.
  // https://sdk.myinvois.hasil.gov.my/einvoicingapi/06-get-submission/
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
  const { fetch, debug } = context

  try {
    const response = await fetch(
      `/api/v1.0/documentsubmissions/${encodeURIComponent(submissionUid)}?pageNo=${pageNo}&pageSize=${pageSize}`,
    )

    const data = (await response.json()) as GetSubmissionResponse

    if (debug) {
      console.log('Submission:', data)
      if (data.error) {
        console.log('Submission error details:', data.error.details)
      }
    }

    // Terminal statuses per the official docs: Valid, PartiallyValid and
    // Invalid all mean processing has finished — only "in progress" warrants
    // another poll.
    // https://sdk.myinvois.hasil.gov.my/einvoicingapi/06-get-submission/
    if (
      data.overallStatus === 'Valid' ||
      data.overallStatus === 'PartiallyValid' ||
      data.overallStatus === 'Invalid'
    ) {
      return {
        status: data.overallStatus,
        documentSummary: data.documentSummary,
      }
    }

    // If we have retries left, continue polling for any non-completed status or errors
    if (maxRetries > 0) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      return await getSubmissionStatus(
        context,
        submissionUid,
        pollInterval,
        maxRetries - 1,
        pageNo,
        pageSize,
      )
    }

    return {
      status: data.overallStatus || 'TimedOut',
      documentSummary: data.documentSummary,
      error:
        data.error ??
        ({
          code: 'Timeout',
          message: 'Submission timed out',
          target: 'submission',
          details: [],
        } satisfies StandardError),
    }
  } catch (error) {
    // Handle any request errors by retrying if we have retries left
    if (maxRetries > 0) {
      if (debug) {
        console.log('Request error, retrying...', error)
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      return await getSubmissionStatus(
        context,
        submissionUid,
        pollInterval,
        maxRetries - 1,
        pageNo,
        pageSize,
      )
    }

    // No retries left - return timeout
    return {
      status: 'TimedOut',
      documentSummary: [],
      error: {
        code: 'Timeout',
        message: 'Submission timed out after request errors',
        target: 'submission',
        details: [],
      },
    }
  }
}

export async function performDocumentAction(
  context: Pick<SubmissionContext, 'fetch'>,
  documentUid: string,
  status: 'rejected' | 'cancelled',
  reason: string,
): Promise<{
  uuid: string
  status: string
  error?: StandardError
}> {
  if (reason.length > 300) {
    throw new Error('Reason must not exceed 300 characters')
  }

  const { fetch } = context
  const response = await fetch(
    `/api/v1.0/documents/state/${encodeURIComponent(documentUid)}/state`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        reason,
      }),
    },
  )

  const data = (await response.json()) as {
    uuid: string
    status: string
    error?: StandardError
  }

  return data
}
