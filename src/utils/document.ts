import crypto, { X509Certificate } from 'crypto'
import {
  InvoiceSubmission,
  InvoiceV1_1,
  SigningCredentials,
  SignedPropertiesObject,
  UBLDocument,
  CompleteInvoice,
  SignedInfoObject,
} from 'src/types'

/**
 * MyInvois v1.1 Document Generation and Signing Utilities
 * Strictly follows: https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1
 * JSON Signature Guide: https://sdk.myinvois.hasil.gov.my/signature-creation-json/
 */

/**
 * Helper function to recursively sort object keys for JSON canonicalization
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  }

  const sortedObj: Record<string, unknown> = {}
  const keys = Object.keys(obj as Record<string, unknown>).sort()

  for (const key of keys) {
    sortedObj[key] = sortObjectKeys((obj as Record<string, unknown>)[key])
  }

  return sortedObj
}

/**
 * Enhanced canonicalization following MyInvois specification exactly
 * Key changes: ensure consistent ordering and formatting
 */
export const canonicalizeJSON = (obj: unknown): string => {
  const sortedObj = sortObjectKeys(obj)
  // Use compact JSON with no extra whitespace
  return JSON.stringify(sortedObj, null, 0)
}

/**
 * Generates a clean invoice object following MyInvois v1.1 specification exactly
 * This is the base invoice structure WITHOUT signature elements (for hash calculation)
 *
 * Key requirements from working documents:
 * - All mandatory fields must be present
 * - Many optional fields must be present even if empty
 * - Specific field ordering and structure
 * - Correct listID values (e.g., "3166-1" not "ISO3166-1")
 */
