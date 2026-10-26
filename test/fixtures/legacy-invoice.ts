import type { InvoiceV1_1 } from '../../src/types'

/**
 * Frozen "pre-Phase-2" invoice fixture.
 *
 * This models a complete, valid InvoiceV1_1 document using ONLY the fields
 * that existed before Phase 2 added optional coverage (SST, TTX, email,
 * postal zone, tariff code, billing period, payment information, shipping
 * recipient, trade information, etc.). It backs the serialisation-stability
 * snapshot in `test/unit/serialization-stability.test.ts`, which guarantees that
 * adding those optional fields later does not change the serialised UBL
 * output for a document that does not use them.
 *
 * DO NOT add any new optional field to this fixture. If you need a fixture
 * that exercises a new optional field, create a separate one — extending
 * this one defeats the point of the snapshot it backs.
 *
 * All date/time/id values below are fixed (not derived from `new Date()`,
 * `Date.now()`, or `Math.random()`) so this fixture — and the snapshot it
 * produces — is byte-identical on every run.
 */
export const legacyInvoice: InvoiceV1_1 = {
  eInvoiceVersion: '1.1',
  eInvoiceTypeCode: '01', // Standard invoice
  eInvoiceCodeOrNumber: 'SNAP-INV-0001',
  eInvoiceDate: '2026-07-01',
  eInvoiceTime: '09:00:00Z',
  invoiceCurrencyCode: 'MYR',

  supplier: {
    name: 'Test Company Sdn Bhd',
    tin: 'C1234567890',
    registrationType: 'NRIC',
    registrationNumber: '770101015678',
    contactNumber: '+60123456789',
    address: {
      addressLine0: '123 Test Street',
      cityName: 'Kuala Lumpur',
      state: '14', // Wilayah Persekutuan Kuala Lumpur
      country: 'MYS',
    },
    industryClassificationCode: '41001',
    industryClassificationDescription: 'Test Industry',
  },

  buyer: {
    name: 'CONSOLIDATED E-INVOICE BUYER',
    tin: 'EI00000000010', // Standard consolidated buyer TIN
    registrationType: 'NRIC',
    registrationNumber: '770101015678',
    contactNumber: '+60123456789',
    address: {
      addressLine0: 'NA',
      cityName: 'KUALA LUMPUR',
      state: '14',
      country: 'MYS',
    },
  },

  invoiceLineItems: [
    // Percentage-based taxation
    {
      itemClassificationCode: '001', // General goods
      itemDescription: 'Test Product (Percentage Tax)',
      unitPrice: 100.0,
      quantity: 1,
      taxType: '01', // SST
      taxRate: 6.0, // 6% SST
      taxAmount: 6.0, // 6% of 100
      totalTaxableAmountPerLine: 100.0,
      totalAmountPerLine: 106.0, // 100 + 6
    },
    // Fixed rate taxation
    {
      itemClassificationCode: '003', // Tourism Tax example
      itemDescription: 'Hotel Stay (Fixed Rate Tax)',
      unitPrice: 200.0,
      quantity: 1,
      taxType: '03', // Tourism Tax
      taxPerUnitAmount: 10.0, // RM 10 per night
      baseUnitMeasure: 2, // 2 nights
      baseUnitMeasureCode: 'DAY', // Unit code for days
      taxAmount: 20.0, // 10 * 2 = 20
      totalTaxableAmountPerLine: 200.0,
      totalAmountPerLine: 220.0, // 200 + 20
    },
  ],

  legalMonetaryTotal: {
    taxExclusiveAmount: 300.0, // 100 + 200
    taxInclusiveAmount: 326.0, // 300 + 26 (6 + 20)
    payableRoundingAmount: 0,
    payableAmount: 326.0,
  },

  taxTotal: {
    taxAmount: 26.0, // 6 + 20 (percentage + fixed rate)
  },
}
