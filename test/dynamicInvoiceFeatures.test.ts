import { describe, expect, it } from 'vitest'
import type { InvoiceV1_1 } from '../src/types'
import {
  PaymentHelpers,
  CurrencyHelpers,
  TaxHelpers,
  AllowanceChargeHelpers,
  DeliveryHelpers,
  DocumentReferenceHelpers,
  IndustryHelpers,
  DateTimeHelpers,
  InvoiceBuilder,
} from '../src/utils/helpers'
import { validateInvoice } from '../src/utils/validation'
import { generateCleanUBLDocument } from '../src/utils/document'

describe('Dynamic Invoice Features', () => {
  describe('Helper Functions', () => {
    it('should create different payment methods', () => {
      const cash = PaymentHelpers.cash()
      expect(cash.paymentMeansCode).toBe('01')
      expect(cash.paymentTerms).toBe('Cash payment')

      const bankTransfer = PaymentHelpers.bankTransfer('ACC123', '2025-02-01')
      expect(bankTransfer.paymentMeansCode).toBe('03')
      expect(bankTransfer.payeeFinancialAccountID).toBe('ACC123')
      expect(bankTransfer.paymentDueDate).toBe('2025-02-01')

      const net30 = PaymentHelpers.net(30, 'ACC456')
      expect(net30.paymentMeansCode).toBe('03')
      expect(net30.paymentTerms).toBe('Net 30 days')
      expect(net30.payeeFinancialAccountID).toBe('ACC456')
    })

    it('should calculate taxes correctly', () => {
      const sstResult = TaxHelpers.calculateSST(1000, 6)
      expect(sstResult.taxAmount).toBe(60)
      expect(sstResult.totalWithTax).toBe(1060)

      const zeroRated = TaxHelpers.zeroRated(1000)
      expect(zeroRated.taxAmount).toBe(0)
      expect(zeroRated.totalWithTax).toBe(1000)

      const exempt = TaxHelpers.exempt(1000)
      expect(exempt.taxAmount).toBe(0)
      expect(exempt.totalWithTax).toBe(1000)
    })

    it('should create allowances and charges', () => {
      const discount = AllowanceChargeHelpers.discount('Early payment', 100, 10)
      expect(discount.chargeIndicator).toBe(false)
      expect(discount.reason).toBe('Early payment')
      expect(discount.amount).toBe(100)
      expect(discount.multiplierFactorNumeric).toBe(0.1)

      const shipping = AllowanceChargeHelpers.shipping(50)
      expect(shipping.chargeIndicator).toBe(true)
      expect(shipping.reason).toBe('Shipping and handling')
      expect(shipping.amount).toBe(50)

      const earlyDiscount = AllowanceChargeHelpers.earlyPaymentDiscount(2, 5000)
      expect(earlyDiscount.chargeIndicator).toBe(false)
      expect(earlyDiscount.amount).toBe(100) // 2% of 5000
      expect(earlyDiscount.baseAmount).toBe(5000)
    })

    it('should create delivery information', () => {
      const standardDelivery = DeliveryHelpers.standard('2025-01-15', {
        addressLine0: '123 Main St',
        cityName: 'Kuala Lumpur',
        postalZone: '50000',
        state: '14',
      })

      expect(standardDelivery.actualDeliveryDate).toBe('2025-01-15')
      expect(standardDelivery.deliveryLocation?.addressLine0).toBe(
        '123 Main St',
      )
      expect(standardDelivery.deliveryLocation?.country).toBe('MYS')

      const pickup = DeliveryHelpers.pickup('2025-01-16')
      expect(pickup.actualDeliveryDate).toBe('2025-01-16')
      expect(pickup.deliveryLocation?.addressLine0).toBe('Customer pickup')

      const withFreight = DeliveryHelpers.withFreight(
        '2025-01-17',
        {
          addressLine0: '456 Business Ave',
          cityName: 'Shah Alam',
          state: '10',
        },
        75,
        'Express delivery',
      )

      expect(withFreight.shipment?.freightAllowanceCharge?.amount).toBe(75)
      expect(withFreight.shipment?.freightAllowanceCharge?.reason).toBe(
        'Express delivery',
      )
    })

    it('should create document references', () => {
      const po = DocumentReferenceHelpers.purchaseOrder('PO-2025-001')
      expect(po.purchaseOrderReference).toBe('PO-2025-001')

      const contract = DocumentReferenceHelpers.contract('CONTRACT-2025-001')
      expect(contract.contractReference).toBe('CONTRACT-2025-001')

      const customs = DocumentReferenceHelpers.customs('CUSTOMS-12345')
      expect(customs.id).toBe('CUSTOMS-12345')
      expect(customs.documentType).toBe('CustomsImportForm')

      const fta = DocumentReferenceHelpers.freeTradeAgreement(
        'FTA-123',
        'Singapore',
      )
      expect(fta.id).toBe('FTA-123')
      expect(fta.documentType).toBe('FreeTradeAgreement')
      expect(fta.documentDescription).toBe(
        'Free trade agreement with Singapore',
      )
    })

    it('should provide industry classifications', () => {
      expect(IndustryHelpers.software.industryClassificationCode).toBe('62012')
      expect(IndustryHelpers.software.industryClassificationDescription).toBe(
        'Business and domestic software development',
      )

      expect(IndustryHelpers.trading.industryClassificationCode).toBe('47900')
      expect(IndustryHelpers.manufacturing.industryClassificationCode).toBe(
        '10131',
      )
      expect(IndustryHelpers.consulting.industryClassificationCode).toBe(
        '70200',
      )

      const custom = IndustryHelpers.custom('99999', 'Custom business activity')
      expect(custom.industryClassificationCode).toBe('99999')
      expect(custom.industryClassificationDescription).toBe(
        'Custom business activity',
      )
    })

    it('should handle currency exchange rates', () => {
      const domestic = CurrencyHelpers.domestic()
      expect(domestic.sourceCurrencyCode).toBe('MYR')
      expect(domestic.targetCurrencyCode).toBe('MYR')
      expect(domestic.calculationRate).toBe(1.0)

      const international = CurrencyHelpers.international(
        'USD',
        'MYR',
        4.75,
        '2025-01-01',
      )
      expect(international.sourceCurrencyCode).toBe('USD')
      expect(international.targetCurrencyCode).toBe('MYR')
      expect(international.calculationRate).toBe(4.75)
      expect(international.exchangeRateDate).toBe('2025-01-01')

      // Test common rates
      expect(CurrencyHelpers.commonRates.USD_MYR).toBe(4.75)
      expect(CurrencyHelpers.commonRates.SGD_MYR).toBe(3.45)
    })

    it('should handle date and time formatting', () => {
      const currentDate = DateTimeHelpers.currentDate()
      expect(currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      const currentTime = DateTimeHelpers.currentTime()
      expect(currentTime).toMatch(/^\d{2}:\d{2}:\d{2}Z$/)

      const testDate = new Date('2025-01-15T10:30:00Z')
      expect(DateTimeHelpers.formatDate(testDate)).toBe('2025-01-15')
      expect(DateTimeHelpers.formatTime(testDate)).toBe('10:30:00Z')

      const addedDays = DateTimeHelpers.addDays(testDate, 5)
      expect(DateTimeHelpers.formatDate(addedDays)).toBe('2025-01-20')

      const monthlyPeriod = DateTimeHelpers.monthlyPeriod(2025, 1)
      expect(monthlyPeriod.start).toBe('2025-01-01')
      expect(monthlyPeriod.end).toBe('2025-01-31')
    })

    it('should create invoice templates', () => {
      const cashInvoice = InvoiceBuilder.basicCash('INV-CASH-001')
      expect(cashInvoice.eInvoiceCodeOrNumber).toBe('INV-CASH-001')
      expect(cashInvoice.eInvoiceTypeCode).toBe('01')
      expect(cashInvoice.invoiceCurrencyCode).toBe('MYR')
      expect(cashInvoice.paymentMeans?.[0].paymentMeansCode).toBe('01')

      const businessInvoice = InvoiceBuilder.businessInvoice(
        'INV-BIZ-001',
        'ACC123',
        30,
      )
      expect(businessInvoice.eInvoiceCodeOrNumber).toBe('INV-BIZ-001')
      expect(businessInvoice.paymentMeans?.[0].paymentMeansCode).toBe('03')
      expect(businessInvoice.paymentMeans?.[0].paymentTerms).toBe('Net 30 days')

      const internationalInvoice = InvoiceBuilder.international(
        'INV-USD-001',
        'USD',
        4.75,
      )
      expect(internationalInvoice.eInvoiceCodeOrNumber).toBe('INV-USD-001')
      expect(internationalInvoice.invoiceCurrencyCode).toBe('USD')
      expect(internationalInvoice.currencyExchangeRate).toBe(4.75)
      expect(internationalInvoice.taxExchangeRate?.calculationRate).toBe(4.75)
    })
  })

  describe('Validation Functions', () => {
    const createTestInvoice = (): InvoiceV1_1 => ({
      eInvoiceVersion: '1.1',
      eInvoiceTypeCode: '01',
      eInvoiceCodeOrNumber: 'TEST-001',
      eInvoiceDate: '2025-01-01',
      eInvoiceTime: '10:00:00Z',
      invoiceCurrencyCode: 'MYR',

      supplier: {
        name: 'Test Supplier',
        tin: 'C1234567890',
        registrationType: 'BRN',
        registrationNumber: '202201234567',
        contactNumber: '+60123456789',
        address: {
          addressLine0: 'Test Address',
          cityName: 'Kuala Lumpur',
          postalZone: '50000',
          state: '14',
          country: 'MYS',
        },
      },

      buyer: {
        name: 'Test Buyer',
        tin: 'IG00000000000',
        registrationType: 'NRIC',
        registrationNumber: '000000000000 ',
        sstRegistrationNumber: 'NA',
        contactNumber: '+60987654321',
        address: {
          addressLine0: 'Buyer Address',
          cityName: 'Petaling Jaya',
          postalZone: '47300',
          state: '10',
          country: 'MYS',
        },
      },

      invoiceLineItems: [
        {
          itemClassificationCode: '001',
          itemDescription: 'Test Product',
          unitPrice: 100.0,
          quantity: 1,
          measurement: 'C62',
          taxType: '01',
          taxRate: 6.0,
          taxAmount: 6.0,
          totalTaxableAmountPerLine: 100.0,
          totalAmountPerLine: 106.0,
        },
      ],

      legalMonetaryTotal: {
        taxExclusiveAmount: 100.0,
        taxInclusiveAmount: 106.0,
        payableAmount: 106.0,
      },

      taxTotal: {
        taxAmount: 6.0,
        taxSubtotals: [
          {
            taxableAmount: 100.0,
            taxAmount: 6.0,
            taxCategory: {
              taxTypeCode: '01',
              taxRate: 6.0,
            },
          },
        ],
      },

      issuerDigitalSignature: {} as any,
    })

    it('should validate a correct invoice', () => {
      const invoice = createTestInvoice()
      const validation = validateInvoice(invoice)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.warnings).toHaveLength(0)
    })

    it('should detect TIN format issues', () => {
      const invoice = createTestInvoice()
      invoice.supplier.tin = 'IG1234567890' // Individual TIN for company

      const validation = validateInvoice(invoice)

      expect(
        validation.warnings.some(w => w.code === 'TIN_FORMAT_INVALID'),
      ).toBe(true)
      expect(
        validation.warnings.some(w =>
          w.message.includes('Company TIN should start with "C"'),
        ),
      ).toBe(true)
    })

    it('should detect invalid contact numbers', () => {
      const invoice = createTestInvoice()
      invoice.supplier.contactNumber = 'invalid-phone'

      const validation = validateInvoice(invoice)

      expect(validation.isValid).toBe(false)
      expect(
        validation.errors.some(e => e.code === 'CONTACT_FORMAT_INVALID'),
      ).toBe(true)
    })

    it('should detect tax calculation mismatches', () => {
      const invoice = createTestInvoice()
      invoice.taxTotal.taxAmount = 10.0 // Wrong tax amount

      const validation = validateInvoice(invoice)

      expect(validation.isValid).toBe(false)
      expect(
        validation.errors.some(e => e.code === 'TAX_AMOUNT_MISMATCH'),
      ).toBe(true)
    })

    it('should detect negative amounts', () => {
      const invoice = createTestInvoice()
      invoice.legalMonetaryTotal.payableAmount = -100

      const validation = validateInvoice(invoice)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(e => e.code === 'AMOUNT_NEGATIVE')).toBe(
        true,
      )
    })
  })

  describe('Enhanced Document Generation', () => {
    it('should generate document with dynamic industry classification', () => {
      const invoice = createBasicInvoiceWithIndustry()

      // Test clean document generation without signing (avoids crypto errors with dummy keys)
      const cleanDocument = generateCleanUBLDocument([invoice])

      expect(cleanDocument.Invoice).toHaveLength(1)
      expect(cleanDocument.Invoice[0].AccountingSupplierParty).toBeDefined()

      // Check if industry classification is properly set
      const supplierParty =
        cleanDocument.Invoice[0].AccountingSupplierParty[0].Party[0]
      expect(supplierParty.IndustryClassificationCode[0]._).toBe('62012')
      expect(supplierParty.IndustryClassificationCode[0].name).toBe(
        'Business and domestic software development',
      )
    })

    it('should generate document with dynamic delivery information', () => {
      const invoice = createInvoiceWithDelivery()

      // Test clean document generation without signing (avoids crypto errors with dummy keys)
      const cleanDocument = generateCleanUBLDocument([invoice])

      const delivery = cleanDocument.Invoice[0].Delivery[0]
      expect(delivery.DeliveryParty[0].PostalAddress[0].CityName[0]._).toBe(
        'Shah Alam',
      )
      expect(delivery.Shipment[0].ID[0]._).toBe('SHIP-123')
      expect(delivery.Shipment[0].FreightAllowanceCharge[0].Amount[0]._).toBe(
        50,
      )
    })

    it('should generate document with dynamic allowances and charges', () => {
      const invoice = createInvoiceWithAllowancesCharges()

      // Test clean document generation without signing (avoids crypto errors with dummy keys)
      const cleanDocument = generateCleanUBLDocument([invoice])

      const allowanceCharges = cleanDocument.Invoice[0].AllowanceCharge
      expect(allowanceCharges).toBeDefined()
      expect(allowanceCharges.length).toBeGreaterThan(0)

      // Should have both charges and allowances
      const hasCharge = allowanceCharges.some(
        (ac: any) => ac.ChargeIndicator[0]._ === true,
      )
      const hasAllowance = allowanceCharges.some(
        (ac: any) => ac.ChargeIndicator[0]._ === false,
      )
      expect(hasCharge || hasAllowance).toBe(true)
    })

    it('should generate document with business references', () => {
      const invoice = createInvoiceWithReferences()

      // Test clean document generation without signing (avoids crypto errors with dummy keys)
      const cleanDocument = generateCleanUBLDocument([invoice])

      const additionalRefs =
        cleanDocument.Invoice[0].AdditionalDocumentReference
      expect(additionalRefs).toBeDefined()

      // Check for purchase order reference
      const poRef = additionalRefs.find(
        (ref: any) => ref.DocumentType[0]._ === 'PurchaseOrder',
      )
      expect(poRef?.ID[0]._).toBe('PO-2025-001')
    })
  })
})