export const generateCleanInvoiceObject = (
  invoice: InvoiceV1_1,
): InvoiceSubmission => {
  return {
    // === MANDATORY CORE FIELDS ===
    ID: [{ _: invoice.eInvoiceCodeOrNumber }],
    IssueDate: [{ _: invoice.eInvoiceDate }],
    IssueTime: [{ _: invoice.eInvoiceTime }],
    InvoiceTypeCode: [
      {
        _: invoice.eInvoiceTypeCode,
        listVersionID: invoice.eInvoiceVersion || '1.1',
      },
    ],
    DocumentCurrencyCode: [{ _: invoice.invoiceCurrencyCode }],
    // NOTE: TaxCurrencyCode REMOVED - not present in working documents

    // === MANDATORY EMPTY FIELDS (must be present) ===
    InvoicePeriod: [
      {
        StartDate: [{ _: invoice.billingPeriodStartDate || '' }],
        EndDate: [{ _: invoice.billingPeriodEndDate || '' }],
        Description: [{ _: invoice.frequencyOfBilling || '' }],
      },
    ],

    BillingReference: [
      {
        AdditionalDocumentReference: [
          {
            ID: [{ _: invoice.billingReference || '' }],
          },
        ],
      },
    ],

    // Build dynamic document references array
    AdditionalDocumentReference: [
      // Purchase Order Reference
      {
        ID: [{ _: invoice.purchaseOrderReference || '' }],
        DocumentType: [
          { _: invoice.purchaseOrderReference ? 'PurchaseOrder' : '' },
        ],
      },
      // Contract Reference
      {
        ID: [{ _: invoice.contractReference || '' }],
        DocumentType: [{ _: invoice.contractReference ? 'Contract' : '' }],
      },
      // Project Reference
      {
        ID: [{ _: invoice.projectReference || '' }],
        DocumentType: [{ _: invoice.projectReference ? 'Project' : '' }],
      },
      // Additional dynamic references from array
      {
        ID: [{ _: invoice.additionalDocumentReferences?.[0]?.id || '' }],
        DocumentType: [
          { _: invoice.additionalDocumentReferences?.[0]?.documentType || '' },
        ],
      },
    ],

    // === SUPPLIER PARTY (AccountingSupplierParty) ===
    AccountingSupplierParty: [
      {
        // AdditionalAccountID - required field from working documents
        AdditionalAccountID: [
          {
            _: invoice.supplier?.additionalAccountId || '',
            schemeAgencyName: 'CertEx',
          },
        ],
        Party: [
          {
            // Industry Classification - use dynamic values when provided
            IndustryClassificationCode: [
              {
                _: invoice.supplier?.industryClassificationCode || '01135',
                name:
                  invoice.supplier?.industryClassificationDescription ||
                  'Growing of vegetables seeds, except beet seeds',
              },
            ],

            // Party Identifications
            PartyIdentification: [
              {
                ID: [
                  {
                    _: invoice.supplier.tin,
                    schemeID: 'TIN',
                  },
                ],
              },
              {
                ID: [
                  {
                    _: invoice.supplier.registrationNumber,
                    schemeID: invoice.supplier.registrationType || 'NRIC',
                  },
                ],
              },
              // Add SST registration if provided
              ...(invoice.supplier.sstRegistrationNumber
                ? [
                    {
                      ID: [
                        {
                          _: invoice.supplier.sstRegistrationNumber,
                          schemeID: 'SST',
                        },
                      ],
                    },
                  ]
                : []),
            ],

            // Postal Address - FIXED listID format
            PostalAddress: [
              {
                CityName: [{ _: invoice.supplier.address.cityName }],
                PostalZone: [{ _: invoice.supplier.address.postalZone || '' }],
                CountrySubentityCode: [{ _: invoice.supplier.address.state }],
                AddressLine: [
                  {
                    Line: [{ _: invoice.supplier.address.addressLine0 }],
                  },
                  {
                    Line: [{ _: invoice.supplier.address.addressLine1 || '' }],
                  },
                  {
                    Line: [{ _: invoice.supplier.address.addressLine2 || '' }],
                  },
                ],
                Country: [
                  {
                    IdentificationCode: [
                      {
                        _: invoice.supplier.address.country || 'MYS',
                        listID: '3166-1', // FIXED: was "ISO3166-1"
                        listAgencyID: 'ISO',
                      },
                    ],
                  },
                ],
              },
            ],

            // Party Legal Entity
            PartyLegalEntity: [
              {
                RegistrationName: [{ _: invoice.supplier.name }],
              },
            ],

            // Contact Information
            Contact: [
              {
                Telephone: [{ _: invoice.supplier.contactNumber || '' }],
                ElectronicMail: [{ _: invoice.supplier.email || '' }],
              },
            ],
          },
        ],
      },
    ],

    // === BUYER PARTY (AccountingCustomerParty) ===
    AccountingCustomerParty: [
      {
        Party: [
          {
            // Party Identifications
            PartyIdentification: [
              {
                ID: [
                  {
                    _: invoice.buyer.tin,
                    schemeID: 'TIN',
                  },
                ],
              },
              {
                ID: [
                  {
                    _: invoice.buyer.registrationNumber,
                    schemeID: invoice.buyer.registrationType || 'NRIC',
                  },
                ],
              },
              {
                ID: [
                  {
                    _: invoice.buyer.sstRegistrationNumber || 'NA',
                    schemeID: 'SST',
                  },
                ],
              },
            ],

            // Postal Address - FIXED listID format
            PostalAddress: [
              {
                CityName: [{ _: invoice.buyer.address.cityName }],
                PostalZone: [{ _: invoice.buyer.address.postalZone || '' }],
                CountrySubentityCode: [{ _: invoice.buyer.address.state }],
                AddressLine: [
                  {
                    Line: [{ _: invoice.buyer.address.addressLine0 }],
                  },
                  {
                    Line: [{ _: invoice.buyer.address.addressLine1 || '' }],
                  },
                  {
                    Line: [{ _: invoice.buyer.address.addressLine2 || '' }],
                  },
                ],
                Country: [
                  {
                    IdentificationCode: [
                      {
                        _: invoice.buyer.address.country || 'MYS',
                        listID: '3166-1', // FIXED: was "ISO3166-1"
                        listAgencyID: 'ISO',
                      },
                    ],
                  },
                ],
              },
            ],

            // Party Legal Entity
            PartyLegalEntity: [
              {
                RegistrationName: [{ _: invoice.buyer.name }],
              },
            ],

            // Contact Information
            Contact: [
              {
                Telephone: [{ _: invoice.buyer.contactNumber || '' }],
                ElectronicMail: [{ _: invoice.buyer.email || '' }],
              },
            ],
          },
        ],
      },
    ],

    // === DELIVERY (mandatory empty structure) ===
    Delivery: [
      {
        DeliveryParty: [
          {
            PartyLegalEntity: [
              {
                RegistrationName: [
                  { _: invoice.delivery?.deliveryParty?.name || '' },
                ],
              },
            ],
            PostalAddress: [
              {
                CityName: [
                  { _: invoice.delivery?.deliveryLocation?.cityName || '' },
                ],
                PostalZone: [
                  { _: invoice.delivery?.deliveryLocation?.postalZone || '' },
                ],
                CountrySubentityCode: [
                  { _: invoice.delivery?.deliveryLocation?.state || '' },
                ],
                AddressLine: [
                  {
                    Line: [
                      {
                        _:
                          invoice.delivery?.deliveryLocation?.addressLine0 ||
                          '',
                      },
                    ],
                  },
                  {
                    Line: [
                      {
                        _:
                          invoice.delivery?.deliveryLocation?.addressLine1 ||
                          '',
                      },
                    ],
                  },
                  {
                    Line: [
                      {
                        _:
                          invoice.delivery?.deliveryLocation?.addressLine2 ||
                          '',
                      },
                    ],
                  },
                ],
                Country: [
                  {
                    IdentificationCode: [
                      {
                        _: invoice.delivery?.deliveryLocation?.country || '',
                        listID: invoice.delivery?.deliveryLocation?.country
                          ? '3166-1'
                          : '',
                        listAgencyID: invoice.delivery?.deliveryLocation
                          ?.country
                          ? 'ISO'
                          : '',
                      },
                    ],
                  },
                ],
              },
            ],
            PartyIdentification: [
              {
                ID: [
                  {
                    _: invoice.delivery?.deliveryParty?.tin || '',
                    schemeID:
                      invoice.delivery?.deliveryParty?.registrationType || '',
                  },
                ],
              },
            ],
          },
        ],
        Shipment: [
          {
            ID: [{ _: invoice.delivery?.shipment?.id || '' }],
            FreightAllowanceCharge: [
              {
                ChargeIndicator: [
                  {
                    _:
                      invoice.delivery?.shipment?.freightAllowanceCharge
                        ?.chargeIndicator ?? true,
                  },
                ],
                AllowanceChargeReason: [
                  {
                    _:
                      invoice.delivery?.shipment?.freightAllowanceCharge
                        ?.reason || '',
                  },
                ],
                Amount: [
                  {
                    _:
                      invoice.delivery?.shipment?.freightAllowanceCharge
                        ?.amount || 0,
                    currencyID: invoice.invoiceCurrencyCode,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],

    // === PAYMENT MEANS (mandatory) ===
    PaymentMeans: [
      {
        PaymentMeansCode: [
          { _: invoice.paymentMeans?.[0]?.paymentMeansCode || '01' },
        ],
        PayeeFinancialAccount: [
          {
            ID: [
              { _: invoice.paymentMeans?.[0]?.payeeFinancialAccountID || '' },
            ],
          },
        ],
      },
    ],

    // === PAYMENT TERMS (mandatory empty structure) ===
    PaymentTerms: [
      {
        Note: [{ _: invoice.paymentTerms || '' }],
      },
    ],

    // === PREPAID PAYMENT (mandatory empty structure) ===
    PrepaidPayment: [
      {
        ID: [{ _: '' }],
        PaidAmount: [
          {
            _: 0,
            currencyID: invoice.invoiceCurrencyCode,
          },
        ],
        PaidDate: [{ _: '' }],
        PaidTime: [{ _: '' }],
      },
    ],

    // === ALLOWANCE CHARGES (mandatory - both allowance and charge) ===
    AllowanceCharge: [
      // Document-level charges
      ...(invoice.allowanceCharges
        ?.filter(ac => ac.chargeIndicator)
        .map(charge => ({
          ChargeIndicator: [{ _: true }],
          AllowanceChargeReason: [{ _: charge.reason }],
          Amount: [
            {
              _: charge.amount,
              currencyID: invoice.invoiceCurrencyCode,
            },
          ],
          MultiplierFactorNumeric: charge.multiplierFactorNumeric
            ? [{ _: charge.multiplierFactorNumeric }]
            : undefined,
        })) || [
        {
          ChargeIndicator: [{ _: true }],
          AllowanceChargeReason: [{ _: '' }],
          Amount: [
            {
              _: 0,
              currencyID: invoice.invoiceCurrencyCode,
            },
          ],
        },
      ]),
      // Document-level allowances
      ...(invoice.allowanceCharges
        ?.filter(ac => !ac.chargeIndicator)
        .map(allowance => ({
          ChargeIndicator: [{ _: false }],
          AllowanceChargeReason: [{ _: allowance.reason }],
          Amount: [
            {
              _: allowance.amount,
              currencyID: invoice.invoiceCurrencyCode,
            },
          ],
          MultiplierFactorNumeric: allowance.multiplierFactorNumeric
            ? [{ _: allowance.multiplierFactorNumeric }]
            : undefined,
        })) || [
        {
          ChargeIndicator: [{ _: false }],
          AllowanceChargeReason: [{ _: '' }],
          Amount: [
            {
              _: 0,
              currencyID: invoice.invoiceCurrencyCode,
            },
          ],
        },
      ]),
    ],

    // === TAX TOTAL ===
    TaxTotal: [
      {
        TaxAmount: [
          {
            _: invoice.taxTotal.taxAmount,
            currencyID: invoice.invoiceCurrencyCode,
          },
        ],
        TaxSubtotal:
          invoice.taxTotal.taxSubtotals?.map(subtotal => ({
            TaxableAmount: [
              {
                _: subtotal.taxableAmount,
                currencyID: invoice.invoiceCurrencyCode,
              },
            ],
            TaxAmount: [
              {
                _: subtotal.taxAmount,
                currencyID: invoice.invoiceCurrencyCode,
              },
            ],
            TaxCategory: [
              {
                ID: [{ _: subtotal.taxCategory.taxTypeCode }],
                TaxScheme: [
                  {
                    ID: [
                      {
                        _: 'OTH',
                        schemeAgencyID: '6',
                        schemeID: 'UN/ECE 5153',
                      },
                    ],
                  },
                ],
              },
            ],
          })) || [],
      },
    ],

    // === LEGAL MONETARY TOTAL ===
    LegalMonetaryTotal: [
      {
        LineExtensionAmount: [
          {
            _: invoice.legalMonetaryTotal.taxExclusiveAmount,
            currencyID: invoice.invoiceCurrencyCode,
          },
        ],
        TaxExclusiveAmount: [
          {
            _: invoice.legalMonetaryTotal.taxExclusiveAmount,
            currencyID: invoice.invoiceCurrencyCode,
          },
        ],
        TaxInclusiveAmount: [
          {
            _: invoice.legalMonetaryTotal.taxInclusiveAmount,
            currencyID: invoice.invoiceCurrencyCode,
          },
        ],
        AllowanceTotalAmount: [
          {
            _: invoice.legalMonetaryTotal.allowanceTotalAmount || 0,
            currencyID: invoice.invoiceCurrencyCode,
          },
        ],
        ChargeTotalAmount: [
          {
            _: invoice.legalMonetaryTotal.chargeTotalAmount || 0,
            currencyID: invoice.invoiceCurrencyCode,
          },
        ],
        PayableAmount: [
          {
            _: invoice.legalMonetaryTotal.payableAmount,
            currencyID: invoice.invoiceCurrencyCode,
          },
        ],
        PayableRoundingAmount: [
          {
            _: invoice.legalMonetaryTotal.payableRoundingAmount || 0,
            currencyID: invoice.invoiceCurrencyCode,
          },
        ],
      },
    ],

    // === INVOICE LINES ===
    InvoiceLine: invoice.invoiceLineItems.map((item, index) => ({
      // Line-level allowance/charge - mandatory for each line
      AllowanceCharge: [
        {
          Amount: [
            {
              _: 0,
              currencyID: invoice.invoiceCurrencyCode,
            },
          ],
          ChargeIndicator: [{ _: true }],
          MultiplierFactorNumeric: [{ _: 0 }],
          AllowanceChargeReason: [{ _: '' }],
        },
        {
          Amount: [
            {
              _: item.discountAmount || 0,
              currencyID: invoice.invoiceCurrencyCode,
            },
          ],
          ChargeIndicator: [{ _: false }],
          MultiplierFactorNumeric: [
            { _: item.discountRate ? item.discountRate / 100 : 0 },
          ],
          AllowanceChargeReason: [{ _: '' }],
        },
      ],

      ID: [{ _: (index + 1).toString() }],

      // Quantity (conditional)
      ...(item.quantity &&
        item.measurement && {
          InvoicedQuantity: [
            {
              _: item.quantity,
              unitCode: item.measurement,
            },
          ],
        }),

      // Item Information
      Item: [
        {
          CommodityClassification: [
            {
              ItemClassificationCode: [
                {
                  _: item.itemClassificationCode,
                  listID: 'CLASS',
                },
              ],
            },
          ],
          Description: [{ _: item.itemDescription }],
          OriginCountry: [
            {
              IdentificationCode: [{ _: item.countryOfOrigin || '' }],
            },
          ],
        },
      ],

      ItemPriceExtension: [
        {
          Amount: [
            {
              _: item.totalTaxableAmountPerLine,
              currencyID: invoice.invoiceCurrencyCode,
            },
          ],
        },
      ],

      LineExtensionAmount: [
        {
          _: item.totalTaxableAmountPerLine,
          currencyID: invoice.invoiceCurrencyCode,
        },
      ],

      // Price Information
      Price: [
        {
          PriceAmount: [
            {
              _: item.unitPrice,
              currencyID: invoice.invoiceCurrencyCode,
            },
          ],
        },
      ],

      // Tax Information for line
      TaxTotal: [
        {
          TaxAmount: [
            {
              _: item.taxAmount,
              currencyID: invoice.invoiceCurrencyCode,
            },
          ],
          TaxSubtotal: [
            {
              TaxableAmount: [
                {
                  _: item.totalTaxableAmountPerLine,
                  currencyID: invoice.invoiceCurrencyCode,
                },
              ],
              TaxAmount: [
                {
                  _: item.taxAmount,
                  currencyID: invoice.invoiceCurrencyCode,
                },
              ],
              PerUnitAmount: [
                {
                  _: item.taxAmount,
                  currencyID: invoice.invoiceCurrencyCode,
                },
              ],
              BaseUnitMeasure: [
                {
                  _: item.quantity || 1,
                  unitCode: item.measurement || 'C62',
                },
              ],
              TaxCategory: [
                {
                  ID: [{ _: item.taxType }],
                  TaxScheme: [
                    {
                      ID: [
                        {
                          _: 'OTH',
                          schemeAgencyID: '6',
                          schemeID: 'UN/ECE 5153',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })),

    // === TAX EXCHANGE RATE (mandatory) ===
    TaxExchangeRate: [
      {
        SourceCurrencyCode: [
          {
            _:
              invoice.taxExchangeRate?.sourceCurrencyCode ||
              invoice.invoiceCurrencyCode,
          },
        ],
        TargetCurrencyCode: [
          {
            _:
              invoice.taxExchangeRate?.targetCurrencyCode ||
              invoice.invoiceCurrencyCode,
          },
        ],
        CalculationRate: [
          {
            _:
              invoice.taxExchangeRate?.calculationRate ||
              (invoice.currencyExchangeRate ?? 0),
          },
        ],
        ...(invoice.taxExchangeRate?.exchangeRateDate && {
          ExchangeRateDate: [{ _: invoice.taxExchangeRate.exchangeRateDate }],
        }),
      },
    ],
  }
}

/**
 * Generates the complete UBL document structure with namespace declarations
 */
export const generateCleanUBLDocument = (
  invoices: InvoiceV1_1[],
): UBLDocument => {
  return {
    _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    Invoice: invoices.map(generateCleanInvoiceObject),
  }
}

/**
 * Step 2: Calculate Document Digest
 * FIXED: Remove UBLExtensions and Signature before hashing (DS322)
 * Based on working implementation pattern
 */
export const calculateDocumentDigest = (invoices: InvoiceV1_1[]): string => {
  // Generate clean UBL document structure
  const cleanDocument = generateCleanUBLDocument(invoices)

  // CRITICAL FIX: Remove UBLExtensions and Signature from each invoice before hashing
  const documentForHashing = JSON.parse(JSON.stringify(cleanDocument))
  if (documentForHashing.Invoice && Array.isArray(documentForHashing.Invoice)) {
    documentForHashing.Invoice.forEach((invoice: any) => {
      delete invoice.UBLExtensions
      delete invoice.Signature
    })
  }

  // Convert to string for hashing (no canonicalization - use direct JSON.stringify)
  const documentString = JSON.stringify(documentForHashing)

  // Calculate SHA-256 hash
  const hash = crypto.createHash('sha256')
  hash.update(documentString, 'utf8')

  // Return as Base64 (DocDigest)
  return hash.digest('base64')
}

/**
 * Step 4: Calculate Certificate Digest
 * Enhanced to handle certificate content properly
 */
export const calculateCertificateDigest = (certificatePem: string): string => {
  // Extract certificate content (Base64 without PEM headers/footers)
  const certificateContent = certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '') // Remove all whitespace

  // Convert Base64 to binary
  const certificateBinary = Buffer.from(certificateContent, 'base64')

  // Calculate SHA-256 hash of binary content
  const hash = crypto.createHash('sha256')
  hash.update(certificateBinary)

  // Return as Base64
  return hash.digest('base64')
}

/**
 * Enhanced certificate info extraction with better error handling
 * FIXED: Normalize issuer name format to match MyInvois expectations (DS326)
 */
export const extractCertificateInfo = (
  certificatePem: string,
): {
  issuerName: string
  serialNumber: string
  subjectName: string
} => {
  try {
    const cert = new X509Certificate(certificatePem)

    // Extract serial number and convert to decimal string
    const serialNumberHex = cert.serialNumber

    // ENHANCED: Normalize distinguished name format (DS326)
    // Ensures MyInvois portal compatibility for X509IssuerName matching
    const normalizeDistinguishedName = (dn: string): string => {
      // Convert multi-line format to comma-separated RFC2253 format
      const normalized = dn
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join(', ')

      // MyInvois-specific normalization to prevent DS326 errors
      return normalized
        .replace(/\s*=\s*/g, '=') // Remove spaces around equals (CRITICAL for portal)
        .replace(/,\s+/g, ', ') // Ensure single space after commas
        .replace(/\r/g, '') // Remove any carriage returns
        .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
        .trim() // Remove leading/trailing whitespace
    }

    // Enhanced serial number formatting
    const formatSerialNumber = (serialHex: string): string => {
      // Convert hex to decimal and ensure it's a string
      const decimal = BigInt('0x' + serialHex).toString()
      return decimal
    }

    return {
      issuerName: normalizeDistinguishedName(cert.issuer),
      serialNumber: formatSerialNumber(serialNumberHex),
      subjectName: normalizeDistinguishedName(cert.subject),
    }
  } catch (error: unknown) {
    throw new Error(
      `Failed to extract certificate info: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Step 5: Create SignedProperties with enhanced structure
 * FIXED: Simplified structure to match MyInvois expectations (DS320)
 * Following MyInvois JSON signature specification exactly
 */
export const createSignedProperties = (
  certificateDigest: string,
  signingTime: string,
  issuerName: string,
  serialNumber: string,
): SignedPropertiesObject => {
  return {
    SignedProperties: [
      {
        Id: 'id-xades-signed-props',
        SignedSignatureProperties: [
          {
            SigningTime: [{ _: signingTime }],
            SigningCertificate: [
              {
                Cert: [
                  {
                    CertDigest: [
                      {
                        DigestMethod: [
                          {
                            Algorithm:
                              'http://www.w3.org/2001/04/xmlenc#sha256',
                          },
                        ],
                        DigestValue: [{ _: certificateDigest }],
                      },
                    ],
                    IssuerSerial: [
                      {
                        X509IssuerName: [{ _: issuerName }],
                        X509SerialNumber: [{ _: serialNumber }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }
}

/**
 * Step 6: Calculate SignedProperties Digest
 * FIXED: Add Target wrapper and use direct JSON stringify (DS320)
 * Based on working implementation pattern
 */
export const calculateSignedPropertiesDigest = (
  signedProperties: SignedPropertiesObject,
): string => {
  // CRITICAL FIX: Wrap with Target as per working implementation
  const signedPropertiesWithTarget = {
    Target: 'signature',
    SignedProperties: signedProperties.SignedProperties,
  }

  // Convert to string for hashing (no canonicalization - use direct JSON.stringify)
  const signedPropertiesString = JSON.stringify(signedPropertiesWithTarget)

  // Calculate SHA-256 hash
  const hash = crypto.createHash('sha256')
  hash.update(signedPropertiesString, 'utf8')

  // Return as Base64 (PropsDigest)
  return hash.digest('base64')
}

/**
 * Step 3: Create SignedInfo and calculate signature
 * Enhanced with better structure and signature generation
 */
export const createSignedInfoAndSign = (
  docDigest: string,
  propsDigest: string,
  privateKeyPem: string,
): { signedInfo: SignedInfoObject; signatureValue: string } => {
  // Create SignedInfo structure following specification exactly
  const signedInfo = {
    CanonicalizationMethod: [
      {
        _: '',
        Algorithm: 'http://www.w3.org/2006/12/xml-c14n11',
      },
    ],
    SignatureMethod: [
      {
        _: '',
        Algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      },
    ],
    Reference: [
      {
        Id: 'id-doc-signed-data',
        Type: '',
        URI: '',
        DigestMethod: [
          {
            _: '',
            Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
          },
        ],
        DigestValue: [{ _: docDigest }],
      },
      {
        Id: 'id-xades-signed-props',
        Type: 'http://uri.etsi.org/01903/v1.3.2#SignedProperties',
        URI: '#id-xades-signed-props',
        DigestMethod: [
          {
            _: '',
            Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
          },
        ],
        DigestValue: [{ _: propsDigest }],
      },
    ],
  }

  // FIXED: Use direct JSON.stringify instead of canonicalization (DS333)
  // Based on working implementation pattern
  const signedInfoString = JSON.stringify(signedInfo)

  // Sign with RSA-SHA256 directly (RSA-SHA256 handles hashing internally)
  // FIXED: Removed double-hashing bug that was causing DS333 errors
  try {
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(signedInfoString, 'utf8')
    const signatureValue = signer.sign(privateKeyPem, 'base64')

    return { signedInfo, signatureValue }
  } catch (error) {
    throw new Error(
      `Signature generation failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Complete document generation with signatures
 * Follows the complete MyInvois JSON signature creation process (Steps 1-7)
 */
export const generateCompleteDocument = (
  invoices: InvoiceV1_1[],
  signingCredentials: SigningCredentials,
): CompleteInvoice => {
  try {
    // Step 1: Generate clean document (done in calculateDocumentDigest)
    // Step 2: Calculate document digest
    const docDigest = calculateDocumentDigest(invoices)

    // Generate signing time in proper ISO format
    const signingTime = new Date().toISOString()

    // Extract certificate information (enhanced)
    const certInfo = extractCertificateInfo(signingCredentials.certificatePem)

    // Step 4: Calculate certificate digest
    const certificateDigest = calculateCertificateDigest(
      signingCredentials.certificatePem,
    )

    // Step 5: Create SignedProperties using extracted cert info
    const signedProperties = createSignedProperties(
      certificateDigest,
      signingTime,
      certInfo.issuerName,
      certInfo.serialNumber,
    )

    // Step 6: Calculate SignedProperties digest
    const propsDigest = calculateSignedPropertiesDigest(signedProperties)

    // Step 3: Create SignedInfo and generate signature
    const { signedInfo, signatureValue } = createSignedInfoAndSign(
      docDigest,
      propsDigest,
      signingCredentials.privateKeyPem,
    )

    // Extract certificate content (Base64 without PEM headers)
    const certificate = signingCredentials.certificatePem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s+/g, '')

    // Step 7: Create final signed document
    const signedInvoices = invoices.map(invoice => {
      const cleanInvoice = generateCleanInvoiceObject(invoice)

      return {
        ...cleanInvoice,

        // Add UBLExtensions with complete signature structure
        UBLExtensions: [
          {
            UBLExtension: [
              {
                ExtensionURI: [
                  {
                    _: 'urn:oasis:names:specification:ubl:dsig:enveloped:xades',
                  },
                ],
                ExtensionContent: [
                  {
                    UBLDocumentSignatures: [
                      {
                        SignatureInformation: [
                          {
                            ID: [
                              {
                                _: 'urn:oasis:names:specification:ubl:signature:1',
                              },
                            ],
                            ReferencedSignatureID: [
                              {
                                _: 'urn:oasis:names:specification:ubl:signature:Invoice',
                              },
                            ],
                            Signature: [
                              {
                                Id: 'signature',
                                Object: [
                                  {
                                    QualifyingProperties: [
                                      {
                                        Target: 'signature',
                                        SignedProperties:
                                          signedProperties.SignedProperties,
                                      },
                                    ],
                                  },
                                ],
                                KeyInfo: [
                                  {
                                    X509Data: [
                                      {
                                        X509Certificate: [{ _: certificate }],
                                        X509SubjectName: [
                                          { _: certInfo.subjectName },
                                        ],
                                        X509IssuerSerial: [
                                          {
                                            X509IssuerName: [
                                              {
                                                _: certInfo.issuerName,
                                              },
                                            ],
                                            X509SerialNumber: [
                                              {
                                                _: certInfo.serialNumber,
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                ],
                                SignatureValue: [{ _: signatureValue }],
                                SignedInfo: [signedInfo],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],

        // Add simple Signature reference
        Signature: [
          {
            ID: [
              {
                _: 'urn:oasis:names:specification:ubl:signature:Invoice',
              },
            ],
            SignatureMethod: [
              {
                _: 'urn:oasis:names:specification:ubl:dsig:enveloped:xades',
              },
            ],
          },
        ],
      }
    })

    return {
      _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      Invoice: signedInvoices,
    }
  } catch (error) {
    throw new Error(
      `Document generation failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
