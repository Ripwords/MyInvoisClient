export const getBaseUrl = (environment: 'sandbox' | 'production'): string => {
  return environment === 'sandbox'
    ? 'https://preprod-api.myinvois.hasil.gov.my'
    : 'https://api.myinvois.hasil.gov.my'
}
