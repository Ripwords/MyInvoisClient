import type {
  InvoiceV1_1,
  PaymentMeans,
  AllowanceCharge,
  CurrencyExchangeRate,
  Delivery,
  AdditionalDocumentReference,
} from '../types/documents/invoice-1_1.d.ts'

/**
 * MyInvois Invoice Helper Functions
 *
 * Provides convenient utilities for common invoice scenarios and business patterns.
 * These helpers simplify the creation of compliant MyInvois documents.
 */

/**
 * Payment Method Helpers
 */
export const PaymentHelpers = {
  /**
   * Creates cash payment means
   */
  cash(): PaymentMeans {
    return {
      paymentMeansCode: '01',
      paymentTerms: 'Cash payment',
    }
  },

  /**
   * Creates cheque payment means
   */
  cheque(accountId?: string): PaymentMeans {
    return {
      paymentMeansCode: '02',
      payeeFinancialAccountID: accountId,
      paymentTerms: 'Cheque payment',
    }
  },

  /**
   * Creates bank transfer payment means
   */
  bankTransfer(accountId: string, dueDate?: string): PaymentMeans {
    return {
      paymentMeansCode: '03',
      payeeFinancialAccountID: accountId,
      paymentDueDate: dueDate,
      paymentTerms: 'Bank transfer',
    }
  },

  /**
   * Creates credit card payment means
   */
  creditCard(): PaymentMeans {
    return {
      paymentMeansCode: '04',
      paymentTerms: 'Credit card payment',
    }
  },

  /**
   * Creates e-wallet payment means
   */
  eWallet(accountId?: string): PaymentMeans {
    return {
      paymentMeansCode: '05',
      payeeFinancialAccountID: accountId,
      paymentTerms: 'E-wallet payment',
    }
  },

  /**
   * Creates custom payment terms with specific due date
   */
  net(days: number, accountId?: string): PaymentMeans {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + days)

    return {
      paymentMeansCode: '03', // Bank transfer is most common for net terms
      payeeFinancialAccountID: accountId,
      paymentDueDate: dueDate.toISOString().split('T')[0],
      paymentTerms: `Net ${days} days`,
    }
  },
}

/**
 * Currency and Exchange Rate Helpers
 */
export const CurrencyHelpers = {
  /**
   * Creates domestic MYR transaction (no exchange rate needed)
   */
  domestic(): CurrencyExchangeRate {
    return {
      sourceCurrencyCode: 'MYR',
      targetCurrencyCode: 'MYR',
      calculationRate: 1.0,
    }
  },

  /**
   * Creates international transaction with exchange rate
   */
  international(
    fromCurrency: string,
    toCurrency: string = 'MYR',
    exchangeRate: number,
    rateDate?: string,
  ): CurrencyExchangeRate {
    return {
      sourceCurrencyCode: fromCurrency as any,
      targetCurrencyCode: toCurrency as any,
      calculationRate: exchangeRate,
      exchangeRateDate: rateDate || new Date().toISOString().split('T')[0],
    }
  },

  /**
   * Common exchange rates (these should be updated with real-time rates)
   */
  commonRates: {
    USD_MYR: 4.75,
    SGD_MYR: 3.45,
    EUR_MYR: 5.1,
    GBP_MYR: 5.85,
    JPY_MYR: 0.032,
    AUD_MYR: 3.12,
  },
}

/**
 * Tax Calculation Helpers
 */
export const TaxHelpers = {
  /**
   * Calculates SST (6%) for goods
   */
  calculateSST(
    amount: number,
    rate: number = 6.0,
  ): { taxAmount: number; totalWithTax: number } {
    const taxAmount = (amount * rate) / 100
    return {
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalWithTax: Math.round((amount + taxAmount) * 100) / 100,
    }
  },

  /**
   * Calculates Service Tax for services
   */
  calculateServiceTax(
    amount: number,
    rate: number = 6.0,
  ): { taxAmount: number; totalWithTax: number } {
    return TaxHelpers.calculateSST(amount, rate)
  },

  /**
   * Zero-rated calculation (0% tax)
   */
  zeroRated(amount: number): { taxAmount: number; totalWithTax: number } {
    return {
      taxAmount: 0,
      totalWithTax: amount,
    }
  },

  /**
   * Exempt calculation (no tax)
   */
  exempt(amount: number): { taxAmount: number; totalWithTax: number } {
    return {
      taxAmount: 0,
      totalWithTax: amount,
    }
  },
}

