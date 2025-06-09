export type * from './documents.d.ts'
export type * from './country-code.d.ts'
export type * from './classification-codes.d.ts'
export type * from './payment-modes.d.ts'
export type * from './tax-types.d.ts'
export type * from './unit-types.d.ts'
export type * from './signatures.d.ts'
export type * from './currencies.d.ts'
export type * from './state-codes.d.ts'
export type * from './e-invoice.d.ts'
export type * from './msic-codes.d.ts'

export interface TokenResponse {
  access_token: string
  expires_in: number
}

export interface ClientCredentials {
  clientId: string
  clientSecret: string
  baseUrl: string
  onBehalfOf?: string
  debug?: boolean
}
