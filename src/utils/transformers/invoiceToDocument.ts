import { Invoice } from 'src/types'

/**
 * Transforms an InvoiceV1_1 object into the nested array structure
 * that is accepted by the MyInvois API.
 *
 * @param invoice - The invoice in InvoiceV1_1 format
 * @returns The transformed document ready for submission
 */
export function transformInvoiceToDocument(
  invoice: Invoice,
): Record<string, any> {
  // Function to format array entries with underscore property
  const underscoreFormat = (value: any) => ({ _: value })

  // Function to format monetary amounts
  const formatAmount = (amount: number, currency: string) => [
    {
      _: amount,
      currencyID: currency,
    },
  ]

  // Transform supplier address into the required format
  const supplierAddressLines = []
  if (invoice.supplier.address.addressLine0) {
    supplierAddressLines.push({
      Line: [underscoreFormat(invoice.supplier.address.addressLine0)],
    })
  }
  if (invoice.supplier.address.addressLine1) {
    supplierAddressLines.push({
      Line: [underscoreFormat(invoice.supplier.address.addressLine1)],
    })
  }
  if (invoice.supplier.address.addressLine2) {
    supplierAddressLines.push({
      Line: [underscoreFormat(invoice.supplier.address.addressLine2)],
    })
  }

  // Transform buyer address into the required format
  const buyerAddressLines = []
  if (invoice.buyer.address.addressLine0) {
    buyerAddressLines.push({
      Line: [underscoreFormat(invoice.buyer.address.addressLine0)],
    })
  }
  if (invoice.buyer.address.addressLine1) {
    buyerAddressLines.push({
      Line: [underscoreFormat(invoice.buyer.address.addressLine1)],
    })
  }
  if (invoice.buyer.address.addressLine2) {
    buyerAddressLines.push({
      Line: [underscoreFormat(invoice.buyer.address.addressLine2)],
    })
  }

  // Transform invoice line items to the required format
  const invoiceLines = invoice.invoiceLineItems.map((item, index) => {
    const currency = invoice.invoiceCurrencyCode

    // Create allowance/charge entries if applicable
    const allowanceCharges = []

    if (item.discountAmount && item.discountAmount > 0) {
      allowanceCharges.push({
        ChargeIndicator: [underscoreFormat(false)],
        AllowanceChargeReason: [underscoreFormat('Discount')],
        MultiplierFactorNumeric: item.discountRate
          ? [underscoreFormat(item.discountRate / 100)]
          : undefined,
        Amount: formatAmount(item.discountAmount, currency),
      })
    }

    return {
      ID: [underscoreFormat((index + 1).toString())],
      InvoicedQuantity: [
        {
          _: item.quantity || 1,
          unitCode: item.measurement || 'EA',
        },
      ],
      LineExtensionAmount: formatAmount(
        item.totalTaxableAmountPerLine,
        currency,
      ),
      ...(allowanceCharges.length > 0
        ? { AllowanceCharge: allowanceCharges }
        : {}),
      TaxTotal: [
        {
          TaxAmount: formatAmount(item.taxAmount, currency),
          TaxSubtotal: [
            {
              TaxableAmount: formatAmount(
                item.totalTaxableAmountPerLine,
                currency,
              ),
              TaxAmount: formatAmount(item.taxAmount, currency),
              Percent: [underscoreFormat(item.taxRate)],
              TaxCategory: [
                {
                  ID: [
                    underscoreFormat(item.taxExemptionReasonCode ? 'E' : '01'),
                  ],
                  ...(item.taxExemptionReasonCode
                    ? {
                        TaxExemptionReason: [
                          underscoreFormat(
                            `Exemption code ${item.taxExemptionReasonCode}`,
                          ),
                        ],
                      }
                    : {}),
                  TaxScheme: [
                    {
                      ID: [
                        {
                          _: 'OTH',
                          schemeID: 'UN/ECE 5153',
                          schemeAgencyID: '6',
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
          Description: [underscoreFormat(item.itemDescription)],
          OriginCountry: item.countryOfOrigin
            ? [
                {
                  IdentificationCode: [underscoreFormat(item.countryOfOrigin)],
                },
              ]
            : undefined,
        },
      ],
      Price: [
        {
          PriceAmount: formatAmount(item.unitPrice, currency),
        },
      ],
    }
  })

  // Create tax subtotals by grouping items by tax type and rate
  const taxSubtotals: Record<string, any>[] = []
  const taxTypeMap = new Map<
    string,
    {
      taxable: number
      tax: number
      type: string
      rate: number
      exemptionCode?: string
    }
  >()

  invoice.invoiceLineItems.forEach(item => {
    const key = `${item.taxType}_${item.taxRate}`
    if (!taxTypeMap.has(key)) {
      taxTypeMap.set(key, {
        taxable: 0,
        tax: 0,
        type: item.taxType,
        rate: item.taxRate,
        exemptionCode: item.taxExemptionReasonCode,
      })
    }

    const entry = taxTypeMap.get(key)!
    entry.taxable += item.totalTaxableAmountPerLine
    entry.tax += item.taxAmount
  })

  taxTypeMap.forEach(value => {
    taxSubtotals.push({
      TaxableAmount: formatAmount(value.taxable, invoice.invoiceCurrencyCode),
      TaxAmount: formatAmount(value.tax, invoice.invoiceCurrencyCode),
      TaxCategory: [
        {
          ID: [underscoreFormat(value.exemptionCode ? 'E' : '01')],
          ...(value.exemptionCode
            ? {
                TaxExemptionReason: [
                  underscoreFormat(`Exemption code ${value.exemptionCode}`),
                ],
              }
            : {}),
          TaxScheme: [
            {
              ID: [
                {
                  _: 'OTH',
                  schemeID: 'UN/ECE 5153',
                  schemeAgencyID: '6',
                },
              ],
            },
          ],
        },
      ],
    })
  })

  // Build payment means if provided
  const paymentMeans = invoice.paymentMeans?.map(payment => ({
    PaymentMeansCode: [underscoreFormat(payment.paymentMeansCode)],
    PayeeFinancialAccount: payment.payeeFinancialAccountID
      ? [
          {
            ID: [underscoreFormat(payment.payeeFinancialAccountID)],
          },
        ]
      : undefined,
  }))

  // Format billing period if provided
  const invoicePeriod =
    invoice.billingPeriodStartDate ||
    invoice.billingPeriodEndDate ||
    invoice.frequencyOfBilling
      ? [
          {
            StartDate: invoice.billingPeriodStartDate
              ? [underscoreFormat(invoice.billingPeriodStartDate)]
              : undefined,
            EndDate: invoice.billingPeriodEndDate
              ? [underscoreFormat(invoice.billingPeriodEndDate)]
              : undefined,
            Description: invoice.frequencyOfBilling
              ? [underscoreFormat(invoice.frequencyOfBilling)]
              : undefined,
          },
        ]
      : undefined

  // Build allowance charges at document level
  const allowanceCharges = []
  if (
    invoice.legalMonetaryTotal.allowanceTotalAmount &&
    invoice.legalMonetaryTotal.allowanceTotalAmount > 0
  ) {
    allowanceCharges.push({
      ChargeIndicator: [underscoreFormat(false)],
      AllowanceChargeReason: [underscoreFormat('Document level discount')],
      Amount: formatAmount(
        invoice.legalMonetaryTotal.allowanceTotalAmount,
        invoice.invoiceCurrencyCode,
      ),
    })
  }

  if (
    invoice.legalMonetaryTotal.chargeTotalAmount &&
    invoice.legalMonetaryTotal.chargeTotalAmount > 0
  ) {
    allowanceCharges.push({
      ChargeIndicator: [underscoreFormat(true)],
      AllowanceChargeReason: [underscoreFormat('Document level charges')],
      Amount: formatAmount(
        invoice.legalMonetaryTotal.chargeTotalAmount,
        invoice.invoiceCurrencyCode,
      ),
    })
  }

  // Separate IssueTime from IssueDate
  const issueTimeMatch = invoice.eInvoiceTime.match(
    /^(\d{2}):(\d{2}):(\d{2})Z$/,
  )
  const issueTime = issueTimeMatch
    ? [underscoreFormat(invoice.eInvoiceTime)]
    : [underscoreFormat('00:00:00Z')]

  // Construct the full document with the nested array structure
  const document = {
    Invoice: [
      {
        ID: [underscoreFormat(invoice.eInvoiceCodeOrNumber)],
        IssueDate: [underscoreFormat(invoice.eInvoiceDate)],
        IssueTime: issueTime,
        InvoiceTypeCode: [
          {
            _: invoice.eInvoiceTypeCode,
            listVersionID: invoice.eInvoiceVersion,
          },
        ],
        DocumentCurrencyCode: [underscoreFormat(invoice.invoiceCurrencyCode)],
        TaxCurrencyCode: [underscoreFormat(invoice.invoiceCurrencyCode)],

        // Add invoice period if available
        ...(invoicePeriod ? { InvoicePeriod: invoicePeriod } : {}),

        // Add references if needed
        // BillingReference and AdditionalDocumentReference can be added here

        AccountingSupplierParty: [
          {
            Party: [
              {
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
                        schemeID: 'BRN',
                      },
                    ],
                  },
                  {
                    ID: [
                      {
                        _: invoice.supplier.sstRegistrationNumber || 'NA',
                        schemeID: 'SST',
                      },
                    ],
                  },
                ],
                PostalAddress: [
                  {
                    CityName: [
                      underscoreFormat(invoice.supplier.address.cityName),
                    ],
                    PostalZone: [
                      underscoreFormat(
                        invoice.supplier.address.postalZone || '',
                      ),
                    ],
                    CountrySubentityCode: [
                      underscoreFormat(invoice.supplier.address.state),
                    ],
                    AddressLine: supplierAddressLines,
                    Country: [
                      {
                        IdentificationCode: [
                          {
                            _: invoice.supplier.address.country,
                            listID: 'ISO3166-1',
                            listAgencyID: '6',
                          },
                        ],
                      },
                    ],
                  },
                ],
                PartyLegalEntity: [
                  {
                    RegistrationName: [underscoreFormat(invoice.supplier.name)],
                  },
                ],
                Contact: [
                  {
                    Telephone: [
                      underscoreFormat(invoice.supplier.contactNumber),
                    ],
                    ElectronicMail: invoice.supplier.email
                      ? [underscoreFormat(invoice.supplier.email)]
                      : undefined,
                  },
                ],
              },
            ],
          },
        ],
        AccountingCustomerParty: [
          {
            Party: [
              {
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
                        schemeID: 'BRN',
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
                PostalAddress: [
                  {
                    CityName: [
                      underscoreFormat(invoice.buyer.address.cityName),
                    ],
                    PostalZone: [
                      underscoreFormat(invoice.buyer.address.postalZone || ''),
                    ],
                    CountrySubentityCode: [
                      underscoreFormat(invoice.buyer.address.state),
                    ],
                    AddressLine: buyerAddressLines,
                    Country: [
                      {
                        IdentificationCode: [
                          {
                            _: invoice.buyer.address.country,
                            listID: 'ISO3166-1',
                            listAgencyID: '6',
                          },
                        ],
                      },
                    ],
                  },
                ],
                PartyLegalEntity: [
                  {
                    RegistrationName: [underscoreFormat(invoice.buyer.name)],
                  },
                ],
                Contact: [
                  {
                    Telephone: [underscoreFormat(invoice.buyer.contactNumber)],
                    ElectronicMail: invoice.buyer.email
                      ? [underscoreFormat(invoice.buyer.email)]
                      : undefined,
                  },
                ],
              },
            ],
          },
        ],

        // Include payment means if provided
        ...(paymentMeans && paymentMeans.length > 0
          ? { PaymentMeans: paymentMeans }
          : {}),

        // Include payment terms if needed
        ...(invoice.paymentMeans &&
        invoice.paymentMeans.some(p => p.paymentTerms)
          ? {
              PaymentTerms: [
                {
                  Note: [
                    underscoreFormat(
                      invoice.paymentMeans.find(p => p.paymentTerms)
                        ?.paymentTerms || '',
                    ),
                  ],
                },
              ],
            }
          : {}),

        // Include allowance charges if needed
        ...(allowanceCharges.length > 0
          ? { AllowanceCharge: allowanceCharges }
          : {}),

        // Tax total information
        TaxTotal: [
          {
            TaxAmount: formatAmount(
              invoice.taxTotal.taxAmount,
              invoice.invoiceCurrencyCode,
            ),
            TaxSubtotal: taxSubtotals,
          },
        ],

        // Monetary totals
        LegalMonetaryTotal: [
          {
            LineExtensionAmount: formatAmount(
              invoice.legalMonetaryTotal.taxExclusiveAmount,
              invoice.invoiceCurrencyCode,
            ),
            TaxExclusiveAmount: formatAmount(
              invoice.legalMonetaryTotal.taxExclusiveAmount,
              invoice.invoiceCurrencyCode,
            ),
            TaxInclusiveAmount: formatAmount(
              invoice.legalMonetaryTotal.taxInclusiveAmount,
              invoice.invoiceCurrencyCode,
            ),
            AllowanceTotalAmount: invoice.legalMonetaryTotal
              .allowanceTotalAmount
              ? formatAmount(
                  invoice.legalMonetaryTotal.allowanceTotalAmount,
                  invoice.invoiceCurrencyCode,
                )
              : undefined,
            ChargeTotalAmount: invoice.legalMonetaryTotal.chargeTotalAmount
              ? formatAmount(
                  invoice.legalMonetaryTotal.chargeTotalAmount,
                  invoice.invoiceCurrencyCode,
                )
              : undefined,
            PrepaidAmount: invoice.legalMonetaryTotal.prepaidAmount
              ? formatAmount(
                  invoice.legalMonetaryTotal.prepaidAmount,
                  invoice.invoiceCurrencyCode,
                )
              : undefined,
            PayableRoundingAmount: invoice.legalMonetaryTotal
              .payableRoundingAmount
              ? formatAmount(
                  invoice.legalMonetaryTotal.payableRoundingAmount,
                  invoice.invoiceCurrencyCode,
                )
              : undefined,
            PayableAmount: formatAmount(
              invoice.legalMonetaryTotal.payableAmount,
              invoice.invoiceCurrencyCode,
            ),
          },
        ],

        // Invoice lines
        InvoiceLine: invoiceLines,
      },
    ],
  }

  return document
}
