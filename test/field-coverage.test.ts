import { describe, expect, it } from 'vitest'
import { generateCleanInvoiceObject } from '../src/utils/document'
import type { InvoiceV1_1, SelfBilledDebitNoteV1_1 } from '../src/types'
import { legacyInvoice as baseInvoice } from './fixtures/legacy-invoice'

const supplierIdentifications = (invoice: InvoiceV1_1) => {
  const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
  const supplierParty = (clean.AccountingSupplierParty as Array<Record<string, unknown>>)[0]
  const party = (supplierParty.Party as Array<Record<string, unknown>>)[0]
  return party.PartyIdentification as Array<{ ID: Array<{ _: string; schemeID: string }> }>
}

const buyerIdentifications = (invoice: InvoiceV1_1) => {
  const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
  const buyerParty = (clean.AccountingCustomerParty as Array<Record<string, unknown>>)[0]
  const party = (buyerParty.Party as Array<Record<string, unknown>>)[0]
  return party.PartyIdentification as Array<{ ID: Array<{ _: string; schemeID: string }> }>
}

describe('party tax registrations', () => {
  it('emits four supplier identifications matching the official sample', () => {
    const schemes = supplierIdentifications(baseInvoice).map(
      entry => entry.ID[0].schemeID,
    )
    expect(schemes).toContain('TIN')
    expect(schemes).toContain('SST')
    expect(schemes).toContain('TTX')
    expect(schemes).toHaveLength(4)
  })

  it('emits NA for supplier SST when not supplied', () => {
    const ids = supplierIdentifications(baseInvoice)
    const sst = ids.find(entry => entry.ID[0].schemeID === 'SST')
    expect(sst?.ID[0]._).toBe('NA')
  })

  it('emits NA for supplier TTX when not supplied', () => {
    const ids = supplierIdentifications(baseInvoice)
    const ttx = ids.find(entry => entry.ID[0].schemeID === 'TTX')
    expect(ttx?.ID[0]._).toBe('NA')
  })

  it('emits the supplier SST number when supplied', () => {
    const invoice = {
      ...baseInvoice,
      supplier: { ...baseInvoice.supplier, sstRegistrationNumber: 'A01-2345-67891012' },
    }
    const ids = supplierIdentifications(invoice)
    const sst = ids.find(entry => entry.ID[0].schemeID === 'SST')
    expect(sst?.ID[0]._).toBe('A01-2345-67891012')
  })

  it('emits the supplier tourism tax number when supplied', () => {
    const invoice = {
      ...baseInvoice,
      supplier: { ...baseInvoice.supplier, tourismTaxRegistrationNumber: 'T-1234-5678' },
    }
    const ids = supplierIdentifications(invoice)
    const ttx = ids.find(entry => entry.ID[0].schemeID === 'TTX')
    expect(ttx?.ID[0]._).toBe('T-1234-5678')
  })

  it('emits four buyer identifications including TTX', () => {
    const schemes = buyerIdentifications(baseInvoice).map(
      entry => entry.ID[0].schemeID,
    )
    expect(schemes).toContain('SST')
    expect(schemes).toContain('TTX')
    expect(schemes).toHaveLength(4)
  })

  it('emits the buyer tourism tax number when supplied', () => {
    const invoice = {
      ...baseInvoice,
      buyer: { ...baseInvoice.buyer, tourismTaxRegistrationNumber: 'T-9999-0000' },
    }
    const ids = buyerIdentifications(invoice)
    const ttx = ids.find(entry => entry.ID[0].schemeID === 'TTX')
    expect(ttx?.ID[0]._).toBe('T-9999-0000')
  })
})

const supplierAddress = (invoice: InvoiceV1_1) => {
  const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
  const supplierParty = (clean.AccountingSupplierParty as Array<Record<string, unknown>>)[0]
  const party = (supplierParty.Party as Array<Record<string, unknown>>)[0]
  return (party.PostalAddress as Array<Record<string, unknown>>)[0]
}

