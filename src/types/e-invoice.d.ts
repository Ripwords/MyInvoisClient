/**
 * Represents the allowed codes for e-Invoice types.
 * Based on the documentation: https://sdk.myinvois.hasil.gov.my/codes/e-invoice-types/
 */
export type EInvoiceTypeCode =
  | '01' // Invoice
  | '02' // Credit Note
  | '03' // Debit Note
  | '04' // Refund Note
  | '11' // Self-billed Invoice
  | '12' // Self-billed Credit Note
  | '13' // Self-billed Debit Note
  | '14' // Self-billed Refund Note

/**
 * Interface representing an e-Invoice type entry.
 * Contains the code and its corresponding description.
 */
export interface EInvoiceType {
  code: EInvoiceTypeCode
  description: string
}