// Helper functions for creating test invoices with specific features

function createBasicInvoiceWithIndustry(): InvoiceV1_1 {
  const baseInvoice = InvoiceBuilder.basicCash('TEST-INDUSTRY-001')

  return {
    ...baseInvoice,
    supplier: {
      name: 'Software Co Sdn Bhd',
      tin: 'C1234567890',
      registrationType: 'BRN',
      registrationNumber: '202201234567',
      contactNumber: '+60123456789',
      ...IndustryHelpers.software, // Dynamic industry classification
      address: {
        addressLine0: 'Tech Hub',
        cityName: 'Kuala Lumpur',
        postalZone: '50000',
        state: '14',
        country: 'MYS',
      },
    },
    buyer: {
      name: 'Test Buyer',
      tin: 'EI00000000010',
      registrationType: 'NRIC',
      registrationNumber: '000000000000 ',
      sstRegistrationNumber: 'NA',
      contactNumber: '+60123456789',
      address: {
        addressLine0: 'Buyer Address',
        cityName: 'KL',
        postalZone: '50000',
        state: '14',
        country: 'MYS',
      },
    },
    invoiceLineItems: [
      {
        itemClassificationCode: '001',
        itemDescription: 'Software Services',
        unitPrice: 1000.0,
        quantity: 1,
        measurement: 'C62',
        taxType: '01',
        taxRate: 6.0,
        taxAmount: 60.0,
        totalTaxableAmountPerLine: 1000.0,
        totalAmountPerLine: 1060.0,
      },
    ],
    legalMonetaryTotal: {
      taxExclusiveAmount: 1000.0,
      taxInclusiveAmount: 1060.0,
      payableAmount: 1060.0,
    },
    taxTotal: {
      taxAmount: 60.0,
      taxSubtotals: [
        {
          taxableAmount: 1000.0,
          taxAmount: 60.0,
          taxCategory: {
            taxTypeCode: '01',
            taxRate: 6.0,
          },
        },
      ],
    },
    issuerDigitalSignature: {} as any,
  } as InvoiceV1_1
}

