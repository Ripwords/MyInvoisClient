/**
 * Represents the allowed codes for payment modes.
 * Based on the documentation: https://sdk.myinvois.hasil.gov.my/codes/payment-methods/
 */
export type PaymentModeCode =
  | '01' // Cash
  | '02' // Cheque
  | '03' // Bank Transfer
  | '04' // Credit Card
  | '05' // Debit Card
  | '06' // e-Wallet / Digital Wallet
  | '07' // Digital Bank
  | '08' // Others

/**
 * Interface representing a payment mode entry.
 * Contains the code and its corresponding description.
 */
export interface PaymentMode {
  code: PaymentModeCode
  description: string
}
