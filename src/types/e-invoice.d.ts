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

/**
 * Enum representing the allowed codes for e-Invoice types with descriptive names.
 * Provides a more readable way to reference e-Invoice types compared to using raw codes.
 *
 * @example
 * const invoiceCode = EInvoiceTypeCodeEnum.Invoice;
 * console.log(invoiceCode); // Output: "01"
 */
export enum EInvoiceTypeCodeEnum {
  Invoice = '01',
  CreditNote = '02',
  DebitNote = '03',
  RefundNote = '04',
  SelfBilledInvoice = '11',
  SelfBilledCreditNote = '12',
  SelfBilledDebitNote = '13',
  SelfBilledRefundNote = '14',
}