describe('address optional fields', () => {
  it('emits a single address line when only addressLine0 is set', () => {
    const address = supplierAddress(baseInvoice)
    expect(address.AddressLine).toHaveLength(1)
  })

  it('omits PostalZone when not supplied', () => {
    const address = supplierAddress(baseInvoice)
    expect(address.PostalZone).toBeUndefined()
  })

  it('emits additional address lines when supplied', () => {
    const invoice = {
      ...baseInvoice,
      supplier: {
        ...baseInvoice.supplier,
        address: {
          ...baseInvoice.supplier.address,
          addressLine1: 'Bangunan Merdeka',
          addressLine2: 'Persiaran Jaya',
        },
      },
    }
    const address = supplierAddress(invoice)
    const lines = address.AddressLine as Array<{ Line: Array<{ _: string }> }>
    expect(lines).toHaveLength(3)
    expect(lines[0].Line).toEqual([{ _: '123 Test Street' }])
    expect(lines[1].Line).toEqual([{ _: 'Bangunan Merdeka' }])
    expect(lines[2].Line).toEqual([{ _: 'Persiaran Jaya' }])
  })

  it('emits PostalZone when supplied', () => {
    const invoice = {
      ...baseInvoice,
      supplier: {
        ...baseInvoice.supplier,
        address: { ...baseInvoice.supplier.address, postalZone: '50480' },
      },
    }
    const address = supplierAddress(invoice)
    expect(address.PostalZone).toEqual([{ _: '50480' }])
  })
})

const firstLineItem = (invoice: InvoiceV1_1) => {
  const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
  const lines = clean.InvoiceLine as Array<Record<string, unknown>>
  return (lines[0].Item as Array<Record<string, unknown>>)[0]
}

describe('line item trade fields', () => {
  it('omits origin country when not supplied', () => {
    expect(firstLineItem(baseInvoice).OriginCountry).toBeUndefined()
  })

  it('emits origin country when supplied', () => {
    const invoice = {
      ...baseInvoice,
      invoiceLineItems: [
        { ...baseInvoice.invoiceLineItems[0], countryOfOrigin: 'GBR' as const },
      ],
    }
    const item = firstLineItem(invoice)
    const origin = item.OriginCountry as Array<Record<string, unknown>>
    expect(origin[0].IdentificationCode).toEqual([{ _: 'GBR' }])
  })

  it('emits the tariff code as an additional PTC classification', () => {
    const invoice = {
      ...baseInvoice,
      invoiceLineItems: [
        { ...baseInvoice.invoiceLineItems[0], productTariffCode: '9800.00.0010' },
      ],
    }
    const item = firstLineItem(invoice)
    const classifications = item.CommodityClassification as Array<{
      ItemClassificationCode: Array<{ _: string; listID: string }>
    }>
    const ptc = classifications.find(
      entry => entry.ItemClassificationCode[0].listID === 'PTC',
    )
    expect(ptc?.ItemClassificationCode[0]._).toBe('9800.00.0010')
  })

  it('keeps the original CLASS classification alongside PTC', () => {
    const invoice = {
      ...baseInvoice,
      invoiceLineItems: [
        { ...baseInvoice.invoiceLineItems[0], productTariffCode: '9800.00.0010' },
      ],
    }
    const item = firstLineItem(invoice)
    const classifications = item.CommodityClassification as Array<{
      ItemClassificationCode: Array<{ _: string; listID: string }>
    }>
    expect(classifications).toHaveLength(2)
    const classEntry = classifications.find(
      entry => entry.ItemClassificationCode[0].listID === 'CLASS',
    )
    expect(classEntry?.ItemClassificationCode[0]).toEqual({
      _: baseInvoice.invoiceLineItems[0].itemClassificationCode,
      listID: 'CLASS',
    })
    const ptcEntry = classifications.find(
      entry => entry.ItemClassificationCode[0].listID === 'PTC',
    )
    expect(ptcEntry?.ItemClassificationCode[0]).toEqual({
      _: '9800.00.0010',
      listID: 'PTC',
    })
  })
})

