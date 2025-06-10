import type {
  InvoiceV1_1,
  SubmissionResponse,
  SigningCredentials,
  SubmissionStatus,
  DocumentSummary,
  Fetch,
  StandardError,
} from '../types'
import { generateCompleteDocument } from '../utils/document'

interface SubmissionContext {
  fetch: Fetch
  debug: boolean
  signingCredentials: SigningCredentials
}

export async function submitDocument(
  context: SubmissionContext,
  documents: InvoiceV1_1[],
): Promise<{
  data: SubmissionResponse
  status: number
}> {
  const { fetch, debug, signingCredentials } = context

  if (debug) {
    console.log(`📦 Preparing to submit ${documents.length} document(s)...`)
  }

  // Generate the complete signed document structure first
  const completeDocument = generateCompleteDocument(
    documents,
    signingCredentials,
  )

  if (debug) {
    console.log('✅ Documents signed successfully')
    console.log('📄 Document structure keys:', Object.keys(completeDocument))
    console.log('📊 Number of invoices:', completeDocument.Invoice.length)
  }

  // Convert the complete document to JSON string
  const documentJson = JSON.stringify(completeDocument)

  if (debug) {
    console.log(`📏 Document JSON size: ${documentJson.length} bytes`)
  }

  // Generate SHA256 hash of the JSON document
  const crypto = await import('crypto')
  const documentHash = crypto
    .createHash('sha256')
    .update(documentJson, 'utf8')
    .digest('hex')

  // Base64 encode the JSON document
  const documentBase64 = Buffer.from(documentJson, 'utf8').toString('base64')

  if (debug) {
    console.log(`🔒 Document hash: ${documentHash.substring(0, 16)}...`)
    console.log(`📦 Base64 size: ${documentBase64.length} bytes`)
  }

  // Build the submission payload according to MyInvois API format
  const submissionPayload = {
    documents: documents.map(doc => ({
      format: 'JSON', // We're submitting JSON format
      document: documentBase64, // Base64 encoded complete document
      documentHash: documentHash, // SHA256 hash of the JSON
      codeNumber: doc.eInvoiceCodeOrNumber, // Document reference number
    })),
  }

  if (debug) {
    console.log('🚀 Submission payload structure:')
    console.log('- Format: JSON')
    console.log('- Documents count:', submissionPayload.documents.length)
    console.log(
      '- Total payload size:',
      JSON.stringify(submissionPayload).length,
      'bytes',
    )

    // Validate submission constraints
    const payloadSize = JSON.stringify(submissionPayload).length
    if (payloadSize > 5 * 1024 * 1024) {
      // 5MB
      console.warn('⚠️  WARNING: Payload size exceeds 5MB limit')
    }

    if (documents.length > 100) {
      console.warn('⚠️  WARNING: Document count exceeds 100 document limit')
    }

    if (documentJson.length > 300 * 1024) {
      // 300KB per document
      console.warn('⚠️  WARNING: Document size exceeds 300KB limit')
    }
  }

  // Submit to MyInvois API with proper headers
  const response = await fetch('/api/v1.0/documentsubmissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submissionPayload),
  })

  if (debug) {
    console.log(`📡 API Response status: ${response.status}`)
  }

  const data = (await response.json()) as SubmissionResponse

  if (debug) {
    if (response.status !== 202) {
      console.error('❌ Submission failed with status:', response.status)
      console.error('❌ Response data:', data)
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
  const { fetch, debug } = context

  try {
    const response = await fetch(
      `/api/v1.0/documentsubmissions/${submissionUid}`,
    )

    const data = await response.json()

    if (debug) {
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
      return await getSubmissionStatus(
        context,
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
      if (debug) {
        console.log('Request error, retrying...', error)
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      return await getSubmissionStatus(
        context,
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

export async function performDocumentAction(
  documentUid: string,
  status: 'rejected' | 'cancelled',
  reason: string,
): Promise<{
  uuid: string
  status: string
  error: StandardError
}> {
  const response = await fetch(
    `/api/v1.0/documents/state/${documentUid}/state`,
    {
      method: 'POST',
      body: JSON.stringify({
        status,
        reason,
      }),
    },
  )

  const data = (await response.json()) as {
    uuid: string
    status: string
    error: StandardError
  }

  return data
}
