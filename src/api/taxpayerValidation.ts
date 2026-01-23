import { formatIdValue } from 'src/utils/formatIdValue'
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
    queryParams.append('idName', taxpayerName)
  }

  const queryString = queryParams.toString()

  try {
    const response = await fetch(
      `/api/v1.0/taxpayer/search/tin?${queryString}`,
      {
        method: 'GET',
      },
    )
    if (!response.ok) {
      throw new Error(`Failed to search TIN: ${await response.text()}`)
    }
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
    const response = await fetch(
      `/api/v1.0/taxpayer/validate/${tin}?idType=${idType}&idValue=${formatIdValue(idValue)}`,
      {
        method: 'GET',
      },
    )

    if (!response) {
      // Fetch was stubbed to return undefined or network error occurred
      return false
    }

    if (response.ok || response.status === 200) {
      return true
    }

    return false
  } catch (error) {
    if (debug) {
      console.error(error)
    }
    return false
  }
}

export async function taxpayerQRCode(
  context: TaxpayerContext,
  qrCodeText: string,
): Promise<TaxpayerQRCodeResponse> {
  const { fetch } = context

  const base64EncodedQRCodeText = Buffer.from(qrCodeText).toString('base64')

  const response = await fetch(
    `/api/v1.0/taxpayer/qrcodeinfo/${base64EncodedQRCodeText}`,
  )

  return response.json()
}
