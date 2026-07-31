import type { InvoiceLineItem } from '../types'

export interface AggregateByTaxCategoryOptions {
  /**
   * Builds the grouping key for a line item. Lines sharing a key are merged
   * into a single aggregated line. Defaults to grouping by tax type + tax rate
   * + base unit measure code (so e.g. 6% SST and 8% SST stay separate).
   */
  keyFor?: (item: InvoiceLineItem) => string
  /**
   * Optional description for an aggregated line. Receives the group of source
   * line items and their key. Defaults to the first item's description.
   * Use this to inject consolidated-invoice descriptions (e.g. receipt ranges).
   */
  describe?: (group: InvoiceLineItem[], key: string) => string
}

const round2 = (n: number): number => Math.round(n * 100) / 100

const defaultKeyFor = (item: InvoiceLineItem): string =>
  // taxPerUnitAmount is part of the key: fixed-rate lines with different
  // per-unit amounts must not merge, or the aggregated line breaks the
  // invariant taxAmount = taxPerUnitAmount × baseUnitMeasure.
  `${item.taxType}|${item.taxRate ?? ''}|${item.taxPerUnitAmount ?? ''}|${item.baseUnitMeasureCode ?? ''}`

/**
 * Aggregates line items by tax category, producing one line item per distinct
 * category (tax type + rate). Monetary fields are summed; `unitPrice` is derived
 * as taxable / quantity when a quantity is present.
 *
 * This is the generic, MyInvois-spec part of building consolidated documents.
 * Data access, pricing math and consolidated descriptions remain the caller's
 * responsibility (pass `describe` to set per-group descriptions).
 *
 * Groups are returned in first-seen order.
 */
export const aggregateLineItemsByTaxCategory = (
  items: InvoiceLineItem[],
  options: AggregateByTaxCategoryOptions = {},
): InvoiceLineItem[] => {
  const keyFor = options.keyFor ?? defaultKeyFor

  const order: string[] = []
  const groups = new Map<string, InvoiceLineItem[]>()

  for (const item of items) {
    const key = keyFor(item)
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push(item)
  }

  return order.map(key => {
    const group = groups.get(key)!
    const first = group[0]!

    const taxable = group.reduce(
      (sum, i) => sum + (i.totalTaxableAmountPerLine ?? 0),
      0,
    )
    const tax = group.reduce((sum, i) => sum + (i.taxAmount ?? 0), 0)
    const total = group.reduce((sum, i) => sum + (i.totalAmountPerLine ?? 0), 0)
    const hasQuantity = group.some(i => i.quantity !== undefined)
    // A line without a quantity is a single unit (document generation treats
    // missing quantity as 1), not zero units.
    const quantity = hasQuantity
      ? group.reduce((sum, i) => sum + (i.quantity ?? 1), 0)
      : undefined
    const hasBaseUnitMeasure = group.some(i => i.baseUnitMeasure !== undefined)
    const baseUnitMeasure = hasBaseUnitMeasure
      ? group.reduce((sum, i) => sum + (i.baseUnitMeasure ?? 0), 0)
      : undefined

    const roundedTaxable = round2(taxable)
    const unitPrice =
      quantity && quantity > 0 ? round2(roundedTaxable / quantity) : first.unitPrice

    return {
      itemClassificationCode: first.itemClassificationCode,
      itemDescription: options.describe?.(group, key) ?? first.itemDescription,
      unitPrice,
      taxType: first.taxType,
      ...(first.taxRate !== undefined ? { taxRate: first.taxRate } : {}),
      ...(first.taxPerUnitAmount !== undefined
        ? { taxPerUnitAmount: first.taxPerUnitAmount }
        : {}),
      ...(baseUnitMeasure !== undefined ? { baseUnitMeasure } : {}),
      ...(first.baseUnitMeasureCode !== undefined
        ? { baseUnitMeasureCode: first.baseUnitMeasureCode }
        : {}),
      ...(quantity !== undefined ? { quantity } : {}),
      taxAmount: round2(tax),
      totalTaxableAmountPerLine: roundedTaxable,
      totalAmountPerLine: round2(total),
    }
  })
}
