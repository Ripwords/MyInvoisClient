import type { ClassificationCode } from './classification-codes.d.ts'
import type { CurrencyCode } from './currencies.d.ts'
import type { EInvoiceTypeCode } from './e-invoice.d.ts'
import type { MSICCode } from './msic-codes.d.ts'
import type { TaxTypeCode } from './tax-types.d.ts'
import type { StateCode } from './state-codes.d.ts'
import type { CountryCode } from './country-code.d.ts'
import type { UnitTypeCode } from './unit-types.d.ts'

export type RegistrationType = 'BRN' | 'NRIC' | 'PASSPORT' | 'ARMY'

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
  /** City name. Max 50 chars. */
  cityName: string
  /** State code. Refer to /codes/state-codes/. Max 50 chars. */
  state: StateCode
  /** Country code (ISO 3166-1). Refer to /codes/countries/. Max 3 chars. */
  country: CountryCode // MYS
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
   * Supplier's Registration Type. NRIC, BRN, PASSPORT
   * @example NRIC
   */
  registrationType: RegistrationType
  /**
   * Supplier's Registration / Identification Number / Passport Number.
   * Format depends on schemeID: NRIC (12), BRN (20), PASSPORT (12)
   * @example BRN: 202001234567
   */
  registrationNumber: string
  /** Supplier's address. */
  address: Address
  /** Supplier's contact number (E.164 standard). Max 20 chars.
   * @example +60123456789
   */
  contactNumber: string
  /**
   * Supplier's industry classification code. Max 10 chars.
   * @example 41001
   */
  industryClassificationCode: MSICCode['code']
  /**
   * Supplier's industry classification description. Max 300 chars.
   * @example Other retail sale in non-specialised stores
   */
  industryClassificationDescription: MSICCode['description']
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
   * @example C12345678901
   */
  tin: string
  /**
   * Buyer's Registration Type. NRIC, BRN, PASSPORT
   * @example BRN
   */
  registrationType: RegistrationType
  /**
   * Buyer's Registration / Identification Number / Passport Number.
   * Format depends on schemeID: NRIC (12), BRN (20), PASSPORT (12).
   * @example BRN: 202001234567
   */
  registrationNumber: string
  /**
   * Buyer's SST registration number. Max 35 chars.
   * Mandatory for SST-registrants.
   * Allows up to two numbers separated by ';'.
   * @example W10-1909-32000060
   */
  sstRegistrationNumber?: string
  /** Buyer's address. */
  address: Address
  /** Buyer's contact number (E.164 standard). Max 20 chars.
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
   * Tax rate percentage. Max 18 digits, 2 decimal places.
   * Used for percentage-based taxation.
   * @example 6.00
   */
  taxRate?: number
  /**
   * Tax amount per unit for fixed rate taxation. Max 18 digits, 2 decimal places.
   * Used when tax is calculated as a fixed amount per unit.
   * @example 10.00
   */
  taxPerUnitAmount?: number
  /**
   * Number of units for fixed rate taxation.
   * Used when tax is calculated as a fixed amount per unit.
   * @example 5
   */
  baseUnitMeasure?: number
  /**
   * Unit code for BaseUnitMeasure (e.g., 'C62' for units, 'DAY' for days).
   * Required when using fixed rate taxation.
   * @example 'C62'
   */
  baseUnitMeasureCode?: UnitTypeCode
  /**
   * Discount amount. Optional per spec; include when a line discount exists.
   * UBL mapping: / ubl:Invoice / cac:InvoiceLine / cac:AllowanceCharge / cbc:Amount
   * Max 18 digits, 2 decimal places.
   * @example 10.00
   */
  discountAmount?: number
  /**
   * Discount rate. Optional helper if you calculate discount by rate.
   * If provided, maps to UBL cbc:MultiplierFactorNumeric on cac:AllowanceCharge.
   * Ranges from 0.00 to 1.00.
   * @example 0.15
   */
  discountRate?: number
  /**
   * Tax amount. Max 18 digits, 2 decimal places.
   * For percentage tax: calculated as taxableAmount * taxRate / 100
   * For fixed rate: calculated as taxPerUnitAmount * baseUnitMeasure
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
}

/** Represents monetary totals for the invoice. Based on UBL cac:LegalMonetaryTotal. */
export interface LegalMonetaryTotal {
  /** Total amount exclusive of taxes. Max 18 digits, 2 decimal places. */
  taxExclusiveAmount: number
  /** Total amount inclusive of taxes. Max 18 digits, 2 decimal places. */
  taxInclusiveAmount: number
  /** The final payable amount. Max 18 digits, 2 decimal places. */
  payableAmount: number
}