/**
 * Allowance and Charge Helpers
 */
export const AllowanceChargeHelpers = {
  /**
   * Creates a discount allowance
   */
  discount(
    reason: string,
    amount: number,
    percentage?: number,
  ): AllowanceCharge {
    return {
      chargeIndicator: false,
      reason,
      amount,
      multiplierFactorNumeric: percentage ? percentage / 100 : undefined,
    }
  },

  /**
   * Creates a shipping charge
   */
  shipping(
    amount: number,
    description: string = 'Shipping and handling',
  ): AllowanceCharge {
    return {
      chargeIndicator: true,
      reason: description,
      amount,
    }
  },

  /**
   * Creates an early payment discount
   */
  earlyPaymentDiscount(
    percentage: number,
    baseAmount: number,
  ): AllowanceCharge {
    const discountAmount = (baseAmount * percentage) / 100
    return {
      chargeIndicator: false,
      reason: `Early payment discount ${percentage}%`,
      amount: Math.round(discountAmount * 100) / 100,
      multiplierFactorNumeric: percentage / 100,
      baseAmount,
    }
  },

  /**
   * Creates a handling fee charge
   */
  handlingFee(amount: number): AllowanceCharge {
    return {
      chargeIndicator: true,
      reason: 'Handling fee',
      amount,
    }
  },
}

/**
 * Delivery Helpers
 */
export const DeliveryHelpers = {
  /**
   * Creates standard delivery information
   */
  standard(
    deliveryDate: string,
    address: {
      addressLine0: string
      cityName: string
      postalZone?: string
      state: string
      country?: string
    },
  ): Delivery {
    return {
      actualDeliveryDate: deliveryDate,
      deliveryLocation: {
        ...address,
        country: address.country || 'MYS',
      },
    }
  },

  /**
   * Creates pickup delivery (customer pickup)
   */
  pickup(pickupDate: string): Delivery {
    return {
      actualDeliveryDate: pickupDate,
      deliveryLocation: {
        addressLine0: 'Customer pickup',
        cityName: 'N/A',
        state: 'N/A',
        country: 'MYS',
      },
    }
  },

  /**
   * Creates delivery with freight charges
   */
  withFreight(
    deliveryDate: string,
    address: any,
    freightAmount: number,
    freightDescription: string = 'Freight charges',
  ): Delivery {
    return {
      actualDeliveryDate: deliveryDate,
      deliveryLocation: address,
      shipment: {
        id: `SHIP-${Date.now()}`,
        freightAllowanceCharge: {
          chargeIndicator: true,
          reason: freightDescription,
          amount: freightAmount,
        },
      },
    }
  },
}

/**
 * Document Reference Helpers
 */
export const DocumentReferenceHelpers = {
  /**
   * Creates purchase order reference
   */
  purchaseOrder(poNumber: string): { purchaseOrderReference: string } {
    return { purchaseOrderReference: poNumber }
  },

  /**
   * Creates contract reference
   */
  contract(contractNumber: string): { contractReference: string } {
    return { contractReference: contractNumber }
  },

  /**
   * Creates project reference
   */
  project(projectNumber: string): { projectReference: string } {
    return { projectReference: projectNumber }
  },

  /**
   * Creates billing reference
   */
  billing(billingNumber: string): { billingReference: string } {
    return { billingReference: billingNumber }
  },

  /**
   * Creates customs reference
   */
  customs(customsFormNumber: string): AdditionalDocumentReference {
    return {
      id: customsFormNumber,
      documentType: 'CustomsImportForm',
      documentDescription: 'Customs import declaration',
    }
  },

  /**
   * Creates free trade agreement reference
   */
  freeTradeAgreement(
    ftaNumber: string,
    country: string,
  ): AdditionalDocumentReference {
    return {
      id: ftaNumber,
      documentType: 'FreeTradeAgreement',
      documentDescription: `Free trade agreement with ${country}`,
    }
  },
}

/**
 * Industry Classification Helpers
 */
