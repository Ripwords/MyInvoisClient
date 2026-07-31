import { describe, it, expect } from 'vitest'
import {
  validateInvoice,
  validateTIN,
  validateContactNumber,
  validateMonetaryAmount,
  validateLineItemTax,
  validateTaxCalculations,
} from '../../src/utils/validation'
import { legacyInvoice } from '../fixtures/legacy-invoice'
import type {
  InvoiceLineItem,
  ClassificationCode,
  TaxTypeCode,
  UnitTypeCode,
} from '../../src/types'

const line = (overrides: Partial<InvoiceLineItem>): InvoiceLineItem => ({
  itemClassificationCode: '004' as ClassificationCode,
  itemDescription: 'Item',
  unitPrice: 100,
  taxType: '01' as TaxTypeCode,
  taxRate: 6,
  taxAmount: 6,
  totalTaxableAmountPerLine: 100,
  totalAmountPerLine: 106,
  ...overrides,
})

describe('validateInvoice', () => {
  it('accepts the legacy fixture, with TIN format warnings only', () => {
    const result = validateInvoice(legacyInvoice)

    // The fixture's supplier ('C1234567890') and buyer ('EI00000000010')
    // both declare registrationType 'NRIC' without the 'IG' prefix, which
    // produces warnings — not errors — so the invoice is still valid.
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toHaveLength(2)
    expect(
      result.warnings.every(w => w.code === 'TIN_FORMAT_INVALID'),
    ).toBe(true)
  })
})

describe('validateTIN', () => {
  it('passes a valid-shaped company TIN', () => {
    expect(validateTIN('C26135266000', 'BRN')).toEqual([])
  })

  it('fails an over-long TIN', () => {
    const errors = validateTIN('C123456789012345', 'BRN')
    expect(errors.map(e => e.code)).toContain('TIN_LENGTH_INVALID')
  })
})

describe('validateContactNumber', () => {
  it('passes a valid +60 E.164 number', () => {
    expect(validateContactNumber('+60123456789')).toEqual([])
  })

  it('fails a number containing letters', () => {
    const errors = validateContactNumber('+60ABC456789')
    expect(errors.map(e => e.code)).toContain('CONTACT_FORMAT_INVALID')
  })
})

describe('validateMonetaryAmount', () => {
  it('passes a 2-decimal-place amount', () => {
    expect(validateMonetaryAmount(123.45, 'amount')).toEqual([])
  })

  it('fails a 3-decimal-place amount', () => {
    const errors = validateMonetaryAmount(123.456, 'amount')
    expect(errors.map(e => e.code)).toContain('AMOUNT_DECIMALS_EXCEEDED')
  })

  it('fails a negative amount', () => {
    const errors = validateMonetaryAmount(-1, 'amount')
    expect(errors.map(e => e.code)).toContain('AMOUNT_NEGATIVE')
  })
})

describe('validateLineItemTax', () => {
  it('passes a consistent percentage-taxed line', () => {
    expect(validateLineItemTax(line({}), 0)).toEqual([])
  })

  it('fails when taxAmount does not match taxable × rate / 100', () => {
    const errors = validateLineItemTax(line({ taxAmount: 10 }), 0)
    expect(errors.map(e => e.code)).toContain(
      'PERCENTAGE_TAX_CALCULATION_MISMATCH',
    )
  })

  it('fails a fixed-rate line where taxAmount ≠ taxPerUnitAmount × baseUnitMeasure', () => {
    const errors = validateLineItemTax(
      line({
        taxType: '03' as TaxTypeCode,
        taxRate: undefined,
        taxPerUnitAmount: 10,
        baseUnitMeasure: 2,
        baseUnitMeasureCode: 'DAY' as UnitTypeCode,
        taxAmount: 25,
      }),
      0,
    )
    expect(errors.map(e => e.code)).toContain('FIXED_TAX_CALCULATION_MISMATCH')
  })
})

describe('validateTaxCalculations', () => {
  it('passes an internally consistent invoice', () => {
    expect(validateTaxCalculations(legacyInvoice)).toEqual([])
  })

  it('fails when taxTotal.taxAmount is tampered', () => {
    const tampered = {
      ...legacyInvoice,
      taxTotal: { ...legacyInvoice.taxTotal, taxAmount: 99 },
    }
    const errors = validateTaxCalculations(tampered)
    expect(errors.map(e => e.code)).toContain('TAX_AMOUNT_MISMATCH')
  })
})