/** Represents tax category information. Based on UBL cac:TaxCategory. */
export interface TaxCategory {
  /** Tax type code. Refer to /codes/tax-types/. Max 2 chars. */
  taxTypeCode: TaxTypeCode
  /** Tax rate percentage. Max 18 digits, 2 decimal places. */
  taxRate: number
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
  /** Invoice currency code. Refer to /codes/currencies/. Max 3 chars. */
  invoiceCurrencyCode: CurrencyCode // e.g., 'MYR'
  /** Invoice line items. */
  invoiceLineItems: InvoiceLineItem[]
  /**
   * Currency exchange rate to MYR. Max 15 decimal places.
   * Mandatory if InvoiceCurrencyCode is not MYR.
   */
  currencyExchangeRate?: number // e.g., 1.0 or 4.75

  /** Overall monetary totals for the invoice. */
  legalMonetaryTotal: LegalMonetaryTotal
  /** Total tax amounts and subtotals. */
  taxTotal: TaxTotal
}

export interface CreditNoteV1_1 {
  /** Supplier information (AccountingSupplierParty). */
  supplier: Supplier
  /** Buyer information (AccountingCustomerParty). */
  buyer: Buyer

  /** e-Invoice version. Fixed value '1.1'. */
  eInvoiceVersion: '1.1'
  /** e-Invoice type code for Credit Note. Fixed value '02'. */
  eInvoiceTypeCode: EInvoiceTypeCode
  /** Document reference number used by Supplier for internal tracking purpose. Max 50 chars. */
  eInvoiceCodeOrNumber: string
  /** LHDNM Unique Identifier Number of the original invoice / document that is being adjusted. 26 chars. */
  originalEInvoiceReferenceNumber: string
  /** LHDNM Unique Identifier Number of the original invoice / document that is being adjusted. Mandatory where applicable (Debit/Credit/Refund notes). */
  originalEInvoiceInternalId: string
  /** Date of issuance (YYYY-MM-DD) in UTC. Must be the current date. */
  eInvoiceDate: string
  /** Time of issuance (HH:mm:ssZ) in UTC. Must be the current time. */
  eInvoiceTime: string

  /** Specific currency that is used to represent the monetary value stated in the e-Invoice. */
  invoiceCurrencyCode: CurrencyCode
  /** Rate at which non-Malaysian currency will be converted into Malaysian Ringgit.
   * Mandatory when invoiceCurrencyCode is not 'MYR'.
   */
  currencyExchangeRate?: number

  /** Credit note line items. */
  creditNoteLineItems: InvoiceLineItem[]

  /** Overall monetary totals for the credit note. */
  legalMonetaryTotal: LegalMonetaryTotal
  /** Total tax amounts and subtotals. */
  taxTotal: TaxTotal
}

export interface DebitNoteV1_1 {
  /** Supplier information (AccountingSupplierParty). */
  supplier: Supplier
  /** Buyer information (AccountingCustomerParty). */
  buyer: Buyer