describe('self-billed debit note', () => {
  it('accepts a type 13 document and serialises its line items', () => {
    const note: SelfBilledDebitNoteV1_1 = {
      supplier: baseInvoice.supplier,
      buyer: baseInvoice.buyer,
      eInvoiceVersion: '1.1',
      eInvoiceTypeCode: '13',
      eInvoiceCodeOrNumber: 'SBDN-001',
      originalEInvoiceReferenceNumber: 'F9D425P6DS7D8IU',
      originalEInvoiceInternalId: 'SBINV-001',
      eInvoiceDate: baseInvoice.eInvoiceDate,
      eInvoiceTime: baseInvoice.eInvoiceTime,
      invoiceCurrencyCode: 'MYR',
      selfBilledDebitNoteLineItems: baseInvoice.invoiceLineItems,
      legalMonetaryTotal: baseInvoice.legalMonetaryTotal,
      taxTotal: baseInvoice.taxTotal,
    }

    const clean = generateCleanInvoiceObject(note) as Record<string, unknown>
    const lines = clean.InvoiceLine as Array<Record<string, unknown>>
    expect(lines).toHaveLength(baseInvoice.invoiceLineItems.length)

    const firstItem = (lines[0].Item as Array<Record<string, unknown>>)[0]
    const description = (firstItem.Description as Array<{ _: string }>)[0]._
    expect(description).toBe(baseInvoice.invoiceLineItems[0].itemDescription)
  })
})

