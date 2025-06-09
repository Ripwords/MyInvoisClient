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
   * Supplier's Registration Type. NRIC, BRN, PASSPORT
   * @example NRIC
   */
  registrationType: 'BRN' | 'NRIC' | 'PASSPORT'
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
  /** Industry classification description. Max 300 chars.
   * @example Wholesale of computer hardware, software and peripherals
   */
  industryClassificationDescription?: string
  /** Certified exporter authorization number. Max 300 chars.
   * @example CPT-CCN-W-211111-KL-000002
   */
  certifiedExporterAuthNumber?: string
  /** Additional account ID for certificate reference. Max 50 chars.
   * Used for CertEx scheme agency references.
   * @example CERT123456
   */
  additionalAccountId?: string
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
   * Buyer's Registration Type. NRIC, BRN, PASSPORT, ARMY
   * @example BRN
   */
  registrationType?: 'BRN' | 'NRIC' | 'PASSPORT' | 'ARMY'
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
  /**
   * Product tariff code. Max 50 chars.
   * @example 01012000
   */
  productTariffCode?: string
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
  /** Payment instruction ID. Max 50 chars. */
  paymentInstructionId?: string
  /** Payment channel code. Max 10 chars. */
  paymentChannelCode?: string
}

/** Currency exchange rate information for international transactions */
export interface CurrencyExchangeRate {
  /** Source currency code (invoice currency). Max 3 chars. */
  sourceCurrencyCode: CurrencyCode
  /** Target currency code (typically MYR). Max 3 chars. */
  targetCurrencyCode: CurrencyCode
  /** Exchange rate value. Max 15 decimal places. */
  calculationRate: number
  /** Date of exchange rate (YYYY-MM-DD). Max 10 chars. */
  exchangeRateDate?: string
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
  /** Latest delivery date (YYYY-MM-DD). Max 10 chars. */
  latestDeliveryDate?: string
  /** Delivery location address. */
  deliveryLocation?: Address // Reusing Address type
  /** Party responsible for delivery (optional, structure similar to Buyer/Supplier but minimal). */
  deliveryParty?: {
    /** Name of the delivery party. Max 300 chars. */
    name?: string
    /** Delivery party address. */
    address?: Address
    /** Delivery party TIN. Max 14 chars. */
    tin?: string
    /** Delivery party registration number. Max 20 chars. */
    registrationNumber?: string
    /** Delivery party registration type. */
    registrationType?: 'BRN' | 'NRIC' | 'PASSPORT' | 'ARMY'
    /** Delivery party contact information */
    contactNumber?: string
    /** Delivery party email */
    email?: string
  }
  /** Shipment information for delivery charges. */
  shipment?: {
    /** Shipment ID. Max 50 chars. */
    id?: string
    /** Tracking number. Max 50 chars. */
    trackingNumber?: string
    /** Freight allowance charge information. */
    freightAllowanceCharge?: {
      /** Charge indicator: true for charge, false for allowance. */
      chargeIndicator: boolean
      /** Reason for the charge. Max 300 chars. */
      reason: string
      /** Amount of the charge. Max 18 digits, 2 decimal places. */
      amount: number
    }
  }
}

/** Represents additional document references like customs forms, FTA info, etc. */
export interface AdditionalDocumentReference {
  /** Reference ID. Max 1000 chars. */
  id: string
  /** Document type (e.g., 'CustomsImportForm', 'FreeTradeAgreement', 'K2'). Max 50 chars. */
  documentType: string
  /** Optional document description. Max 300 chars. */
  documentDescription?: string
}

/** Represents prepaid payment information. */
export interface PrepaidPayment {
  /** Reference number. Max 150 chars. */
  referenceNumber: string
  /** Prepaid amount. Max 18 digits, 2 decimal places. */
  amount: number
  /** Payment date (YYYY-MM-DD). Max 10 chars. */
  date: string
  /** Payment time (HH:mm:ssZ). Max 9 chars. */
  time: string
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
  /** Enhanced currency exchange rate information for international transactions */
  taxExchangeRate?: CurrencyExchangeRate
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
  /** Additional document references (customs forms, FTA info, etc.) */
  additionalDocumentReferences?: AdditionalDocumentReference[]
  /** Prepaid payment information. */
  prepaidPayment?: PrepaidPayment
  /** Payment terms description. Max 300 chars. */
  paymentTerms?: string
  /** Project reference number. Max 50 chars. */
  projectReference?: string
  /** Contract reference number. Max 50 chars. */
  contractReference?: string
  /** Purchase order reference number. Max 50 chars. */
  purchaseOrderReference?: string
  /** Billing reference number. Max 50 chars. */
  billingReference?: string
}

