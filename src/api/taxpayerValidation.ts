import type { Fetch, RegistrationType } from '../types'

interface TaxpayerContext {
  fetch: Fetch
  debug: boolean
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