describe('document level optional fields', () => {
  it('omits billing period when not supplied', () => {
    const clean = generateCleanInvoiceObject(baseInvoice) as Record<string, unknown>
    expect(clean.InvoicePeriod).toBeUndefined()
  })

  it('emits billing period when supplied', () => {
    const invoice = {
      ...baseInvoice,
      frequencyOfBilling: 'Monthly',
      billingPeriodStartDate: '2026-07-01',
      billingPeriodEndDate: '2026-07-31',
    }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    const period = (clean.InvoicePeriod as Array<Record<string, unknown>>)[0]
    expect(period.StartDate).toEqual([{ _: '2026-07-01' }])
    expect(period.EndDate).toEqual([{ _: '2026-07-31' }])
    expect(period.Description).toEqual([{ _: 'Monthly' }])
  })

  it('omits delivery block when no shipping recipient is supplied', () => {
    const clean = generateCleanInvoiceObject(baseInvoice) as Record<string, unknown>
    expect(clean.Delivery).toBeUndefined()
  })

  it('emits payment means when a payment mode is supplied', () => {
    const invoice = {
      ...baseInvoice,
      paymentInformation: { paymentMode: '01' as const },
    }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    const means = (clean.PaymentMeans as Array<Record<string, unknown>>)[0]
    expect(means.PaymentMeansCode).toEqual([{ _: '01' }])
  })

  it('omits payment means when no payment information is supplied', () => {
    const clean = generateCleanInvoiceObject(baseInvoice) as Record<string, unknown>
    expect(clean.PaymentMeans).toBeUndefined()
  })

  it('emits shipping recipient name, tin and address on the delivery block', () => {
    const invoice = {
      ...baseInvoice,
      shippingRecipient: {
        name: 'Recipient Sdn Bhd',
        tin: 'C12345678901',
        address: baseInvoice.buyer.address,
      },
    }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    const delivery = (clean.Delivery as Array<Record<string, unknown>>)[0]
    const party = (delivery.DeliveryParty as Array<Record<string, unknown>>)[0]
    const legalEntity = (party.PartyLegalEntity as Array<Record<string, unknown>>)[0]
    expect(legalEntity.RegistrationName).toEqual([{ _: 'Recipient Sdn Bhd' }])
    const identification = party.PartyIdentification as Array<{
      ID: Array<{ _: string; schemeID: string }>
    }>
    expect(identification[0].ID).toEqual([{ _: 'C12345678901', schemeID: 'TIN' }])
    expect(party.PostalAddress).toBeDefined()
  })

  it('omits delivery block when shippingRecipient has no meaningful field set', () => {
    const invoice = {
      ...baseInvoice,
      shippingRecipient: {},
    }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    expect(clean.Delivery).toBeUndefined()
  })

  it('emits delivery block with only name when just name is set', () => {
    const invoice = {
      ...baseInvoice,
      shippingRecipient: { name: 'Recipient Sdn Bhd' },
    }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    const delivery = (clean.Delivery as Array<Record<string, unknown>>)[0]
    const party = (delivery.DeliveryParty as Array<Record<string, unknown>>)[0]
    const legalEntity = (party.PartyLegalEntity as Array<Record<string, unknown>>)[0]
    expect(legalEntity.RegistrationName).toEqual([{ _: 'Recipient Sdn Bhd' }])
    expect(party.PartyIdentification).toBeUndefined()
    expect(party.PostalAddress).toBeUndefined()
  })

  it('omits payment terms when not supplied', () => {
    const clean = generateCleanInvoiceObject(baseInvoice) as Record<string, unknown>
    expect(clean.PaymentTerms).toBeUndefined()
  })

  it('emits payment terms when supplied', () => {
    const invoice = {
      ...baseInvoice,
      paymentInformation: { paymentTerms: 'Payment method is cash' },
    }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    const terms = (clean.PaymentTerms as Array<Record<string, unknown>>)[0]
    expect(terms.Note).toEqual([{ _: 'Payment method is cash' }])
  })

  it('omits tax currency code when not supplied', () => {
    const clean = generateCleanInvoiceObject(baseInvoice) as Record<string, unknown>
    expect(clean.TaxCurrencyCode).toBeUndefined()
  })

  it('emits tax currency code when supplied', () => {
    const invoice = { ...baseInvoice, taxCurrencyCode: 'USD' as const }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    expect(clean.TaxCurrencyCode).toEqual([{ _: 'USD' }])
  })

  it('omits prepaid payment when no prepayment fields are supplied', () => {
    const clean = generateCleanInvoiceObject(baseInvoice) as Record<string, unknown>
    expect(clean.PrepaidPayment).toBeUndefined()
  })

  it('emits prepaid payment when prepayment fields are supplied', () => {
    const invoice = {
      ...baseInvoice,
      paymentInformation: {
        prepaymentAmount: 1,
        prepaymentDate: '2026-07-23',
        prepaymentTime: '00:30:00Z',
        prepaymentReferenceNumber: 'E12345678912',
      },
    }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    const prepaid = (clean.PrepaidPayment as Array<Record<string, unknown>>)[0]
    expect(prepaid.ID).toEqual([{ _: 'E12345678912' }])
    expect(prepaid.PaidAmount).toEqual([{ _: 1, currencyID: baseInvoice.invoiceCurrencyCode }])
    expect(prepaid.PaidDate).toEqual([{ _: '2026-07-23' }])
    expect(prepaid.PaidTime).toEqual([{ _: '00:30:00Z' }])
  })

  it('omits bill reference number when not supplied', () => {
    const clean = generateCleanInvoiceObject(baseInvoice) as Record<string, unknown>
    expect(clean.BillingReference).toBeUndefined()
  })

  it('emits bill reference number nested under BillingReference on a plain invoice', () => {
    const invoice = {
      ...baseInvoice,
      paymentInformation: { billReferenceNumber: 'E12345678912' },
    }
    const clean = generateCleanInvoiceObject(invoice) as Record<string, unknown>
    const billingReference = (clean.BillingReference as Array<Record<string, unknown>>)[0]
    expect(billingReference.InvoiceDocumentReference).toBeUndefined()
    const additionalDocRef = billingReference.AdditionalDocumentReference as Array<{
      ID: Array<{ _: string }>
    }>
    expect(additionalDocRef[0].ID).toEqual([{ _: 'E12345678912' }])
  })
})
