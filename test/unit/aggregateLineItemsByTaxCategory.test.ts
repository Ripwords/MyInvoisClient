import { describe, it, expect } from 'vitest'
import { aggregateLineItemsByTaxCategory } from '../../src/utils/lineItems'
import type { InvoiceLineItem } from '../../src/types'

const item = ({
  quantity = 1,
  ...over
}: Partial<InvoiceLineItem>): InvoiceLineItem => ({
  itemClassificationCode: '022',
  itemDescription: 'x',
  unitPrice: 0,
  quantity,
  taxType: '02',
  taxAmount: 0,
  totalTaxableAmountPerLine: 0,
  totalAmountPerLine: 0,
  ...over,
})

describe('aggregateLineItemsByTaxCategory', () => {
  it('collapses lines that share a tax category and sums the money', () => {
    const result = aggregateLineItemsByTaxCategory([
      item({ taxType: '02', taxRate: 8, totalTaxableAmountPerLine: 100, taxAmount: 8, totalAmountPerLine: 108 }),
      item({ taxType: '02', taxRate: 8, totalTaxableAmountPerLine: 50, taxAmount: 4, totalAmountPerLine: 54 }),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]!.taxType).toBe('02')
    expect(result[0]!.taxRate).toBe(8)
    expect(result[0]!.totalTaxableAmountPerLine).toBe(150)
    expect(result[0]!.taxAmount).toBe(12)
    expect(result[0]!.totalAmountPerLine).toBe(162)
  })

  it('keeps different tax types / rates as separate lines, in first-seen order', () => {
    const result = aggregateLineItemsByTaxCategory([
      item({ taxType: '02', taxRate: 8, totalTaxableAmountPerLine: 100, taxAmount: 8 }),
      item({ taxType: '03', totalTaxableAmountPerLine: 0, taxAmount: 10 }),
      item({ taxType: '02', taxRate: 6, totalTaxableAmountPerLine: 50, taxAmount: 3 }),
      item({ taxType: '06', taxRate: 0, totalTaxableAmountPerLine: 200, taxAmount: 0 }),
    ])

    // 02@8, 03, 02@6, 06 are four distinct categories (rate is part of the key)
    expect(result.map(r => `${r.taxType}@${r.taxRate ?? '-'}`)).toEqual([
      '02@8',
      '03@-',
      '02@6',
      '06@0',
    ])
  })

  it('derives a representative unitPrice from taxable / quantity', () => {
    const [line] = aggregateLineItemsByTaxCategory([
      item({ taxType: '02', taxRate: 8, quantity: 2, totalTaxableAmountPerLine: 100, taxAmount: 8 }),
      item({ taxType: '02', taxRate: 8, quantity: 3, totalTaxableAmountPerLine: 50, taxAmount: 4 }),
    ])
    // quantity 5, taxable 150 -> unitPrice 30
    expect(line!.quantity).toBe(5)
    expect(line!.unitPrice).toBe(30)
  })

  it('lets the caller supply a description per group', () => {
    const [line] = aggregateLineItemsByTaxCategory(
      [item({ taxType: '03', taxAmount: 10 })],
      { describe: group => `Tourism Tax x${group.length}` },
    )
    expect(line!.itemDescription).toBe('Tourism Tax x1')
  })

  it('returns an empty array for no items', () => {
    expect(aggregateLineItemsByTaxCategory([])).toEqual([])
  })
})