  /** e-Invoice version. Fixed value '1.1'. */
  eInvoiceVersion: '1.1'
  /** e-Invoice type code for Debit Note. Fixed value '03'. */
  eInvoiceTypeCode: EInvoiceTypeCode
  /** Document reference number used by Supplier for internal tracking purpose. Max 50 chars. */
  eInvoiceCodeOrNumber: string
  /** LHDNM Unique Identifier Number of the original invoice / document that is being adjusted. Mandatory where applicable (Debit/Credit/Refund notes). */
  originalEInvoiceReferenceNumber: string
  /** LHDNM Unique Identifier Number of the original invoice / document that is being adjusted. Mandatory where applicable (Debit/Credit/Refund notes). */
  originalEInvoiceInternalId: string
  /** Date of issuance (YYYY-MM-DD) in UTC. Must be the current date. */
  eInvoiceDate: string
  /** Time of issuance (HH:mm:ssZ) in UTC. Must be the current time. */
  eInvoiceTime: string

  /** Specific currency that is used to represent the monetary value stated in the e-Invoice. */
  invoiceCurrencyCode: CurrencyCode
  /** Rate at which non-Malaysian currency will be converted into Malaysian Ringgit.
   * Mandatory when invoiceCurrencyCode is not 'MYR'.
   */
  currencyExchangeRate?: number

  /** Debit note line items (InvoiceLine section with required fields). */
  debitNoteLineItems: InvoiceLineItem[]

  /** Overall monetary totals for the debit note. */
  legalMonetaryTotal: LegalMonetaryTotal
  /** Total tax amounts and subtotals. */
  taxTotal: TaxTotal
}

export interface RefundNoteV1_1 {
  /** Supplier information (AccountingSupplierParty). */
  supplier: Supplier
  /** Buyer information (AccountingCustomerParty). */
  buyer: Buyer

  /** e-Invoice version. Fixed value '1.1'. */
  eInvoiceVersion: '1.1'
  /** e-Invoice type code for Refund Note. Fixed value '04'. */
  eInvoiceTypeCode: EInvoiceTypeCode
  /** Document reference number used by Supplier for internal tracking purpose. Max 50 chars. */
  eInvoiceCodeOrNumber: string
  /** LHDNM Unique Identifier Number of the original invoice / document that is being adjusted. Mandatory where applicable (Debit/Credit/Refund notes). */
  originalEInvoiceReferenceNumber: string
  /** Date of issuance (YYYY-MM-DD) in UTC. Must be the current date. */
  eInvoiceDate: string
  /** Time of issuance (HH:mm:ssZ) in UTC. Must be the current time. */
  eInvoiceTime: string

  /** Specific currency that is used to represent the monetary value stated in the e-Invoice. */
  invoiceCurrencyCode: CurrencyCode
  /** Rate at which non-Malaysian currency will be converted into Malaysian Ringgit.
   * Mandatory when invoiceCurrencyCode is not 'MYR'.
   */
  currencyExchangeRate?: number

  /** Refund note line items. */
  refundNoteLineItems: InvoiceLineItem[]

  /** Overall monetary totals for the refund note. */
  legalMonetaryTotal: LegalMonetaryTotal
  /** Total tax amounts and subtotals. */
  taxTotal: TaxTotal
}

export interface SelfBilledInvoiceV1_1 {
  /** Supplier information (AccountingSupplierParty). */
  supplier: Supplier
  /** Buyer information (AccountingCustomerParty). */
  buyer: Buyer

  /** e-Invoice version. Fixed value '1.1'. */
  eInvoiceVersion: '1.1'
  /** e-Invoice type code for Self-Billed Invoice. Fixed value '11'. */
  eInvoiceTypeCode: EInvoiceTypeCode
  /** Document reference number used by Buyer (acting as issuer) for internal tracking purpose. Max 50 chars. */
  eInvoiceCodeOrNumber: string
  /** Date of issuance (YYYY-MM-DD) in UTC. Must be the current date. */
  eInvoiceDate: string
  /** Time of issuance (HH:mm:ssZ) in UTC. Must be the current time. */
  eInvoiceTime: string

