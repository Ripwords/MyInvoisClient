import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  generateCleanInvoiceObject,
  generateCompleteDocument,
  createPercentageTaxLineItem,
} from '../../src/utils/document'
import { aggregateLineItemsByTaxCategory } from '../../src/utils/lineItems'
import { getTestCredentials } from '../fixtures/test-credentials'
import type {
  InvoiceV1_1,
  InvoiceLineItem,
  ClassificationCode,
  TaxTypeCode,
  SigningCredentials,
} from '../../src/types'
import { extractCertificateInfo } from '../../src/utils/certificate'

const party = {
  name: 'Test Co',
  tin: 'C26135266000',
  registrationType: 'BRN' as const,
  registrationNumber: '201901030382',
  contactNumber: '+60123456789',
  address: {
    addressLine0: '1 Test St',
    cityName: 'KL',
    state: '14',
    country: 'MYS',
  },
  industryClassificationCode: '41001',
  industryClassificationDescription: 'Test',
}

const baseInvoice = (lineItems: InvoiceLineItem[]): InvoiceV1_1 => ({
  eInvoiceVersion: '1.1',
  eInvoiceTypeCode: '01',
  eInvoiceCodeOrNumber: 'INV-1',
  eInvoiceDate: '2026-01-15',
  eInvoiceTime: '10:00:00Z',
  invoiceCurrencyCode: 'MYR',
  supplier: party,
  buyer: party,
  invoiceLineItems: lineItems,
  legalMonetaryTotal: {
    taxExclusiveAmount: 100,
    taxInclusiveAmount: 106,
    payableRoundingAmount: 0,
    payableAmount: 106,
  },
  taxTotal: { taxAmount: 6 },
})

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

describe('signing time', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // The XAdES SigningTime must be real UTC. Building it from local date
  // components and appending 'Z' shifts it by the host timezone offset
  // (+8h on MYT), producing signatures dated in the future.
  it('emits the actual UTC instant, not local time with a Z suffix', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T10:00:00.000Z'))

    const { certificatePem, privateKeyPem } = getTestCredentials()
    const info = extractCertificateInfo(certificatePem)
    const credentials: SigningCredentials = {
      certificatePem,
      privateKeyPem,
      issuerName: info.issuerName,
      serialNumber: info.serialNumber,
    }

    const complete = generateCompleteDocument(
      [baseInvoice([line({})])],
      credentials,
    )
    const signingTimes = JSON.stringify(complete).match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g,
    )

    expect(signingTimes).toContain('2026-01-15T10:00:00Z')
    // The +8h local rendering must not appear anywhere.
    expect(signingTimes).not.toContain('2026-01-15T18:00:00Z')
  })
})

describe('monetary rounding in generated documents', () => {
  it('rounds ItemPriceExtension and AllowanceCharge base amounts', () => {
    // 1.1 + 2.2 === 3.3000000000000003 in raw float math
    const out = generateCleanInvoiceObject(
      baseInvoice([
        line({
          totalTaxableAmountPerLine: 1.1,
          discountAmount: 2.2,
          discountRate: 0.6667,
          taxAmount: 0.07,
          totalAmountPerLine: 1.17,
        }),
      ]),
    ) as any

    const invoiceLine = out.InvoiceLine[0]
    expect(invoiceLine.ItemPriceExtension[0].Amount[0]._).toBe(3.3)
    expect(invoiceLine.AllowanceCharge[0].BaseAmount[0]._).toBe(3.3)
  })

  it('createPercentageTaxLineItem rounds all monetary outputs', () => {
    // 0.1 * 3 === 0.30000000000000004 in raw float math
    const item = createPercentageTaxLineItem({
      itemClassificationCode: '004' as ClassificationCode,
      itemDescription: 'Item',
      unitPrice: 0.1,
      quantity: 3,
      taxType: '01' as TaxTypeCode,
      taxRate: 6,
    })

    expect(item.totalTaxableAmountPerLine).toBe(0.3)
    expect(item.totalAmountPerLine).toBe(0.32)
  })
})

describe('aggregateLineItemsByTaxCategory soundness', () => {
  it('does not merge fixed-rate lines with different per-unit tax amounts', () => {
    const result = aggregateLineItemsByTaxCategory([
      line({
        taxType: '03' as TaxTypeCode,
        taxRate: undefined,
        taxPerUnitAmount: 10,
        baseUnitMeasure: 2,
        baseUnitMeasureCode: 'H87',
        taxAmount: 20,
      }),
      line({
        taxType: '03' as TaxTypeCode,
        taxRate: undefined,
        taxPerUnitAmount: 5,
        baseUnitMeasure: 2,
        baseUnitMeasureCode: 'H87',
        taxAmount: 10,
      }),
    ])

    expect(result).toHaveLength(2)
  })

  it('treats missing quantity as 1 when other lines in the group have one', () => {
    const result = aggregateLineItemsByTaxCategory([
      line({ quantity: 2 }),
      line({}), // no quantity — a single unit, not zero units
    ])

    expect(result).toHaveLength(1)
    expect(result[0]!.quantity).toBe(3)
  })
})

describe('invoiced quantity', () => {
  // The MyInvois portal renders a missing InvoicedQuantity element as 0.00,
  // which reads as "zero units sold". A line without an explicit quantity is
  // one unit (matching the ?? 1 default used throughout), so the element must
  // always be emitted.
  it('emits InvoicedQuantity 1 when the line has no quantity or measurement', () => {
    const out = generateCleanInvoiceObject(baseInvoice([line({})])) as any

    expect(out.InvoiceLine[0].InvoicedQuantity?.[0]?._).toBe(1)
  })

  it('keeps an explicit quantity and unit code', () => {
    const out = generateCleanInvoiceObject(
      baseInvoice([line({ quantity: 4, measurement: 'H87' })]),
    ) as any

    expect(out.InvoiceLine[0].InvoicedQuantity[0]._).toBe(4)
    expect(out.InvoiceLine[0].InvoicedQuantity[0].unitCode).toBe('H87')
  })
})

describe('tax exemption serialization', () => {
  it('emits TaxExemptionReason for exempt line items', () => {
    const out = generateCleanInvoiceObject(
      baseInvoice([
        line({
          taxType: 'E' as TaxTypeCode,
          taxRate: 0,
          taxAmount: 0,
          taxExemptionReasonCode: '02',
          taxExemptionReasonAmount: 100,
          totalAmountPerLine: 100,
        }),
      ]),
    ) as any

    const lineTaxCategory =
      out.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory[0]
    expect(lineTaxCategory.TaxExemptionReason?.[0]?._).toBe('02')

    const docSubtotals = out.TaxTotal[0].TaxSubtotal
    const exemptSubtotal = docSubtotals.find(
      (s: any) => s.TaxCategory[0].ID[0]._ === 'E',
    )
    expect(exemptSubtotal.TaxCategory[0].TaxExemptionReason?.[0]?._).toBe('02')
  })
})
