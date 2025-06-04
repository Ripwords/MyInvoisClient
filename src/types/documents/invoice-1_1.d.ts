import type { EInvoiceTypeCode } from '../e-invoice.d.ts'
import type { CurrencyCode } from '../currencies.d.ts'
import type { IssuerDigitalSignature } from '../signatures.d.ts'
import type { TaxTypeCode } from '../tax-types.d.ts'
import type { CountryCode } from '../country-code.d.ts'
import type { ClassificationCode } from '../classification-codes.d.ts'
import type { UnitTypeCode } from '../unit-types.d.ts'
import type { PaymentModeCode } from '../payment-modes.d.ts'
import type { MSICCode } from '../msic-codes.d.ts'

// Based on https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/

/**
 * Represents a physical address.
 * Based on the Address section of the documentation.
 */
export interface Address {
  /** Main address line. Max 150 chars.
   * @example Lot 66
   */
  addressLine0: string
  /** Additional address line. Max 150 chars.
   * @example Bangunan Merdeka
   */
  addressLine1?: string
  /** Additional address line. Max 150 chars.
   * @example Persiaran Jaya
   */
  addressLine2?: string
  /** Postal code. Max 50 chars.
   * @example 50480
   */
  postalZone?: string
  /** City name. Max 50 chars. */
  cityName: string
  /** State code. Refer to /codes/state-codes/. Max 50 chars. */
  state: string
  /** Country code (ISO 3166-1). Refer to /codes/countries/. Max 3 chars. */
  country: string // MYS
}

/**
 * Represents the supplier information.
 * Based on the Supplier section of the documentation.
 */
export interface Supplier {
  /** Supplier's name. Max 300 chars.
   * @example Test Supplier Sdn Bhd
   */
  name: string
  /** Supplier's Tax Identification Number (TIN). Max 14 chars.
   * @example 1234567890
   */
  tin: string
  /**
   * Supplier's Registration / Identification Number / Passport Number.
   * Format depends on schemeID: NRIC (12), BRN (20), PASSPORT (12), ARMY (12).
   * @example BRN: 202001234567
   */
  registrationNumber: string
  /** Supplier's SST registration number. Max 35 chars. "NA" if not applicable/available.
   * @example W10-1808-32000059
   */
  sstRegistrationNumber?: string
  /** Supplier's email address (RFC 5321/5322). Max 320 chars.
   * @example name@supplier.com
   */
  email?: string
  /** Supplier's address. */
  address: Address
  /** Supplier's contact number (E.164 standard). Max 20 chars.
   * @example +60123456789
   */
  contactNumber: string
  /** Industry classification code. Max 10 chars.
   * @example 46510
   */
  industryClassificationCode?: MSICCode['code']
}

/**
 * Represents the buyer information.
 * Based on the Buyer section of the documentation.
 */
export interface Buyer {
  /** Buyer's name. Max 300 chars.
   * @example Hebat Group
   */
  name: string
  /** Buyer's Tax Identification Number (TIN). Max 14 chars.
   * @example C00000000000
   */
  tin: string
  /**
   * Buyer's Registration / Identification Number / Passport Number.
   * Format depends on schemeID: NRIC (12), BRN (20), PASSPORT (12), ARMY (12).
   * @example BRN: 202001234567
   */
  registrationNumber: string
  /**
   * Buyer's SST registration number. Max 35 chars.
   * Mandatory for SST-registrants. Can be "NA" if not available.
   * Allows up to two numbers separated by ';'.
   * @example W10-1909-32000060
   */
  sstRegistrationNumber: string
  /** Buyer's email address (RFC 5321/5322). Max 320 chars.
   * @example name@buyer.com
   */
  email?: string
  /** Buyer's address. */
  address: Address
  /** Buyer's contact number (E.164 standard). Max 20 chars. "NA" allowed for consolidated e-invoice.
   * @example +60123456789
   */
  contactNumber: string
}

/**
 * Represents a single line item in an invoice.
 * Based on the Invoice Line Item section of the documentation.
 * https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/#invoice-line-item
 */
