import type { InvoiceV1_1 } from '../types/documents/index.js'

/**
 * MyInvois Invoice Validation Utilities
 *
 * Provides comprehensive validation for invoice data before document generation
 * and submission to ensure compliance with MyInvois business rules and format requirements.
 */

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  code: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning extends ValidationError {
  severity: 'warning'
}

/**
 * Validates TIN format based on registration type
 */
export const validateTIN = (
  tin: string,
  registrationType?: string,
): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!tin) {
    errors.push({
      field: 'tin',
      code: 'TIN_REQUIRED',
      message: 'TIN is required',
      severity: 'error',
    })
    return errors
  }

  // TIN format validation based on type
  if (registrationType === 'BRN' && !tin.startsWith('C')) {
    errors.push({
      field: 'tin',
      code: 'TIN_FORMAT_INVALID',
      message: 'Company TIN should start with "C" for BRN registration',
      severity: 'warning',
    })
  }

  if (registrationType === 'NRIC' && !tin.startsWith('IG')) {
    errors.push({
      field: 'tin',
      code: 'TIN_FORMAT_INVALID',
      message: 'Individual TIN should start with "IG" for NRIC registration',
      severity: 'warning',
    })
  }

  // Length validation
  if (tin.length > 14) {
    errors.push({
      field: 'tin',
      code: 'TIN_LENGTH_INVALID',
      message: 'TIN cannot exceed 14 characters',
      severity: 'error',
    })
  }

  return errors
}

/**
 * Validates contact number format (E.164 standard)
 */
export const validateContactNumber = (
  contactNumber: string,
): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!contactNumber || contactNumber === 'NA') {
    return errors // Allow NA for consolidated e-invoices
  }

  // E.164 format validation
  const e164Regex = /^\+[1-9]\d{1,14}$/
  if (!e164Regex.test(contactNumber)) {
    errors.push({
      field: 'contactNumber',
      code: 'CONTACT_FORMAT_INVALID',
      message: 'Contact number must be in E.164 format (e.g., +60123456789)',
      severity: 'error',
    })
  }

  if (contactNumber.length < 8) {
    errors.push({
      field: 'contactNumber',
      code: 'CONTACT_LENGTH_INVALID',
      message: 'Contact number must be at least 8 characters',
      severity: 'error',
    })
  }

  return errors
}

/**
 * Validates monetary amounts
 */
export const validateMonetaryAmount = (
  amount: number,
  fieldName: string,
  maxDigits = 18,
  maxDecimals = 2,
): ValidationError[] => {
  const errors: ValidationError[] = []

  if (amount < 0) {
    errors.push({
      field: fieldName,
      code: 'AMOUNT_NEGATIVE',
      message: `${fieldName} cannot be negative`,
      severity: 'error',
    })
  }

  // Check total digits
  const amountStr = amount.toString()
  const [integerPart, decimalPart] = amountStr.split('.')

  if (integerPart && integerPart.length > maxDigits - maxDecimals) {
    errors.push({
      field: fieldName,
      code: 'AMOUNT_DIGITS_EXCEEDED',
      message: `${fieldName} exceeds maximum ${maxDigits} digits`,
      severity: 'error',
    })
  }

  if (decimalPart && decimalPart.length > maxDecimals) {
    errors.push({
      field: fieldName,
      code: 'AMOUNT_DECIMALS_EXCEEDED',
      message: `${fieldName} exceeds maximum ${maxDecimals} decimal places`,
      severity: 'error',
    })
  }

  return errors
}

/**
 * Validates tax calculation consistency
 */
export const validateTaxCalculations = (
  invoice: InvoiceV1_1,
): ValidationError[] => {
  const errors: ValidationError[] = []

  // Calculate expected totals from line items
  const expectedTaxExclusive = invoice.invoiceLineItems.reduce(
    (sum, item) => sum + item.totalTaxableAmountPerLine,
    0,
  )
  const expectedTaxAmount = invoice.invoiceLineItems.reduce(
    (sum, item) => sum + item.taxAmount,
    0,
  )

  // Allow small rounding differences (0.01)
  const tolerance = 0.01

  if (
    Math.abs(
      invoice.legalMonetaryTotal.taxExclusiveAmount - expectedTaxExclusive,
    ) > tolerance
  ) {
    errors.push({
      field: 'legalMonetaryTotal.taxExclusiveAmount',
      code: 'TAX_EXCLUSIVE_MISMATCH',
      message: `Tax exclusive amount (${invoice.legalMonetaryTotal.taxExclusiveAmount}) doesn't match sum of line items (${expectedTaxExclusive})`,
      severity: 'error',
    })
  }

  if (Math.abs(invoice.taxTotal.taxAmount - expectedTaxAmount) > tolerance) {
    errors.push({
      field: 'taxTotal.taxAmount',
      code: 'TAX_AMOUNT_MISMATCH',
      message: `Tax amount (${invoice.taxTotal.taxAmount}) doesn't match sum of line item taxes (${expectedTaxAmount})`,
      severity: 'error',
    })
  }

  return errors
}

/**
 * Main validation function for complete invoice
 */
export const validateInvoice = (invoice: InvoiceV1_1): ValidationResult => {
  const allErrors: ValidationError[] = []

  // Core field validations
  allErrors.push(
    ...validateTIN(invoice.supplier.tin, invoice.supplier.registrationType),
  )
  allErrors.push(
    ...validateTIN(invoice.buyer.tin, invoice.buyer.registrationType),
  )

  allErrors.push(...validateContactNumber(invoice.supplier.contactNumber))
  allErrors.push(...validateContactNumber(invoice.buyer.contactNumber))

  // Monetary validations
  allErrors.push(
    ...validateMonetaryAmount(
      invoice.legalMonetaryTotal.taxExclusiveAmount,
      'taxExclusiveAmount',
    ),
  )
  allErrors.push(
    ...validateMonetaryAmount(
      invoice.legalMonetaryTotal.payableAmount,
      'payableAmount',
    ),
  )
  allErrors.push(
    ...validateMonetaryAmount(invoice.taxTotal.taxAmount, 'taxAmount'),
  )

  // Line item validations
  invoice.invoiceLineItems.forEach((item, index) => {
    allErrors.push(
      ...validateMonetaryAmount(item.unitPrice, `lineItem[${index}].unitPrice`),
    )
    allErrors.push(
      ...validateMonetaryAmount(item.taxAmount, `lineItem[${index}].taxAmount`),
    )
    allErrors.push(
      ...validateMonetaryAmount(
        item.totalTaxableAmountPerLine,
        `lineItem[${index}].totalTaxableAmountPerLine`,
      ),
    )
  })

  // Business rule validations
  allErrors.push(...validateTaxCalculations(invoice))

  // Separate errors and warnings
  const errors = allErrors.filter(e => e.severity === 'error')
  const warnings = allErrors.filter(
    e => e.severity === 'warning',
  ) as ValidationWarning[]

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