  /** Specific currency used to represent the monetary values stated in the e-Invoice. */
  invoiceCurrencyCode: CurrencyCode
  /** Currency exchange rate to MYR when invoiceCurrencyCode is not 'MYR'. Mandatory where applicable. */
  currencyExchangeRate?: number

  /** Frequency of billing (e.g., Daily, Monthly). Optional. */
  frequencyOfBilling?: string
  /** Billing period start date (YYYY-MM-DD). Optional but allowed; include to match spec for optional elements. */
  billingPeriodStartDate?: string
  /** Billing period end date (YYYY-MM-DD). Optional. */
  billingPeriodEndDate?: string

  /** Invoice line items. */
  invoiceLineItems: InvoiceLineItem[]

  /** Overall monetary totals for the invoice. */
  legalMonetaryTotal: LegalMonetaryTotal
  /** Total tax amounts and subtotals. */
  taxTotal: TaxTotal
}

export interface SelfBilledCreditNoteV1_1 {
  /** Supplier information. */
  supplier: Supplier
  /** Buyer information. */
  buyer: Buyer

  /** Fixed e-Invoice version '1.1'. */
  eInvoiceVersion: '1.1'
  /** e-Invoice type code for Self-Billed Credit Note (code '12'). */
  eInvoiceTypeCode: EInvoiceTypeCode
  /** Internal document reference number issued by Buyer. Max 50 chars. */
  eInvoiceCodeOrNumber: string
  /** LHDNM unique identifier of the original self-billed invoice being adjusted. */
  originalEInvoiceReferenceNumber: string
  /** Date of issuance (YYYY-MM-DD, UTC). */
  eInvoiceDate: string
  /** Time of issuance (HH:mm:ssZ, UTC). */
  eInvoiceTime: string

  /** Currency code for monetary values. */
  invoiceCurrencyCode: CurrencyCode
  /** Exchange rate to MYR – required when invoiceCurrencyCode ≠ 'MYR'. */
  currencyExchangeRate?: number

  /** Line items for the credit note. */
  selfBilledCreditNoteLineItems: InvoiceLineItem[]

  /** Monetary totals. */
  legalMonetaryTotal: LegalMonetaryTotal
  /** Tax totals. */
  taxTotal: TaxTotal
}

export interface SelfBilledRefundNoteV1_1 {
  /** Supplier information issued in the self-billed refund note. */
  supplier: Supplier
  /** Buyer information (issuer of the self-billed document). */
  buyer: Buyer

  /** Fixed e-Invoice version. */
  eInvoiceVersion: '1.1'
  /** e-Invoice type code for Self-Billed Refund Note (code '14'). */
  eInvoiceTypeCode: EInvoiceTypeCode
  /** Internal tracking reference number. Max 50 chars. */
  eInvoiceCodeOrNumber: string
  /** Original self-billed invoice UUID being adjusted (mandatory for refund/credit/debit). */
  originalEInvoiceReferenceNumber: string
  /** Issue date (YYYY-MM-DD, UTC). */
  eInvoiceDate: string
  /** Issue time (HH:mm:ssZ, UTC). */
  eInvoiceTime: string

  /** Document currency code. */
  invoiceCurrencyCode: CurrencyCode
  /** Exchange rate to MYR when currency ≠ 'MYR'. */
  currencyExchangeRate?: number

  /** Line items contained in the refund note. */
  selfBilledRefundNoteLineItems: InvoiceLineItem[]

  /** Monetary totals for the document. */
  legalMonetaryTotal: LegalMonetaryTotal
  /** Tax totals for the document. */
  taxTotal: TaxTotal
}

export type AllDocumentsV1_1 =
  | InvoiceV1_1
  | CreditNoteV1_1
  | DebitNoteV1_1
  | RefundNoteV1_1
  | SelfBilledInvoiceV1_1
  | SelfBilledCreditNoteV1_1
  | SelfBilledRefundNoteV1_1

