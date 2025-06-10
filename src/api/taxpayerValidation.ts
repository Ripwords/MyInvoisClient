import type {
  Fetch,
  RegistrationType,
  StandardError,
  TaxpayerQRCodeResponse,
} from '../types'

interface TaxpayerContext {
  fetch: Fetch
  debug: boolean
}

interface TinSearchParams {
  taxpayerName?: string
  idType?: RegistrationType
  idValue?: string
}

interface TinSearchResponse {
  tin: string
}

export async function tinSearch(
  context: TaxpayerContext,
  params: TinSearchParams,
): Promise<TinSearchResponse | StandardError> {
  const { fetch, debug } = context
  const { taxpayerName, idType, idValue } = params

  // Validate input parameters according to API requirements
  if (!taxpayerName && (!idType || !idValue)) {
    throw new Error(
      'Either taxpayerName must be provided, or both idType and idValue must be provided',
    )
  }

  if ((idType && !idValue) || (!idType && idValue)) {
    throw new Error('idType and idValue must be provided together')
  }

  // Build query parameters
  const queryParams = new URLSearchParams()

  if (taxpayerName) {
    queryParams.append('taxpayerName', taxpayerName)
  }

  if (idType && idValue) {
    queryParams.append('idType', idType)
    queryParams.append('idValue', idValue)
  }

  const queryString = queryParams.toString()

  try {
    const response = await fetch(
      `/api/v1.0/taxpayer/search/tin?${queryString}`,
      {
        method: 'GET',
      },
    )

    if (response.status === 200) {
      return (await response.json()) as TinSearchResponse
    }

    // Handle specific error cases mentioned in the API documentation
    if (response.status === 400) {
      const errorData = (await response.json()) as StandardError
      if (debug) {
        console.error(
          'TIN search failed - search criteria not conclusive or invalid parameters:',
          errorData,
        )
      }
      return errorData
    }

    if (response.status === 404) {
      const errorData = (await response.json()) as StandardError
      if (debug) {
        console.error(
          'TIN search failed - no TIN found for given search criteria:',
          errorData,
        )
      }
      return errorData
    }

    // Handle other error status codes
    const errorData = (await response.json()) as StandardError
    if (debug) {
      console.error(
        'TIN search failed with status:',
        response.status,
        errorData,
      )
    }
    return errorData
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
      `/api/v1.0/taxpayer/validate/${tin}?idType=${idType}&idValue=${idValue}`,
      {
        method: 'GET',
      },
    )

    if (response.status === 200) {
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
): Promise<TaxpayerQRCodeResponse | StandardError> {
  const { fetch } = context

  const base64EncodedQRCodeText = Buffer.from(qrCodeText).toString('base64')

  const response = await fetch(
    `/api/v1.0/taxpayer/qrcodeinfo/${base64EncodedQRCodeText}`,
  )

  return response.json()
}
