import { ensureOk, toApiError } from '../errors'
import { formatIdValue } from '../utils/formatIdValue'
import type {
  Fetch,
  RegistrationType,
  TaxpayerQRCodeResponse,
  TinSearchParams,
  TinSearchResponse,
} from '../types'

interface TaxpayerContext {
  fetch: Fetch
  debug: boolean
}

export async function tinSearch(
  context: TaxpayerContext,
  params: TinSearchParams,
): Promise<TinSearchResponse> {
  const { fetch, debug } = context
  const { taxpayerName, idType, idValue, fileType } = params

  // Validate input parameters according to API requirements
  // Valid combinations:
  // 1. taxpayerName alone
  // 2. taxpayerName + idType + idValue (all three)
  // 3. idType + idValue (both)
  // 4. idType + idValue + fileType (all three)
  // 5. All parameters together (AND operator)

  // idType and idValue must be provided together
  if ((idType && !idValue) || (!idType && idValue)) {
    throw new Error('idType and idValue must be provided together')
  }

  // fileType can only be provided with idType and idValue
  if (fileType && (!idType || !idValue)) {
    throw new Error(
      'fileType can only be provided together with idType and idValue',
    )
  }

  // Must have at least one valid combination:
  // - taxpayerName alone, OR
  // - idType + idValue (with optional fileType)
  if (!taxpayerName && (!idType || !idValue)) {
    throw new Error(
      'Either taxpayerName must be provided, or both idType and idValue must be provided',
    )
  }

  // Build query parameters
  const queryParams = new URLSearchParams()

  if (idType && idValue) {
    queryParams.append('idType', idType)
    queryParams.append('idValue', formatIdValue(idValue))
  }

  if (fileType) {
    queryParams.append('fileType', fileType)
  }

  if (taxpayerName) {
    // The API rejects `idName` with 400 "Invalid request parameters";
    // the accepted param is `taxpayerName` (verified against preprod).
    queryParams.append('taxpayerName', taxpayerName)
  }

  const queryString = queryParams.toString()

  try {
    const response = await fetch(
      `/api/v1.0/taxpayer/search/tin?${queryString}`,
      {
        method: 'GET',
      },
    )
    await ensureOk(response, 'search TIN')
    return (await response.json()) as TinSearchResponse
  } catch (error) {
    if (debug) {
      console.error('TIN search error:', error)
    }
    throw error
  }
}

export async function verifyTin(
  context: TaxpayerContext,
  tin: string,
  idType: RegistrationType,
  idValue: string,
): Promise<boolean> {
  const { fetch, debug } = context

  try {
    const query = new URLSearchParams({
      idType,
      idValue: formatIdValue(idValue),
    })
    const response = await fetch(
      `/api/v1.0/taxpayer/validate/${encodeURIComponent(tin)}?${query.toString()}`,
      {
        method: 'GET',
      },
    )

    if (!response) {
      throw new Error('TIN validation received no response from fetch')
    }

    if (response.ok || response.status === 200) {
      return true
    }

    // 404 is the API's "this TIN/ID combination is not registered" answer —
    // the only failure that actually means "invalid". Everything else
    // (400/401/429/5xx) is a request problem or an outage and must not be
    // reported to callers as "TIN invalid".
    if (response.status === 404) {
      return false
    }

    throw await toApiError(response, 'validate TIN')
  } catch (error) {
    if (debug) {
      console.error(error)
    }
    throw error
  }
}

/**
 * The scanned QR contains a Base64 string whose DECODED value (a UUID-like
 * token) is what the API expects in the path:
 * https://sdk.myinvois.hasil.gov.my/einvoicingapi/11-qr-code/
 *
 * Accept either form: if the input is Base64 that decodes to a printable
 * ASCII token, use the decoded value; otherwise assume the caller already
 * decoded it and pass it through.
 */
const decodeQrCodeText = (qrCodeText: string): string => {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(qrCodeText)) return qrCodeText
  try {
    const decoded = Buffer.from(qrCodeText, 'base64').toString('utf8')
    // Round-trip check (rejects non-canonical base64) + printable-ASCII check.
    const canonical = Buffer.from(decoded, 'utf8').toString('base64')
    if (
      canonical.replace(/=+$/, '') === qrCodeText.replace(/=+$/, '') &&
      /^[\x21-\x7e]+$/.test(decoded)
    ) {
      return decoded
    }
  } catch {
    // fall through — treat the input as already decoded
  }
  return qrCodeText
}

export async function taxpayerQRCode(
  context: TaxpayerContext,
  qrCodeText: string,
): Promise<TaxpayerQRCodeResponse> {
  const { fetch } = context

  const response = await fetch(
    // Plural `taxpayers` is correct here (unlike validate/search which use
    // singular `taxpayer`) — the singular route does not exist and returns a
    // generic 404 "Resource not found".
    `/api/v1.0/taxpayers/qrcodeinfo/${encodeURIComponent(decodeQrCodeText(qrCodeText))}`,
  )

  await ensureOk(response, 'fetch taxpayer QR code info')

  return response.json()
}