export type SubmissionStatus =
  | 'InProgress'
  | 'Valid'
  | 'PartiallyValid'
  | 'Invalid'
  | 'TimedOut'
  | 'Submitted'

export type DocumentStatus = 'Valid' | 'Invalid' | 'Cancelled' | 'Submitted'

export type StandardError = {
  code: string
  message: string
  target: string
  details: {
    code: string
    message: string
    target: string
  }[]
}

export type DocumentValidationResult = 'Valid' | 'Invalid' | 'Pending'
export interface DocumentValidationStepResult {
  name: string
  status: DocumentValidationResult
  error?: StandardError
}
export interface DocumentSummary {
  uuid: string
  submissionUid: string
  longId: string
  internalId: string
  typeName: string
  typeVersionName: string
  issuerTin: string
  issuerName: string
  receiverId: string
  receiverName: string
  dateTimeIssued: string
  dateTimeReceived: string
  dateTimeValidated: string
  totalPayableAmount: number
  totalExcludingTax: number
  totalDiscount: number
  totalNetAmount: number
  status: DocumentStatus
  cancelDateTime: string | null
  rejectRequestDateTime: string | null
  documentStatusReason: string | null
  createdByUserId: string
}

export interface GetSubmissionResponse {
  submissionUid?: string
  documentCount?: number
  dateTimeReceived?: string
  overallStatus?: SubmissionStatus
  documentSummary?: DocumentSummary[]
  error?: StandardError
}

export interface ResponseDocument {
  invoiceCodeNumber: string
  error?: StandardError
}
export interface SubmissionResponse {
  submissionUid: string
  acceptedDocuments: ResponseDocument[]
  rejectedDocuments: ResponseDocument[]
}

export interface SigningCredentials {
  /** Private key in PEM format for signing */
  privateKeyPem: string
  /** Certificate in PEM format */
  certificatePem: string
  /** Certificate issuer name (e.g., "CN=Trial LHDNM Sub CA V1, OU=Terms of use at https://www.posdigicert.com.my, O=LHDNM, C=MY") */
  issuerName: string
  /** Certificate serial number as string */
  serialNumber: string
}

export interface FinalDocumentData {
  signatureValue: string // Base64 encoded RSA signature (Sig from Step 4)
  propsDigest: string // Base64 encoded hash of SignedProperties (PropsDigest from Step 7)
  docDigest: string // Base64 encoded hash of Canonicalized Document (DocDigest from Step 3)
  certificatePem: string // Signing certificate in PEM format
}

export interface SignedPropertiesData {
  certDigest: string // Base64 encoded SHA-256 hash of certificate (Step 5)
  signingTime: string // ISO 8601 UTC timestamp string (e.g., 2023-10-26T10:30:00Z)
  issuerName: string // Certificate Issuer Name
  serialNumber: string // Certificate Serial Number
}

export interface InvoiceSubmission {
  /** Invoice ID */
  ID: {
    _: string
  }[]

  /** Issue date in YYYY-MM-DD format */
  IssueDate: {
    _: string
  }[]

  /** Issue time in HH:mm:ssZ format */
  IssueTime: {
    _: string
  }[]

  /** Invoice type code with version */
  InvoiceTypeCode: {
    _: string
    listVersionID: string
  }[]

  /** Document currency code */
  DocumentCurrencyCode: {
    _: string
  }[]

  /** Supplier party information */
  AccountingSupplierParty: {
    Party: {
      IndustryClassificationCode: {
        _: string
        name: string
      }[]
      PartyIdentification: {
        ID: {
          _: string
          schemeID: string
        }[]
      }[]
      PostalAddress: {
        CityName: {
          _: string
        }[]
        CountrySubentityCode: {
          _: string
        }[]
        AddressLine: {
          Line: {
            _: string
          }[]
        }[]
        Country: {
          IdentificationCode: {
            _: string
            listID: string
            listAgencyID: string
          }[]
        }[]
      }[]
      PartyLegalEntity: {
        RegistrationName: {
          _: string
        }[]
      }[]
      Contact: {
        Telephone: {
          _: string
        }[]
      }[]
    }[]
  }[]

