import crypto, { X509Certificate } from 'crypto'
import {
  InvoiceSubmission,
  AllDocumentsV1_1,
  SigningCredentials,
  SignedPropertiesObject,
  UBLDocument,
  CompleteInvoice,
  SignedInfoObject,
  UnitTypeCode,
  InvoiceLineItem,
} from '../types'
import type { ClassificationCode } from '../types'
import type { TaxTypeCode } from '../types'
import { formatIdValue } from './formatIdValue'

/**
 * MyInvois v1.1 Document Generation and Signing Utilities
 * Strictly follows: https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1
 * JSON Signature Guide: https://sdk.myinvois.hasil.gov.my/signature-creation-json/
 */

/**
 * Determines if a line item uses fixed rate taxation
 */
export const isFixedRateTax = (item: InvoiceLineItem): boolean => {
  return (
    item.taxPerUnitAmount !== undefined && item.baseUnitMeasure !== undefined
  )
}

/**
 * Determines if a line item uses percentage taxation
 */
export const isPercentageTax = (item: InvoiceLineItem): boolean => {
  return item.taxRate !== undefined && !isFixedRateTax(item)
}

/**
 * Calculates expected tax amount for a line item based on its tax type
 */
export const calculateExpectedTaxAmount = (item: InvoiceLineItem): number => {
  if (isFixedRateTax(item)) {
    return item.taxPerUnitAmount! * item.baseUnitMeasure!
  } else if (isPercentageTax(item)) {
    return (item.totalTaxableAmountPerLine * item.taxRate!) / 100
  }
  return 0
}

/**
 * Extracts the line-item array from any document variant
 */
const getLineItems = (doc: AllDocumentsV1_1): InvoiceLineItem[] => {
  if ('invoiceLineItems' in doc) return doc.invoiceLineItems
  if ('creditNoteLineItems' in doc) return doc.creditNoteLineItems
  if ('debitNoteLineItems' in doc) return doc.debitNoteLineItems
  if ('refundNoteLineItems' in doc) return doc.refundNoteLineItems
  if ('selfBilledCreditNoteLineItems' in doc)
    return doc.selfBilledCreditNoteLineItems
  if ('selfBilledRefundNoteLineItems' in doc)
    return doc.selfBilledRefundNoteLineItems
  // Fallback (should never happen with exhaustive types)
  return []
}

/**
 * Helper function to recursively sort object keys for JSON canonicalization
 */