export interface InvoiceLineItem {
  /**
   * Item classification code. Refer to /codes/item-classifications/. Max 50 chars.
   * @example 001
   */
  itemClassificationCode: ClassificationCode
  /**
   * Item description. Max 300 chars.
   * @example Laptop
   */
  itemDescription: string
  /**
   * Unit price before tax. Max 18 digits, 6 decimal places.
   * @example 1500.00
   */
  unitPrice: number
  /**
   * Tax type code. Refer to /codes/tax-types/. Max 2 chars.
   * @example 01
   */
  taxType: TaxTypeCode
  /**
   * Tax rate. Max 18 digits, 2 decimal places.
   * @example 6.00
   */
  taxRate: number
  /**
   * Tax amount. Max 18 digits, 2 decimal places.
   * @example 90.00
   */
  taxAmount: number
  /**
   * Tax exemption reason code. Refer to /codes/tax-exemption-reasons/. Max 2 chars.
   * Mandatory if tax rate is 0%.
   * @example 02
   */
  taxExemptionReasonCode?: string
  /**
   * Tax exemption reason amount. Max 18 digits, 2 decimal places.
   * Mandatory if tax rate is 0%.
   * @example 1500.00
   */
  taxExemptionReasonAmount?: number
  /**
   * Total taxable amount per line (Quantity * Unit Price - Discount Amount). Max 18 digits, 2 decimal places.
   * @example 1500.00
   */
  totalTaxableAmountPerLine: number
  /**
   * Total amount per line including tax (Total Taxable Amount Per Line + Tax Amount). Max 18 digits, 2 decimal places.
   * @example 1590.00
   */
  totalAmountPerLine: number
  /**
   * Quantity of items. Max 18 digits, 6 decimal places.
   * @example 1.000000
   */
  quantity?: number
  /**
   * Measurement unit. Max 50 chars.
   * @example UNIT
   */
  measurement?: UnitTypeCode
  /**
   * Discount rate. Max 18 digits, 2 decimal places.
   * @example 0.00
   */
  discountRate?: number
  /**
   * Discount amount. Max 18 digits, 2 decimal places.
   * @example 0.00
   */
  discountAmount?: number
  /**
   * Payment account ID for self-billed invoices. Max 50 chars.
   * @example Account123
   */
  paymentAccountID?: string
  /**
   * Payment terms description. Max 100 chars.
   * @example Payment within 30 days
   */
  paymentTerms?: string
  /**
   * Country of origin code (ISO 3166-1). Refer to /codes/countries/. Max 3 chars.
   * @example MYS
   */
  countryOfOrigin?: CountryCode
}

/** Represents monetary totals for the invoice. Based on UBL cac:LegalMonetaryTotal. */
export interface LegalMonetaryTotal {
  /** Total amount exclusive of taxes. Max 18 digits, 2 decimal places. */
  taxExclusiveAmount: number
  /** Total amount inclusive of taxes. Max 18 digits, 2 decimal places. */
  taxInclusiveAmount: number
  /** Total allowance amount. Max 18 digits, 2 decimal places. */
  allowanceTotalAmount?: number
  /** Total charge amount. Max 18 digits, 2 decimal places. */
  chargeTotalAmount?: number
  /** Total prepaid amount. Max 18 digits, 2 decimal places. */
  prepaidAmount?: number
  /** Rounding amount applied to the total. Max 18 digits, 2 decimal places. */
  payableRoundingAmount?: number
  /** The final payable amount. Max 18 digits, 2 decimal places. */
  payableAmount: number
}

/** Represents tax category information. Based on UBL cac:TaxCategory. */
export interface TaxCategory {
  /** Tax type code. Refer to /codes/tax-types/. Max 2 chars. */
  taxTypeCode: TaxTypeCode
  /** Tax rate percentage. Max 18 digits, 2 decimal places. */
  taxRate: number
  /** Tax exemption reason code. Refer to /codes/tax-exemption-reasons/. Max 2 chars. */
  taxExemptionReasonCode?: string
  /** Tax exemption reason description. Max 300 chars. */
  taxExemptionReason?: string
}

/** Represents a subtotal for a specific tax category. Based on UBL cac:TaxSubtotal. */
export interface TaxSubtotal {
  /** Taxable amount for this category. Max 18 digits, 2 decimal places. */
  taxableAmount: number
  /** Tax amount for this category. Max 18 digits, 2 decimal places. */
  taxAmount: number
  /** Tax category details. */
  taxCategory: TaxCategory
}

/** Represents the total tax amount for the invoice. Based on UBL cac:TaxTotal. */
export interface TaxTotal {
  /** Total tax amount for the entire invoice. Max 18 digits, 2 decimal places. */
  taxAmount: number
  /** Array of tax subtotals. */
  taxSubtotals?: TaxSubtotal[]
}