  /** Customer party information */
  AccountingCustomerParty: {
    Party: {
      PartyIdentification: {
        ID: {
          _: string
          schemeID: string
        }[]
      }[]
      PostalAddress: {
        CityName: {
          _: string
        }[]
        CountrySubentityCode: {
          _: string
        }[]
        AddressLine: {
          Line: {
            _: string
          }[]
        }[]
        Country: {
          IdentificationCode: {
            _: string
            listID: string
            listAgencyID: string
          }[]
        }[]
      }[]
      PartyLegalEntity: {
        RegistrationName: {
          _: string
        }[]
      }[]
      Contact: {
        Telephone: {
          _: string
        }[]
      }[]
    }[]
  }[]

  /** Tax total */
  TaxTotal: {
    TaxAmount: {
      _: number
      currencyID: string
    }[]
    TaxSubtotal: {
      TaxableAmount: {
        _: number
        currencyID: string
      }[]
      TaxAmount: {
        _: number
        currencyID: string
      }[]
      TaxCategory: {
        ID: {
          _: string
        }[]
        TaxScheme: {
          ID: {
            _: string
            schemeAgencyID: string
            schemeID: string
          }[]
        }[]
      }[]
    }[]
  }[]

  /** Legal monetary total */
  LegalMonetaryTotal: {
    LineExtensionAmount: {
      _: number
      currencyID: string
    }[]
    TaxExclusiveAmount: {
      _: number
      currencyID: string
    }[]
    TaxInclusiveAmount: {
      _: number
      currencyID: string
    }[]
    /** Total allowance (discount) amount at document level (optional) */
    AllowanceTotalAmount?: {
      _: number
      currencyID: string
    }[]
    PayableAmount: {
      _: number
      currencyID: string
    }[]
  }[]

  /** Invoice line items */
  InvoiceLine: {
    ID: {
      _: string
    }[]
    Item: {
      CommodityClassification: {
        ItemClassificationCode: {
          _: string
          listID: string
        }[]
      }[]
      Description: {
        _: string
      }[]
    }[]
    ItemPriceExtension: {
      Amount: {
        _: number
        currencyID: string
      }[]
    }[]
    LineExtensionAmount: {
      _: number
      currencyID: string
    }[]
    Price: {
      PriceAmount: {
        _: number
        currencyID: string
      }[]
    }[]
    /** Line-level discount (AllowanceCharge with ChargeIndicator=false) */
    AllowanceCharge?: {
      ChargeIndicator: {
        _: boolean
      }[]
      Amount: {
        _: number
        currencyID: string
      }[]
      /** Optional when discount is specified by rate */
      MultiplierFactorNumeric?: {
        _: number
      }[]
      /** Optional base amount for discount calculation */
      BaseAmount?: {
        _: number
        currencyID: string
      }[]
    }[]
    TaxTotal: {
      TaxAmount: {
        _: number
        currencyID: string
      }[]
      TaxSubtotal: {
        TaxableAmount: {
          _: number
          currencyID: string
        }[]
        TaxAmount: {
          _: number
          currencyID: string
        }[]
        /** For percentage-based taxation */
        Percent?: {
          _: number
        }[]
        /** For fixed rate taxation - Total Amount per Unit */
        PerUnitAmount?: {
          _: number
          currencyID: string
        }[]
        /** For fixed rate taxation - Number of Units */
        BaseUnitMeasure?: {
          _: number
          unitCode: string
        }[]
        TaxCategory: {
          ID: {
            _: string
          }[]
          TaxScheme: {
            ID: {
              _: string
              schemeAgencyID: string
              schemeID: string
            }[]
          }[]
        }[]
      }[]
    }[]
  }[]