export function sortObjectKeys(obj: unknown): unknown {
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
  invoice: AllDocumentsV1_1,
): InvoiceSubmission => {
  const lineItems = getLineItems(invoice)
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

    // === BILLING REFERENCE (only for credit/debit/refund notes) ===
    ...('originalEInvoiceReferenceNumber' in invoice &&
    'originalEInvoiceInternalId' in invoice &&
    invoice.originalEInvoiceReferenceNumber
      ? {
          BillingReference: [
            {
              InvoiceDocumentReference: [
                {
                  UUID: [
                    {
                      _: invoice.originalEInvoiceReferenceNumber,
                    },
                  ],
                  ID: [
                    {
                      _: invoice.originalEInvoiceInternalId,
                    },
                  ],
                },
              ],
            },
          ],
        }
      : {}),

    // === SUPPLIER PARTY (AccountingSupplierParty) ===
    AccountingSupplierParty: [
      {
        Party: [
          {
            // Industry Classification - required field
            IndustryClassificationCode: [
              {
                _: invoice.supplier.industryClassificationCode,
                name: invoice.supplier.industryClassificationDescription,
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
                    _: formatIdValue(invoice.supplier.registrationNumber),
                    schemeID: invoice.supplier.registrationType || 'NRIC',
                  },
                ],
              },
            ],

            // Postal Address - FIXED listID format
            PostalAddress: [
              {
                CityName: [{ _: invoice.supplier.address.cityName }],
                CountrySubentityCode: [{ _: invoice.supplier.address.state }],
                AddressLine: [
                  {
                    Line: [{ _: invoice.supplier.address.addressLine0 }],
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
                    _: formatIdValue(invoice.buyer.registrationNumber),
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
                CountrySubentityCode: [{ _: invoice.buyer.address.state }],
                AddressLine: [
                  {
                    Line: [{ _: invoice.buyer.address.addressLine0 }],
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
              },
            ],
          },
        ],
      },
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
        TaxSubtotal: [
          // Generate basic tax subtotal from invoice line items
          {
            TaxableAmount: [
              {
                _: invoice.legalMonetaryTotal.taxExclusiveAmount,
                currencyID: invoice.invoiceCurrencyCode,
              },
            ],
            TaxAmount: [
              {
                _: invoice.taxTotal.taxAmount,
                currencyID: invoice.invoiceCurrencyCode,
              },
            ],
            TaxCategory: [
              {
                ID: [{ _: lineItems[0]?.taxType || '01' }],
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
        PayableAmount: [
          {
            _: invoice.legalMonetaryTotal.payableAmount,
            currencyID: invoice.invoiceCurrencyCode,
          },
        ],
      },
    ],

    // === INVOICE LINES ===
    InvoiceLine: lineItems.map((item, index) => ({
      ID: [{ _: (index + 1).toString() }],

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
              // Conditional tax fields based on taxation type
              ...(item.taxPerUnitAmount !== undefined &&
              item.baseUnitMeasure !== undefined
                ? {
                    // Fixed Rate Taxation
                    PerUnitAmount: [
                      {
                        _: item.taxPerUnitAmount,
                        currencyID: invoice.invoiceCurrencyCode,
                      },
                    ],
                    BaseUnitMeasure: [
                      {
                        _: item.baseUnitMeasure,
                        unitCode: item.baseUnitMeasureCode || 'C62',
                      },
                    ],
                  }
                : item.taxRate !== undefined
                  ? {
                      // Percentage Taxation
                      Percent: [{ _: item.taxRate }],
                    }
                  : {}),
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

    // === TAX EXCHANGE RATE (mandatory where applicable) ===
    TaxExchangeRate: invoice.currencyExchangeRate
      ? [
          {
            SourceCurrencyCode: [
              {
                _: invoice.invoiceCurrencyCode,
              },
            ],
            TargetCurrencyCode: [
              {
                _: 'MYR',
              },
            ],
            CalculationRate: [
              {
                _: invoice.currencyExchangeRate,
              },
            ],
          },
        ]
      : undefined,
  }
}

/**
 * Generates the complete UBL document structure with namespace declarations
 */
export const generateCleanUBLDocument = (
  invoices: AllDocumentsV1_1[],
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
export const calculateDocumentDigest = (
  invoices: AllDocumentsV1_1[],
): string => {
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

  // Use raw JSON representation (no key sorting) as required by MyInvois digest algorithm
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

    // Keep the DN formatting exactly as it appears in the certificate to avoid
    // mismatches when the signing service validates the X509IssuerName fields.
    // We only replace raw new-lines with ", " so that the DN remains a single-line
    // string while preserving all other whitespace and ordering.
    const normalizeDistinguishedName = (dn: string): string => {
      // Node returns issuer DN in reverse RDN order (C, O, ... , CN).
      // The MyInvois validator expects forward order (CN first).
      // 1. Break DN into components separated by newline or commas.
      // 2. Reverse to get CN → ... → C ordering.
      // 3. Join with ", " and ensure single '=' spacing.
      const parts = dn
        .split(/\r?\n|,\s*/)
        .map(part => part.trim())
        .filter(part => part.length > 0)
        .reverse()
      return parts.join(', ').replace(/\s*=\s*/g, '=')
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
                            _: '',
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
  // Digest must include exactly the xades:SignedProperties object as embedded.
  const elementForDigest = signedProperties.SignedProperties

  // Use raw JSON representation (no key sorting) as required by MyInvois digest algorithm
  const signedPropertiesString = JSON.stringify(elementForDigest)

  const hash = crypto.createHash('sha256')
  hash.update(signedPropertiesString, 'utf8')

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
  const signedInfo: SignedInfoObject = {
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

  // Serialize the SignedInfo exactly as it will be embedded (no reordering)
  const signedInfoRaw = JSON.stringify(signedInfo)

  try {
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(signedInfoRaw, 'utf8')
    const signatureValue = signer.sign(privateKeyPem, 'base64')

    // Reuse the original object so ordering is preserved
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
  invoices: AllDocumentsV1_1[],
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
    console.log(JSON.stringify(signedProperties, null, 2))

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

/**
 * Creates a line item with percentage-based taxation (e.g., SST, GST)
 */
export const createPercentageTaxLineItem = (params: {
  itemClassificationCode: ClassificationCode
  itemDescription: string
  unitPrice: number
  quantity?: number
  taxType: TaxTypeCode
  taxRate: number
  totalTaxableAmountPerLine?: number
}): InvoiceLineItem => {
  const quantity = params.quantity || 1
  const totalTaxableAmount =
    params.totalTaxableAmountPerLine || params.unitPrice * quantity
  const taxAmount = (totalTaxableAmount * params.taxRate) / 100

  return {
    itemClassificationCode: params.itemClassificationCode,
    itemDescription: params.itemDescription,
    unitPrice: params.unitPrice,
    taxType: params.taxType,
    taxRate: params.taxRate,
    taxAmount: Math.round(taxAmount * 100) / 100, // Round to 2 decimal places
    totalTaxableAmountPerLine: totalTaxableAmount,
    totalAmountPerLine: totalTaxableAmount + taxAmount,
  }
}

/**
 * Creates a line item with fixed rate taxation (e.g., Tourism Tax)
 */
export const createFixedRateTaxLineItem = (params: {
  itemClassificationCode: ClassificationCode
  itemDescription: string
  unitPrice: number
  quantity?: number
  taxType: TaxTypeCode
  taxPerUnitAmount: number
  baseUnitMeasure: number
  baseUnitMeasureCode: UnitTypeCode
  totalTaxableAmountPerLine?: number
}): InvoiceLineItem => {
  const quantity = params.quantity || 1
  const totalTaxableAmount =
    params.totalTaxableAmountPerLine || params.unitPrice * quantity
  const taxAmount = params.taxPerUnitAmount * params.baseUnitMeasure

  return {
    itemClassificationCode: params.itemClassificationCode,
    itemDescription: params.itemDescription,
    unitPrice: params.unitPrice,
    taxType: params.taxType,
    taxPerUnitAmount: params.taxPerUnitAmount,
    baseUnitMeasure: params.baseUnitMeasure,
    baseUnitMeasureCode: params.baseUnitMeasureCode,
    taxAmount: Math.round(taxAmount * 100) / 100, // Round to 2 decimal places
    totalTaxableAmountPerLine: totalTaxableAmount,
    totalAmountPerLine: totalTaxableAmount + taxAmount,
  }
}

/**
 * Calculates invoice totals from line items
 */
export const calculateInvoiceTotals = (
  lineItems: InvoiceLineItem[],
): {
  legalMonetaryTotal: {
    taxExclusiveAmount: number
    taxInclusiveAmount: number
    payableAmount: number
  }
  taxTotal: {
    taxAmount: number
  }
} => {
  const taxExclusiveAmount = lineItems.reduce(
    (sum, item) => sum + item.totalTaxableAmountPerLine,
    0,
  )
  const totalTaxAmount = lineItems.reduce(
    (sum, item) => sum + item.taxAmount,
    0,
  )
  const taxInclusiveAmount = taxExclusiveAmount + totalTaxAmount

  return {
    legalMonetaryTotal: {
      taxExclusiveAmount: Math.round(taxExclusiveAmount * 100) / 100,
      taxInclusiveAmount: Math.round(taxInclusiveAmount * 100) / 100,
      payableAmount: Math.round(taxInclusiveAmount * 100) / 100,
    },
    taxTotal: {
      taxAmount: Math.round(totalTaxAmount * 100) / 100,
    },
  }
}
