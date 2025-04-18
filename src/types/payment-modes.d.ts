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
 * Enum representing the allowed payment mode codes with descriptive names.
 * Provides a more readable way to reference payment modes.
 *
 * @example
 * const mode = PaymentModeCodeEnum.Cash;
 * console.log(mode); // Output: "01"
 */
export enum PaymentModeCodeEnum {
  Cash = '01',
  Cheque = '02',
  BankTransfer = '03',
  CreditCard = '04',
  DebitCard = '05',
  EWalletDigitalWallet = '06',
  DigitalBank = '07',
  Others = '08',
}

/**
 * Interface representing a payment mode entry.
 * Contains the code and its corresponding description.
 */
export interface PaymentMode {
  code: PaymentModeCode
  description: string
}
