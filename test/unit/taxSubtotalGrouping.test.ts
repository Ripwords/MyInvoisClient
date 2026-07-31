import { describe, it, expect } from 'vitest'
import { generateCleanInvoiceObject } from '../../src/utils/document'
import type { InvoiceV1_1 } from '../../src/types'

/**
 * The document-level TaxTotal must contain one TaxSubtotal per distinct tax
 * category, derived from the line items — not a single lump labelled with the
 * first line's tax type. (Bug: mixed-tax invoices reported all tax under the
 * first line's category.)
 */

const party = {
  name: 'X',
  tin: 'C1',
  registrationType: 'BRN' as const,
  registrationNumber: '1',
  contactNumber: '+60',
  address: { addressLine0: 'A', cityName: 'KL', state: '14' as const, country: 'MYS' as const },
  industryClassificationCode: '41001',
  industryClassificationDescription: 'x',
}

const mixedInvoice: InvoiceV1_1 = {
  eInvoiceVersion: '1.1',
  eInvoiceTypeCode: '01',
  eInvoiceCodeOrNumber: 'MIX-1',
  eInvoiceDate: '2026-06-15',
  eInvoiceTime: '12:00:00Z',
  invoiceCurrencyCode: 'MYR',
  supplier: party as InvoiceV1_1['supplier'],
  buyer: party as InvoiceV1_1['buyer'],
  invoiceLineItems: [
    { itemClassificationCode: '022', itemDescription: 'Room (SST 8%)', unitPrice: 100, quantity: 1, taxType: '02', taxRate: 8, taxAmount: 8, totalTaxableAmountPerLine: 100, totalAmountPerLine: 108 },
    { itemClassificationCode: '022', itemDescription: 'F&B (SST 6%)', unitPrice: 50, quantity: 1, taxType: '02', taxRate: 6, taxAmount: 3, totalTaxableAmountPerLine: 50, totalAmountPerLine: 53 },
    { itemClassificationCode: '022', itemDescription: 'Tourism Tax', unitPrice: 0, quantity: 1, taxType: '03', taxAmount: 10, totalTaxableAmountPerLine: 0, totalAmountPerLine: 10 },
    { itemClassificationCode: '022', itemDescription: 'Deposit (exempt)', unitPrice: 200, quantity: 1, taxType: '06', taxRate: 0, taxAmount: 0, totalTaxableAmountPerLine: 200, totalAmountPerLine: 200 },
  ],
  legalMonetaryTotal: { taxExclusiveAmount: 350, taxInclusiveAmount: 371, payableRoundingAmount: 0, payableAmount: 371 },
  taxTotal: { taxAmount: 21 },
}

describe('document-level TaxSubtotal grouping', () => {
  it('emits one TaxSubtotal per distinct tax category', () => {
    const out = generateCleanInvoiceObject(mixedInvoice)
    const subs = out.TaxTotal[0]!.TaxSubtotal

    const byCategory = Object.fromEntries(
      subs.map(s => [
        String(s.TaxCategory[0]!.ID[0]!._),
        { taxable: s.TaxableAmount[0]!._, tax: s.TaxAmount[0]!._ },
      ]),
    )

    // Three distinct categories on the lines: 02, 03, 06
    expect(subs).toHaveLength(3)
    expect(byCategory['02']).toEqual({ taxable: 150, tax: 11 }) // 100+50 taxable, 8+3 tax
    expect(byCategory['03']).toEqual({ taxable: 0, tax: 10 })
    expect(byCategory['06']).toEqual({ taxable: 200, tax: 0 })
  })

  it('keeps the subtotal totals reconciled with the document totals', () => {
    const out = generateCleanInvoiceObject(mixedInvoice)
    const subs = out.TaxTotal[0]!.TaxSubtotal
    const sumTax = subs.reduce((a, s) => a + Number(s.TaxAmount[0]!._), 0)
    const sumTaxable = subs.reduce((a, s) => a + Number(s.TaxableAmount[0]!._), 0)

    expect(sumTax).toBeCloseTo(out.TaxTotal[0]!.TaxAmount[0]!._ as number, 2)
    expect(sumTaxable).toBeCloseTo(
      out.LegalMonetaryTotal[0]!.TaxExclusiveAmount[0]!._ as number,
      2,
    )
  })

  it('still produces a single TaxSubtotal for a single-category invoice', () => {
    const single: InvoiceV1_1 = {
      ...mixedInvoice,
      invoiceLineItems: [mixedInvoice.invoiceLineItems[0]!],
      legalMonetaryTotal: { taxExclusiveAmount: 100, taxInclusiveAmount: 108, payableRoundingAmount: 0, payableAmount: 108 },
      taxTotal: { taxAmount: 8 },
    }
    const out = generateCleanInvoiceObject(single)
    expect(out.TaxTotal[0]!.TaxSubtotal).toHaveLength(1)
    expect(out.TaxTotal[0]!.TaxSubtotal[0]!.TaxCategory[0]!.ID[0]!._).toBe('02')
  })
})
