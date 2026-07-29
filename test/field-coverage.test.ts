import { describe, expect, it } from 'vitest'
import { generateCleanInvoiceObject } from '../src/utils/document'
import type { InvoiceV1_1 } from '../src/types'
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
    expect(address.AddressLine).toHaveLength(3)
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