  /** Tax exchange rate - Mandatory where applicable */
  TaxExchangeRate?: {
    SourceCurrencyCode: {
      _: string
    }[]
    TargetCurrencyCode: {
      _: string
    }[]
    CalculationRate: {
      _: number
    }[]
  }[]

  /** UBL Extensions for signatures (optional - only present in signed documents) */
  UBLExtensions?: {
    UBLExtension: {
      ExtensionURI: {
        _: string
      }[]
      ExtensionContent: {
        UBLDocumentSignatures: {
          SignatureInformation: {
            ID: {
              _: string
            }[]
            ReferencedSignatureID: {
              _: string
            }[]
            Signature: {
              Id: string
              Object: {
                QualifyingProperties: {
                  Target: string
                  SignedProperties: {
                    Id: string
                    SignedSignatureProperties: {
                      SigningTime: {
                        _: string
                      }[]
                      SigningCertificate: {
                        Cert: {
                          CertDigest: {
                            DigestMethod: {
                              /** Optional text content field (required by MyInvois JSON signature spec). Typically blank string */
                              _?: string
                              Algorithm: string
                            }[]
                            DigestValue: {
                              _: string
                            }[]
                          }[]
                          IssuerSerial: {
                            X509IssuerName: {
                              _: string
                            }[]
                            X509SerialNumber: {
                              _: string
                            }[]
                          }[]
                        }[]
                      }[]
                    }[]
                  }[]
                }[]
              }[]
              KeyInfo: {
                X509Data: {
                  X509Certificate: {
                    _: string
                  }[]
                  X509SubjectName: {
                    _: string
                  }[]
                  X509IssuerSerial: {
                    X509IssuerName: {
                      _: string
                    }[]
                    X509SerialNumber: {
                      _: string
                    }[]
                  }[]
                }[]
              }[]
              SignatureValue: {
                _: string
              }[]
              SignedInfo: SignedInfoObject[]
            }[]
          }[]
        }[]
      }[]
    }[]
  }[]

  /** Signature reference (optional - only present in signed documents) */
  Signature?: {
    ID: {
      _: string
    }[]
    SignatureMethod: {
      _: string
    }[]
  }[]

  /** Billing reference linking to original invoice (used for credit/debit/refund). Optional. */
  BillingReference?: {
    InvoiceDocumentReference: {
      /** LHDNM Unique Identifier Number */
      UUID: { _: string }[]
      /** Internal ID (e-Invoice Code/Number) */
      ID: { _: string }[]
    }[]
  }[]
}

/** Represents the complete UBL document structure with namespace declarations */
export interface UBLDocument {
  /** UBL Invoice namespace */
  _D: string
  /** UBL CommonAggregateComponents namespace */
  _A: string
  /** UBL CommonBasicComponents namespace */
  _B: string
  /** Array of invoice submissions */
  Invoice: InvoiceSubmission[]
}

/** Represents the signed properties structure for digital signatures */
export interface SignedPropertiesObject {
  SignedProperties: {
    /** Unique identifier for the signed properties */
    Id: string
    /** Signed signature properties containing signing details */
    SignedSignatureProperties: {
      /** Signing timestamp */
      SigningTime: {
        _: string
      }[]
      /** Signing certificate information */
      SigningCertificate: {
        /** Certificate details */
        Cert: {
          /** Certificate digest information */
          CertDigest: {
            /** Digest method algorithm */
            DigestMethod: {
              /** Optional text content field (required by MyInvois JSON signature spec). Typically blank string */
              _?: string
              Algorithm: string
            }[]
            /** Base64 encoded digest value */
            DigestValue: {
              _: string
            }[]
          }[]
          /** Certificate issuer and serial information */
          IssuerSerial: {
            /** X.509 issuer distinguished name */
            X509IssuerName: {
              _: string
            }[]
            /** X.509 certificate serial number */
            X509SerialNumber: {
              _: string
            }[]
          }[]
        }[]
      }[]
    }[]
  }[]
}