export type SubmissionStatus =
  | 'InProgress'
  | 'Valid'
  | 'PartiallyValid'
  | 'Invalid'

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

  /** Invoice period information */
  InvoicePeriod: {
    StartDate: {
      _: string
    }[]
    EndDate: {
      _: string
    }[]
    Description: {
      _: string
    }[]
  }[]

  /** Billing reference */
  BillingReference: {
    AdditionalDocumentReference: {
      ID: {
        _: string
      }[]
    }[]
  }[]

  /** Additional document references */
  AdditionalDocumentReference: {
    ID: {
      _: string
    }[]
    DocumentType: {
      _: string
    }[]
  }[]

  /** Supplier party information */
  AccountingSupplierParty: {
    AdditionalAccountID: {
      _: string
      schemeAgencyName: string
    }[]
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
        PostalZone: {
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
        ElectronicMail: {
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
        PostalZone: {
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
        ElectronicMail: {
          _: string
        }[]
      }[]
    }[]
  }[]

  /** Delivery information */
  Delivery: {
    DeliveryParty: {
      PartyLegalEntity: {
        RegistrationName: {
          _: string
        }[]
      }[]
      PostalAddress: {
        CityName: {
          _: string
        }[]
        PostalZone: {
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
      PartyIdentification: {
        ID: {
          _: string
          schemeID: string
        }[]
      }[]
    }[]
    Shipment: {
      ID: {
        _: string
      }[]
      FreightAllowanceCharge: {
        ChargeIndicator: {
          _: boolean
        }[]
        AllowanceChargeReason: {
          _: string
        }[]
        Amount: {
          _: number
          currencyID: string
        }[]
      }[]
    }[]
  }[]

  /** Payment means */
  PaymentMeans: {
    PaymentMeansCode: {
      _: string
    }[]
    PayeeFinancialAccount: {
      ID: {
        _: string
      }[]
    }[]
  }[]

  /** Payment terms */
  PaymentTerms: {
    Note: {
      _: string
    }[]
  }[]

  /** Prepaid payment */
  PrepaidPayment: {
    ID: {
      _: string
    }[]
    PaidAmount: {
      _: number
      currencyID: string
    }[]
    PaidDate: {
      _: string
    }[]
    PaidTime: {
      _: string
    }[]
  }[]

  /** Allowance charges */
  AllowanceCharge: {
    ChargeIndicator: {
      _: boolean
    }[]
    AllowanceChargeReason: {
      _: string
    }[]
    Amount: {
      _: number
      currencyID: string
    }[]
    MultiplierFactorNumeric?: {
      _: number
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
    AllowanceTotalAmount: {
      _: number
      currencyID: string
    }[]
    ChargeTotalAmount: {
      _: number
      currencyID: string
    }[]
    PayableAmount: {
      _: number
      currencyID: string
    }[]
    PayableRoundingAmount: {
      _: number
      currencyID: string
    }[]
  }[]

  /** Invoice line items */
  InvoiceLine: {
    AllowanceCharge: {
      Amount: {
        _: number
        currencyID: string
      }[]
      ChargeIndicator: {
        _: boolean
      }[]
      MultiplierFactorNumeric: {
        _: number
      }[]
      AllowanceChargeReason: {
        _: string
      }[]
    }[]
    ID: {
      _: string
    }[]
    InvoicedQuantity?: {
      _: number
      unitCode: string
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
      OriginCountry: {
        IdentificationCode: {
          _: string
        }[]
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
        PerUnitAmount: {
          _: number
          currencyID: string
        }[]
        BaseUnitMeasure: {
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

  /** Tax exchange rate */
  TaxExchangeRate: {
    SourceCurrencyCode: {
      _: string
    }[]
    TargetCurrencyCode: {
      _: string
    }[]
    CalculationRate: {
      _: number
    }[]
    ExchangeRateDate?: {
      _: string
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
              SignedInfo: {
                CanonicalizationMethod: {
                  _: string
                  Algorithm: string
                }[]
                SignatureMethod: {
                  _: string
                  Algorithm: string
                }[]
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
              }[]
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
