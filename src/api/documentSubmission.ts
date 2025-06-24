import type {
  AllDocumentsV1_1,
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
  documents: AllDocumentsV1_1[],
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

  // For batch submission, each document must be signed and encoded separately
  // Build the submission payload according to MyInvois API format
  const crypto = await import('crypto')

  const submissionPayload = {
    documents: await Promise.all(
      documents.map(async doc => {
        // 1️⃣ Sign the single document (generateCompleteDocument expects an array)
        const signedDocument = generateCompleteDocument(
          [doc],
          signingCredentials,
        )

        // 2️⃣ Serialize
        const docJson = JSON.stringify(signedDocument)

        // 3️⃣ Hash
        const docHash = crypto
          .createHash('sha256')
          .update(docJson, 'utf8')
          .digest('hex')

        // 4️⃣ Base64 encode
        const docBase64 = Buffer.from(docJson, 'utf8').toString('base64')

        // 🚨 Enforce 300 KB per-document limit
        const rawSize = Buffer.byteLength(docBase64, 'base64')
        if (rawSize > 300 * 1024) {
          throw new Error(
            `Submission rejected: Document ${doc.eInvoiceCodeOrNumber} is ${rawSize} bytes – exceeds 300KB limit`,
          )
        }

        if (debug) {
          console.log('—'.repeat(60))
          console.log(`📄 Prepared document: ${doc.eInvoiceCodeOrNumber}`)
          console.log(`   • JSON size : ${docJson.length} bytes`)
          console.log(`   • Base64 size: ${docBase64.length} bytes`)
        }

        return {
          format: 'JSON',
          document: docBase64,
          documentHash: docHash,
          codeNumber: doc.eInvoiceCodeOrNumber,
        }
      }),
    ),
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
      status: 'TimedOut',
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
      status: 'TimedOut',
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