/** Represents the signed info structure for digital signatures */
export interface SignedInfoObject {
  /** Canonicalization method */
  CanonicalizationMethod: {
    _: string
    Algorithm: string
  }[]
  /** Signature method */
  SignatureMethod: {
    _: string
    Algorithm: string
  }[]
  /** References being signed */
  Reference: {
    Id: string
    Type: string
    URI: string
    DigestMethod: {
      _: string
      Algorithm: string
    }[]
    DigestValue: {
      _: string
    }[]
  }[]
}

/** Represents a complete signed invoice with all signature elements */
export interface SignedInvoiceSubmission extends InvoiceSubmission {
  /** UBL Extensions for signatures - required for signed documents */
  UBLExtensions: {
    UBLExtension: {
      ExtensionURI: {
        _: string
      }[]
      ExtensionContent: {
        UBLDocumentSignatures: {
          SignatureInformation: {
            ID: {
              _: string
            }[]
            ReferencedSignatureID: {
              _: string
            }[]
            Signature: {
              Id: string
              Object: {
                QualifyingProperties: {
                  Target: string
                  SignedProperties: {
                    Id: string
                    SignedSignatureProperties: {
                      SigningTime: {
                        _: string
                      }[]
                      SigningCertificate: {
                        Cert: {
                          CertDigest: {
                            DigestMethod: {
                              /** Optional text content field (required by MyInvois JSON signature spec). Typically blank string */
                              _?: string
                              Algorithm: string
                            }[]
                            DigestValue: {
                              _: string
                            }[]
                          }[]
                          IssuerSerial: {
                            X509IssuerName: {
                              _: string
                            }[]
                            X509SerialNumber: {
                              _: string
                            }[]
                          }[]
                        }[]
                      }[]
                    }[]
                  }[]
                }[]
              }[]
              KeyInfo: {
                X509Data: {
                  X509Certificate: {
                    _: string
                  }[]
                  X509SubjectName: {
                    _: string
                  }[]
                  X509IssuerSerial: {
                    X509IssuerName: {
                      _: string
                    }[]
                    X509SerialNumber: {
                      _: string
                    }[]
                  }[]
                }[]
              }[]
              SignatureValue: {
                _: string
              }[]
              SignedInfo: SignedInfoObject[]
            }[]
          }[]
        }[]
      }[]
    }[]
  }[]

  /** Signature reference - required for signed documents */
  Signature: {
    ID: {
      _: string
    }[]
    SignatureMethod: {
      _: string
    }[]
  }[]
}

export interface CompleteInvoice {
  /** UBL Invoice namespace */
  _D: string
  /** UBL CommonAggregateComponents namespace */
  _A: string
  /** UBL CommonBasicComponents namespace */
  _B: string
  /** Array of signed invoice submissions */
  Invoice: SignedInvoiceSubmission[]
}

export interface DocumentTypeVersion {
  id: number
  name: string
  description: string
  activeFrom: string
  activeTo: string
  versionNumber: number
  status: 'draft' | 'published' | 'deactivated'
}

export interface WorkflowParameter {
  id: number
  parameter: string
  value: number
  activeFrom: string
  activeTo: string
}

export interface DocumentTypeResponse {
  id: number
  invoiceTypeCode: EInvoiceTypeCode
  description: string
  activeFrom: string
  activeTo: string
  documentTypeVersions: DocumentTypeVersion[]
  workflowParameters: WorkflowParameter[]
}
export interface DocumentTypesResponse {
  result: Omit<DocumentTypeResponse, 'workflowParameters'>[]
}

export interface DocumentTypeVersionResponse {
  invoiceTypeCode: EInvoiceTypeCode
  name: string
  description: string
  versionNumber: number
  status: 'published' | 'deactivated'
  activeFrom: string
  activeTo: string
}
