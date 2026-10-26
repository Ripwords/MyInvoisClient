import { describe, it, expect, vi } from 'vitest'
import { formatIdValue } from '../../src/utils/formatIdValue'
import {
  createFixedRateTaxLineItem,
  calculateInvoiceTotals,
} from '../../src/utils/document'
import { searchDocuments } from '../../src/api/documentManagement'
import type {
  InvoiceLineItem,
  ClassificationCode,
  TaxTypeCode,
  UnitTypeCode,
} from '../../src/types'

describe('formatIdValue', () => {
  it('trims and strips all non-alphanumeric characters', () => {
    expect(formatIdValue(' 1234-56 ')).toBe('123456')
    expect(formatIdValue('AB_12.34/CD')).toBe('AB1234CD')
  })
})

describe('createFixedRateTaxLineItem', () => {
  it('computes taxAmount as taxPerUnitAmount × baseUnitMeasure, rounded to 2dp', () => {
    // 0.1 * 3 === 0.30000000000000004 in raw float math
    const item = createFixedRateTaxLineItem({
      itemClassificationCode: '003' as ClassificationCode,
      itemDescription: 'Hotel Stay',
      unitPrice: 100,
      quantity: 1,
      taxType: '03' as TaxTypeCode,
      taxPerUnitAmount: 0.1,
      baseUnitMeasure: 3,
      baseUnitMeasureCode: 'DAY' as UnitTypeCode,
    })

    expect(item.taxAmount).toBe(0.3)
    expect(item.totalTaxableAmountPerLine).toBe(100)
    expect(item.totalAmountPerLine).toBe(100.3)
  })
})

describe('calculateInvoiceTotals', () => {
  it('sums two lines and a payableRoundingAmount to exact 2dp totals', () => {
    const lineItems: InvoiceLineItem[] = [
      {
        itemClassificationCode: '004' as ClassificationCode,
        itemDescription: 'A',
        unitPrice: 1.1,
        quantity: 1,
        taxType: '01' as TaxTypeCode,
        taxRate: 6,
        taxAmount: 0.07,
        totalTaxableAmountPerLine: 1.1, // 1.1 + 2.2 floats to 3.3000000000000003
        totalAmountPerLine: 1.17,
      },
      {
        itemClassificationCode: '004' as ClassificationCode,
        itemDescription: 'B',
        unitPrice: 2.2,
        quantity: 1,
        taxType: '01' as TaxTypeCode,
        taxRate: 6,
        taxAmount: 0.13,
        totalTaxableAmountPerLine: 2.2,
        totalAmountPerLine: 2.33,
      },
    ]

    const totals = calculateInvoiceTotals(lineItems, 0.05)

    expect(totals.legalMonetaryTotal.taxExclusiveAmount).toBe(3.3)
    expect(totals.taxTotal.taxAmount).toBe(0.2)
    expect(totals.legalMonetaryTotal.taxInclusiveAmount).toBe(3.5)
    expect(totals.legalMonetaryTotal.payableRoundingAmount).toBe(0.05)
    expect(totals.legalMonetaryTotal.payableAmount).toBe(3.55)
  })
})

describe('searchDocuments', () => {
  const makeContext = (payload: unknown) => ({
    fetch: vi.fn(async () => ({
      ok: true,
      json: async () => payload,
    })) as unknown as typeof fetch,
  })

  it('accepts a bare array response', async () => {
    const context = makeContext([{ uuid: 'abc', longID: 'LONG-2' }])
    const documents = await searchDocuments(context, {
      submissionDateFrom: '2026-07-01T00:00:00Z',
      submissionDateTo: '2026-07-31T23:59:59Z',
    })

    expect(documents).toHaveLength(1)
    expect(documents[0]!.longId).toBe('LONG-2')
  })
})
