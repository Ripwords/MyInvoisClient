import { RegistrationType } from './documents'
import { MSICCode } from './msic-codes'

export interface TaxpayerQRCodeResponse {
  tin: string
  name: string
  idType: RegistrationType
  idNumber: string
  sst: string
  email: string
  contactNumber: string
  ttx: string
  businessActivityDescriptionBM: string
  businessActivityDescriptionEN: string
  msic: MSICCode['code']
  addressLine1: string
  addressLine2: string
  postalZone: string
  city: string
  state: string
  country: string
  generatedTimestamp: string
}

export interface TinSearchParams {
  taxpayerName?: string
  idType?: RegistrationType
  idValue?: string
  fileType?: '1' | '2'
}

export interface TinSearchResponse {
  tin: string
}