export const IndustryHelpers = {
  /**
   * Common industry classifications with proper codes and descriptions
   */
  trading: {
    industryClassificationCode: '47900',
    industryClassificationDescription:
      'Retail sale via mail order houses or via Internet',
  },

  manufacturing: {
    industryClassificationCode: '10131',
    industryClassificationDescription: 'Processing and preserving of meat',
  },

  software: {
    industryClassificationCode: '62012',
    industryClassificationDescription:
      'Business and domestic software development',
  },

  consulting: {
    industryClassificationCode: '70200',
    industryClassificationDescription: 'Management consultancy activities',
  },

  restaurant: {
    industryClassificationCode: '56101',
    industryClassificationDescription: 'Restaurants',
  },

  construction: {
    industryClassificationCode: '41000',
    industryClassificationDescription: 'Development of building projects',
  },

  logistics: {
    industryClassificationCode: '49301',
    industryClassificationDescription: 'Land freight transport',
  },

  /**
   * Creates custom industry classification
   */
  custom(
    code: string,
    description: string,
  ): {
    industryClassificationCode: string
    industryClassificationDescription: string
  } {
    return {
      industryClassificationCode: code,
      industryClassificationDescription: description,
    }
  },
}

/**
 * Date and Time Helpers
 */
export const DateTimeHelpers = {
  /**
   * Gets current date in MyInvois format (YYYY-MM-DD)
   */
  currentDate(): string {
    return new Date().toISOString().split('T')[0] || ''
  },

  /**
   * Gets current time in MyInvois format (HH:mm:ssZ)
   */
  currentTime(): string {
    return new Date().toISOString().split('T')[1]?.split('.')[0] + 'Z' || ''
  },

  /**
   * Formats date to MyInvois format
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0] || ''
  },

  /**
   * Formats time to MyInvois format
   */
  formatTime(date: Date): string {
    return date.toISOString().split('T')[1]?.split('.')[0] + 'Z' || ''
  },

  /**
   * Adds days to a date
   */
  addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  },

  /**
   * Gets billing period for monthly billing
   */
  monthlyPeriod(year: number, month: number): { start: string; end: string } {
    // Use UTC to avoid timezone issues
    // JavaScript Date uses 0-based months, so subtract 1 for the month
    const start = new Date(Date.UTC(year, month - 1, 1))
    // To get last day of the month, use day 0 of the NEXT month
    const end = new Date(Date.UTC(year, month, 0))

    return {
      start: DateTimeHelpers.formatDate(start),
      end: DateTimeHelpers.formatDate(end),
    }
  },
}

/**
 * Complete Invoice Builder Helper
 */
export const InvoiceBuilder = {
  /**
   * Creates a basic cash invoice template
   */
  basicCash(invoiceNumber: string): Partial<InvoiceV1_1> {
    return {
      eInvoiceCodeOrNumber: invoiceNumber,
      eInvoiceDate: DateTimeHelpers.currentDate(),
      eInvoiceTime: DateTimeHelpers.currentTime(),
      eInvoiceTypeCode: '01',
      eInvoiceVersion: '1.1',
      invoiceCurrencyCode: 'MYR',
      paymentMeans: [PaymentHelpers.cash()],
    }
  },

  /**
   * Creates a business invoice template with bank transfer
   */
  businessInvoice(
    invoiceNumber: string,
    accountId: string,
    netDays: number = 30,
  ): Partial<InvoiceV1_1> {
    return {
      eInvoiceCodeOrNumber: invoiceNumber,
      eInvoiceDate: DateTimeHelpers.currentDate(),
      eInvoiceTime: DateTimeHelpers.currentTime(),
      eInvoiceTypeCode: '01',
      eInvoiceVersion: '1.1',
      invoiceCurrencyCode: 'MYR',
      paymentMeans: [PaymentHelpers.net(netDays, accountId)],
    }
  },

  /**
   * Creates an international invoice template
   */
  international(
    invoiceNumber: string,
    currency: string,
    exchangeRate: number,
  ): Partial<InvoiceV1_1> {
    return {
      eInvoiceCodeOrNumber: invoiceNumber,
      eInvoiceDate: DateTimeHelpers.currentDate(),
      eInvoiceTime: DateTimeHelpers.currentTime(),
      eInvoiceTypeCode: '01',
      eInvoiceVersion: '1.1',
      invoiceCurrencyCode: currency as any,
      currencyExchangeRate: exchangeRate,
      taxExchangeRate: CurrencyHelpers.international(
        currency,
        'MYR',
        exchangeRate,
      ),
      paymentMeans: [PaymentHelpers.bankTransfer('')],
    }
  },
}