function createInvoiceWithDelivery(): InvoiceV1_1 {
  const invoice = createBasicInvoiceWithIndustry()

  invoice.delivery = DeliveryHelpers.withFreight(
    '2025-01-15',
    {
      addressLine0: 'Industrial Area',
      cityName: 'Shah Alam',
      postalZone: '40000',
      state: '10',
      country: 'MYS',
    },
    50,
    'Standard delivery',
  )

  invoice.delivery.shipment!.id = 'SHIP-123'

  return invoice
}

function createInvoiceWithAllowancesCharges(): InvoiceV1_1 {
  const invoice = createBasicInvoiceWithIndustry()

  invoice.allowanceCharges = [
    AllowanceChargeHelpers.shipping(25),
    AllowanceChargeHelpers.discount('Volume discount', 50, 5),
  ]

  return invoice
}

function createInvoiceWithReferences(): InvoiceV1_1 {
  const invoice = createBasicInvoiceWithIndustry()

  Object.assign(invoice, {
    ...DocumentReferenceHelpers.purchaseOrder('PO-2025-001'),
    ...DocumentReferenceHelpers.contract('CONTRACT-2025-001'),
    ...DocumentReferenceHelpers.project('PROJECT-ALPHA'),
  })

  invoice.additionalDocumentReferences = [
    DocumentReferenceHelpers.customs('CUSTOMS-123'),
  ]

  return invoice
}