/** Represents payment means information. Based on UBL cac:PaymentMeans. */
export interface PaymentMeans {
  /** Payment means code. Refer to /codes/payment-modes/. Max 2 chars. */
  paymentMeansCode: PaymentModeCode
  /** Payment due date (YYYY-MM-DD). Max 10 chars. */
  paymentDueDate?: string
  /** Payer's financial account ID. Max 50 chars. */
  payerFinancialAccountID?: string
  /** Payee's financial account ID. Max 50 chars. */
  payeeFinancialAccountID?: string
  /** Payment terms description. Max 100 chars. */
  paymentTerms?: string
}

/** Represents allowances or charges at the document level. Based on UBL cac:AllowanceCharge. */
export interface AllowanceCharge {
  /** Indicator: true for charge, false for allowance. */
  chargeIndicator: boolean
  /** Reason code for the allowance or charge. Refer to codes (if available). Max 50 chars */
  reasonCode?: string
  /** Reason description for the allowance or charge. Max 300 chars. */
  reason: string
  /** Multiplier factor (e.g., percentage rate). Max 18 digits, 2 decimal places */
  multiplierFactorNumeric?: number
  /** Amount of the allowance or charge. Max 18 digits, 2 decimal places. */
  amount: number
  /** Base amount for calculation (if applicable). Max 18 digits, 2 decimal places. */
  baseAmount?: number
  /** Tax category applied to this allowance/charge (if taxable). */
  taxCategory?: TaxCategory // Reusing TaxCategory
}

/** Represents delivery information. Based on UBL cac:Delivery. */
export interface Delivery {
  /** Actual delivery date (YYYY-MM-DD). Max 10 chars. */
  actualDeliveryDate?: string
  /** Delivery location address. */
  deliveryLocation?: Address // Reusing Address type
  /** Party responsible for delivery (optional, structure similar to Buyer/Supplier but minimal). */
  deliveryParty?: {
    /** Name of the delivery party. Max 300 chars. */
    name?: string
  }
}

/**
 * Represents the core Invoice v1.1 document structure.
 * Based on the Core section of the documentation.
 */
export interface InvoiceV1_1 {
  /** Supplier information. */
  supplier: Supplier
  /** Buyer information. */
  buyer: Buyer
  /** e-Invoice version. Fixed value '1.1'. */
  eInvoiceVersion: '1.1'
  /** e-Invoice type code. Refer to /codes/e-invoice-types/. Max 2 chars. */
  eInvoiceTypeCode: EInvoiceTypeCode // e.g., '01'
  /** Document reference number used by Supplier. Max 50 chars. */
  eInvoiceCodeOrNumber: string // e.g., 'INV12345'
  /** Date of issuance (YYYY-MM-DD) in UTC. Max 10 chars. */
  eInvoiceDate: string // e.g., '2017-11-26'
  /** Time of issuance (HH:mm:ssZ) in UTC. Max 9 chars. */
  eInvoiceTime: string // e.g., '15:30:00Z'
  /** Issuer's digital signature. Refer to /signature/ documentation. */
  issuerDigitalSignature: IssuerDigitalSignature
  /** Invoice currency code. Refer to /codes/currencies/. Max 3 chars. */
  invoiceCurrencyCode: CurrencyCode // e.g., 'MYR'
  /** Invoice line items. */
  invoiceLineItems: InvoiceLineItem[]
  /**
   * Currency exchange rate to MYR. Max 15 decimal places.
   * Mandatory if InvoiceCurrencyCode is not MYR.
   */
  currencyExchangeRate?: number // e.g., 1.0 or 4.75
  /** Frequency of billing description. Max 50 chars. */
  frequencyOfBilling?: string // e.g., 'Monthly'
  /** Billing period start date (YYYY-MM-DD). Max 10 chars. */
  billingPeriodStartDate?: string // e.g., '2017-11-01'
  /** Billing period end date (YYYY-MM-DD). Max 10 chars. */
  billingPeriodEndDate?: string // e.g., '2017-11-30'

  /** Overall monetary totals for the invoice. */
  legalMonetaryTotal: LegalMonetaryTotal
  /** Total tax amounts and subtotals. */
  taxTotal: TaxTotal
  /** Payment means details. Can occur multiple times. */
  paymentMeans?: PaymentMeans[]
  /** Document-level allowances or charges. Can occur multiple times. */
  allowanceCharges?: AllowanceCharge[]
  /** Delivery information. */
  delivery?: Delivery
}
