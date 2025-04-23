/**
 * Example of submitting a JSON invoice to the MyInvois API
 */

import * as fs from 'fs'
import { MyInvoisClient } from '../src/utils/MyInvoisClient'

/**
 * Submit a JSON invoice directly (without XML conversion)
 */
async function submitJsonInvoice() {
  // Initialize the client
  const client = new MyInvoisClient(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'sandbox', // Use 'production' for production environment
  )
  client.verifyTin(process.env.TIN_VALUE, process.env.NRIC_VALUE)
  try {
    // Example invoice in JSON format following the UBL structure
    // You can also load this from a file: JSON.parse(fs.readFileSync('invoice.json', 'utf8'))
    const invoice = {
      Invoice: [
        {
          ID: [
            {
              _: 'JSON-INV12345',
            },
          ],
          IssueDate: [
            {
              _: '2024-07-27',
            },
          ],
          IssueTime: [
            {
              _: '00:30:00Z',
            },
          ],
          InvoiceTypeCode: [
            {
              _: '01',
              listVersionID: '1.1',
            },
          ],
          DocumentCurrencyCode: [
            {
              _: 'MYR',
            },
          ],
          TaxCurrencyCode: [
            {
              _: 'MYR',
            },
          ],
          InvoicePeriod: [
            {
              StartDate: [
                {
                  _: '2024-01-01',
                },
              ],
              EndDate: [
                {
                  _: '2024-07-31',
                },
              ],
              Description: [
                {
                  _: 'Monthly',
                },
              ],
            },
          ],
          BillingReference: [
            {
              AdditionalDocumentReference: [
                {
                  ID: [
                    {
                      _: 'E12345678912',
                    },
                  ],
                },
              ],
            },
          ],
          AdditionalDocumentReference: [
            {
              ID: [
                {
                  _: 'E12345678912',
                },
              ],
              DocumentType: [
                {
                  _: 'CustomsImportForm',
                },
              ],
            },
            {
              ID: [
                {
                  _: 'sa313321312',
                },
              ],
              DocumentType: [
                {
                  _: '213312dddddd',
                },
              ],
              DocumentDescription: [
                {
                  _: 'asddasdwqfd ddq',
                },
              ],
            },
            {
              ID: [
                {
                  _: 'E12345678912',
                },
              ],
              DocumentType: [
                {
                  _: 'K2',
                },
              ],
            },
            {
              ID: [
                {
                  _: 'CIF',
                },
              ],
            },
          ],
          AccountingSupplierParty: [
            {
              AdditionalAccountID: [
                {
                  _: 'CPT-CCN-W-211111-KL-000002',
                  schemeAgencyName: 'CertEX',
                },
              ],
              Party: [
                {
                  IndustryClassificationCode: [
                    {
                      _: '46510',
                      name: 'Wholesale of computer hardware, software and peripherals',
                    },
                  ],
                  PartyIdentification: [
                    {
                      ID: [
                        {
                          _: 'IG00000000000',
                          schemeID: 'TIN',
                        },
                      ],
                    },
                    {
                      ID: [
                        {
                          _: "Supplier's BRN",
                          schemeID: 'BRN',
                        },
                      ],
                    },
                    {
                      ID: [
                        {
                          _: 'NA',
                          schemeID: 'SST',
                        },
                      ],
                    },
                    {
                      ID: [
                        {
                          _: 'NA',
                          schemeID: 'TTX',
                        },
                      ],
                    },
                  ],
                  PostalAddress: [
                    {
                      CityName: [
                        {
                          _: 'Kuala Lumpur',
                        },
                      ],
                      PostalZone: [
                        {
                          _: '50480',
                        },
                      ],
                      CountrySubentityCode: [
                        {
                          _: '10',
                        },
                      ],
                      AddressLine: [
                        {
                          Line: [
                            {
                              _: 'Lot 66',
                            },
                          ],
                        },
                        {
                          Line: [
                            {
                              _: 'Bangunan Merdeka',
                            },
                          ],
                        },
                        {
                          Line: [
                            {
                              _: 'Persiaran Jaya',
                            },
                          ],
                        },
                      ],
                      Country: [
                        {
                          IdentificationCode: [
                            {
                              _: 'MYS',
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
                      RegistrationName: [
                        {
                          _: "Supplier's Name",
                        },
                      ],
                    },
                  ],
                  Contact: [
                    {
                      Telephone: [
                        {
                          _: '+60123456789',
                        },
                      ],
                      ElectronicMail: [
                        {
                          _: 'supplier@email.com',
                        },
                      ],
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
                  PostalAddress: [
                    {
                      CityName: [
                        {
                          _: 'Kuala Lumpur',
                        },
                      ],
                      PostalZone: [
                        {
                          _: '50480',
                        },
                      ],
                      CountrySubentityCode: [
                        {
                          _: '10',
                        },
                      ],
                      AddressLine: [
                        {
                          Line: [
                            {
                              _: 'Lot 66',
                            },
                          ],
                        },
                        {
                          Line: [
                            {
                              _: 'Bangunan Merdeka',
                            },
                          ],
                        },
                        {
                          Line: [
                            {
                              _: 'Persiaran Jaya',
                            },
                          ],
                        },
                      ],
                      Country: [
                        {
                          IdentificationCode: [
                            {
                              _: 'MYS',
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
                      RegistrationName: [
                        {
                          _: "Buyer's Name",
                        },
                      ],
                    },
                  ],
                  PartyIdentification: [
                    {
                      ID: [
                        {
                          _: 'IG00000000000',
                          schemeID: 'TIN',
                        },
                      ],
                    },
                    {
                      ID: [
                        {
                          _: "Buyer's BRN",
                          schemeID: 'BRN',
                        },
                      ],
                    },
                    {
                      ID: [
                        {
                          _: 'NA',
                          schemeID: 'SST',
                        },
                      ],
                    },
                    {
                      ID: [
                        {
                          _: 'NA',
                          schemeID: 'TTX',
                        },
                      ],
                    },
                  ],
                  Contact: [
                    {
                      Telephone: [
                        {
                          _: '+60123456789',
                        },
                      ],
                      ElectronicMail: [
                        {
                          _: 'buyer@email.com',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          // Delivery: [
          //   {
          //     DeliveryParty: [
          //       {
          //         PartyLegalEntity: [
          //           {
          //             RegistrationName: [
          //               {
          //                 _: "Recipient's Name",
          //               },
          //             ],
          //           },
          //         ],
          //         PostalAddress: [
          //           {
          //             CityName: [
          //               {
          //                 _: 'Kuala Lumpur',
          //               },
          //             ],
          //             PostalZone: [
          //               {
          //                 _: '50480',
          //               },
          //             ],
          //             CountrySubentityCode: [
          //               {
          //                 _: '10',
          //               },
          //             ],
          //             AddressLine: [
          //               {
          //                 Line: [
          //                   {
          //                     _: 'Lot 66',
          //                   },
          //                 ],
          //               },
          //               {
          //                 Line: [
          //                   {
          //                     _: 'Bangunan Merdeka',
          //                   },
          //                 ],
          //               },
          //               {
          //                 Line: [
          //                   {
          //                     _: 'Persiaran Jaya',
          //                   },
          //                 ],
          //               },
          //             ],
          //             Country: [
          //               {
          //                 IdentificationCode: [
          //                   {
          //                     _: 'MYS',
          //                     listID: 'ISO3166-1',
          //                     listAgencyID: '6',
          //                   },
          //                 ],
          //               },
          //             ],
          //           },
          //         ],
          //         PartyIdentification: [
          //           {
          //             ID: [
          //               {
          //                 _: 'IG00000000000',
          //                 schemeID: 'TIN',
          //               },
          //             ],
          //           },
          //           {
          //             ID: [
          //               {
          //                 _: "Recipient's BRN",
          //                 schemeID: 'BRN',
          //               },
          //             ],
          //           },
          //         ],
          //       },
          //     ],
          //     Shipment: [
          //       {
          //         ID: [
          //           {
          //             _: '1234',
          //           },
          //         ],
          //         FreightAllowanceCharge: [
          //           {
          //             ChargeIndicator: [
          //               {
          //                 _: true,
          //               },
          //             ],
          //             AllowanceChargeReason: [
          //               {
          //                 _: 'Service charge',
          //               },
          //             ],
          //             Amount: [
          //               {
          //                 _: 100,
          //                 currencyID: 'MYR',
          //               },
          //             ],
          //           },
          //         ],
          //       },
          //     ],
          //   },
          // ],
          PaymentMeans: [
            {
              PaymentMeansCode: [
                {
                  _: '03',
                },
              ],
              PayeeFinancialAccount: [
                {
                  ID: [
                    {
                      _: '1234567890123',
                    },
                  ],
                },
              ],
            },
          ],
          PaymentTerms: [
            {
              Note: [
                {
                  _: 'Payment method is cash',
                },
              ],
            },
          ],
          PrepaidPayment: [
            {
              ID: [
                {
                  _: 'E12345678912',
                },
              ],
              PaidAmount: [
                {
                  _: 1,
                  currencyID: 'MYR',
                },
              ],
              PaidDate: [
                {
                  _: '2024-07-23',
                },
              ],
              PaidTime: [
                {
                  _: '00:30:00Z',
                },
              ],
            },
          ],
          AllowanceCharge: [
            {
              ChargeIndicator: [
                {
                  _: false,
                },
              ],
              AllowanceChargeReason: [
                {
                  _: 'Sample Description',
                },
              ],
              Amount: [
                {
                  _: 100,
                  currencyID: 'MYR',
                },
              ],
            },
            {
              ChargeIndicator: [
                {
                  _: true,
                },
              ],
              AllowanceChargeReason: [
                {
                  _: 'Service charge',
                },
              ],
              Amount: [
                {
                  _: 100,
                  currencyID: 'MYR',
                },
              ],
            },
          ],
          TaxTotal: [
            {
              TaxAmount: [
                {
                  _: 87.63,
                  currencyID: 'MYR',
                },
              ],
              TaxSubtotal: [
                {
                  TaxableAmount: [
                    {
                      _: 87.63,
                      currencyID: 'MYR',
                    },
                  ],
                  TaxAmount: [
                    {
                      _: 87.63,
                      currencyID: 'MYR',
                    },
                  ],
                  TaxCategory: [
                    {
                      ID: [
                        {
                          _: '01',
                        },
                      ],
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
          LegalMonetaryTotal: [
            {
              LineExtensionAmount: [
                {
                  _: 1436.5,
                  currencyID: 'MYR',
                },
              ],
              TaxExclusiveAmount: [
                {
                  _: 1436.5,
                  currencyID: 'MYR',
                },
              ],
              TaxInclusiveAmount: [
                {
                  _: 1436.5,
                  currencyID: 'MYR',
                },
              ],
              AllowanceTotalAmount: [
                {
                  _: 1436.5,
                  currencyID: 'MYR',
                },
              ],
              ChargeTotalAmount: [
                {
                  _: 1436.5,
                  currencyID: 'MYR',
                },
              ],
              PayableRoundingAmount: [
                {
                  _: 0.3,
                  currencyID: 'MYR',
                },
              ],
              PayableAmount: [
                {
                  _: 1436.5,
                  currencyID: 'MYR',
                },
              ],
            },
          ],
          InvoiceLine: [
            {
              ID: [
                {
                  _: '1234',
                },
              ],
              InvoicedQuantity: [
                {
                  _: 1,
                  unitCode: 'C62',
                },
              ],
              LineExtensionAmount: [
                {
                  _: 1436.5,
                  currencyID: 'MYR',
                },
              ],
              AllowanceCharge: [
                {
                  ChargeIndicator: [
                    {
                      _: false,
                    },
                  ],
                  AllowanceChargeReason: [
                    {
                      _: 'Sample Description',
                    },
                  ],
                  MultiplierFactorNumeric: [
                    {
                      _: 0.15,
                    },
                  ],
                  Amount: [
                    {
                      _: 100,
                      currencyID: 'MYR',
                    },
                  ],
                },
                {
                  ChargeIndicator: [
                    {
                      _: true,
                    },
                  ],
                  AllowanceChargeReason: [
                    {
                      _: 'Sample Description',
                    },
                  ],
                  MultiplierFactorNumeric: [
                    {
                      _: 0.1,
                    },
                  ],
                  Amount: [
                    {
                      _: 100,
                      currencyID: 'MYR',
                    },
                  ],
                },
              ],
              TaxTotal: [
                {
                  TaxAmount: [
                    {
                      _: 1460.5,
                      currencyID: 'MYR',
                    },
                  ],
                  TaxSubtotal: [
                    {
                      TaxableAmount: [
                        {
                          _: 1460.5,
                          currencyID: 'MYR',
                        },
                      ],
                      TaxAmount: [
                        {
                          _: 1460.5,
                          currencyID: 'MYR',
                        },
                      ],
                      Percent: [
                        {
                          _: 6,
                        },
                      ],
                      TaxCategory: [
                        {
                          ID: [
                            {
                              _: 'E',
                            },
                          ],
                          TaxExemptionReason: [
                            {
                              _: 'Exempt New Means of Transport',
                            },
                          ],
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
                          _: '9800.00.0010',
                          listID: 'PTC',
                        },
                      ],
                    },
                    {
                      ItemClassificationCode: [
                        {
                          _: '003',
                          listID: 'CLASS',
                        },
                      ],
                    },
                  ],
                  Description: [
                    {
                      _: 'Laptop Peripherals',
                    },
                  ],
                  OriginCountry: [
                    {
                      IdentificationCode: [
                        {
                          _: 'MYS',
                        },
                      ],
                    },
                  ],
                },
              ],
              Price: [
                {
                  PriceAmount: [
                    {
                      _: 17,
                      currencyID: 'MYR',
                    },
                  ],
                },
              ],
              ItemPriceExtension: [
                {
                  Amount: [
                    {
                      _: 100,
                      currencyID: 'MYR',
                    },
                  ],
                },
              ],
            },
          ],
          // UBLExtensions: [
          //   {
          //     UBLExtension: [
          //       {
          //         ExtensionURI: [
          //           {
          //             _: 'urn:oasis:names:specification:ubl:dsig:enveloped:xades',
          //           },
          //         ],
          //         ExtensionContent: [
          //           {
          //             UBLDocumentSignatures: [
          //               {
          //                 SignatureInformation: [
          //                   {
          //                     ID: [
          //                       {
          //                         _: 'urn:oasis:names:specification:ubl:signature:1',
          //                       },
          //                     ],
          //                     ReferencedSignatureID: [
          //                       {
          //                         _: 'urn:oasis:names:specification:ubl:signature:Invoice',
          //                       },
          //                     ],
          //                     Signature: [
          //                       {
          //                         Id: 'signature',
          //                         Object: [
          //                           {
          //                             QualifyingProperties: [
          //                               {
          //                                 Target: 'signature',
          //                                 SignedProperties: [
          //                                   {
          //                                     Id: 'id-xades-signed-props',
          //                                     SignedSignatureProperties: [
          //                                       {
          //                                         SigningTime: [
          //                                           {
          //                                             _: '2025-04-15T02:01:36Z',
          //                                           },
          //                                         ],
          //                                         SigningCertificate: [
          //                                           {
          //                                             Cert: [
          //                                               {
          //                                                 CertDigest: [
          //                                                   {
          //                                                     DigestMethod: [
          //                                                       {
          //                                                         _: '',
          //                                                         Algorithm:
          //                                                           'http://www.w3.org/2001/04/xmlenc#sha256',
          //                                                       },
          //                                                     ],
          //                                                     DigestValue: [
          //                                                       {
          //                                                         _: '+kdLjFra9qRhG35bEKff9ZPjj6Bq6W6/j0NS0st/ves=',
          //                                                       },
          //                                                     ],
          //                                                   },
          //                                                 ],
          //                                                 IssuerSerial: [
          //                                                   {
          //                                                     X509IssuerName: [
          //                                                       {
          //                                                         _: 'C=MY, O=Raffcomm Technologies Sdn Bhd, OU=1000449-W, CN=CypherSign Pro Max',
          //                                                       },
          //                                                     ],
          //                                                     X509SerialNumber:
          //                                                       [
          //                                                         {
          //                                                           _: '1308502606566147853',
          //                                                         },
          //                                                       ],
          //                                                   },
          //                                                 ],
          //                                               },
          //                                             ],
          //                                           },
          //                                         ],
          //                                       },
          //                                     ],
          //                                   },
          //                                 ],
          //                               },
          //                             ],
          //                           },
          //                         ],
          //                         KeyInfo: [
          //                           {
          //                             X509Data: [
          //                               {
          //                                 X509Certificate: [
          //                                   {
          //                                     _: 'MIIFJzCCBA+gAwIBAgIIEii8MBwMRw0wDQYJKoZIhvcNAQELBQAwZjEbMBkGA1UEAwwSQ3lwaGVyU2lnbiBQcm8gTWF4MRIwEAYDVQQLDAkxMDAwNDQ5LVcxJjAkBgNVBAoMHVJhZmZjb21tIFRlY2hub2xvZ2llcyBTZG4gQmhkMQswCQYDVQQGEwJNWTAeFw0yNDA2MjEwMTExNTBaFw0yNTA2MjEwMTExNTBaMIGbMSQwIgYJKoZIhvcNAQkBFhV0ZXN0LmNlcnRAcmFmZmNvbW0ubXkxDjAMBgNVBAMMBUR1bW15MRIwEAYDVQQFEwlEMTIzNDU2NzgxGzAZBgNVBAsMElRlc3QgVW5pdCBlSW52b2ljZTEVMBMGA1UEYQwMQzI5NzAyNjM1MDYwMQ4wDAYDVQQKDAVEdW1teTELMAkGA1UEBhMCTVkwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDi+PCSf8b/CNXyPrwrOsSRv9RlZnD3IR+k+5BbwYW6kKDa9ES5AHwSWibluBEZCT2BvcMjodnZUHDCPl1jUzS8TJ65YIBYe3p9nuQiE6v3mtwj53KcUEawDa6d2emTftenoRgIN6sx935elnI3+nHDTBDuHgaG6m7H118LlfEpU39I8aTv5AZotSezfmHfD5Vmysm8bkvLV0ibm4KQfj4aRqoTfiakQpFwamMJ+SSKUwzrYghF0OHUIuu0kNr21GMN7Q3wWZjPQRF484xeUhFaL+CsjeeIFzxEjvDs/kSNfUaQZPwAfyuG70adzMTul7gGo1Bzz4uJWz5znfomk2ZbAgMBAAGjggGhMIIBnTAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFGtOaNbCTehELL1jFh4g6YilI5ueMFYGCCsGAQUFBwEBBEowSDBGBggrBgEFBQcwAYY6aHR0cDovL29jc3AuY3lwaGVyc2lnbi5teTo4MDgwL2VqYmNhL3B1YmxpY3dlYi9zdGF0dXMvb2NzcDCBhAYDVR0gBH0wezA7BgUrBgEEATAyMDAGCCsGAQUFBwICMCQeIgAxAC4AMwAuADYALgAxAC4ANAAuADEALgA1ADEAMgAxADUwPAYIKwYBBQUHAgEwMDAuBggrBgEFBQcCARYiaHR0cHM6Ly93d3cucmFmZnRlY2gubXkvcmVwb3NpdG9yeTAfBgNVHSUEGDAWBggrBgEFBQcDBAYKKwYBBAGCNwoDDDA9BgNVHR8ENjA0MDKgMKAuhixodHRwczovL3d3dy5yYWZmdGVjaC5teS9jcmwvQ3lwaGVyU2lnblByb01heDAdBgNVHQ4EFgQULWvOw9mY47L3XKdMqla4XfzWQ2swDgYDVR0PAQH/BAQDAgTQMA0GCSqGSIb3DQEBCwUAA4IBAQCsf4enIwiYRm4DjmKBRic2uHkGCeMqQ4I/Q4J+vOkeH3qUFBhz/sfpNdFaLBAA8rukRi0y0kp4oHIEg4Rj9yjjVv1LTOCbZkzx5kmif9yhP2nzJig9A7WfDfh+QhMf0HBcby/WIJ7bedvIToLwrsyzhLFZryM4x4KGsS0HxiTA+2uSIhhbi+0Ol9PnuvLit08oD2hCD9UqB1t94KkbQafAlaIHsmoZTFiJP9iB7EWpLZyDEGEyMllh6rEBMPwU4j8wd08JLN46O29KLJMCmsqLNMoh412Ay/rLK7Y6mhgYse6zZmcrovZbYhHicQxwsbM3jHAtYzh9v/8oOgVTC6bR',
          //                                   },
          //                                 ],
          //                                 X509SubjectName: [
          //                                   {
          //                                     _: 'C=MY, O=Raffcomm Technologies Sdn Bhd, OU=1000449-W, CN=CypherSign Pro Max',
          //                                   },
          //                                 ],
          //                                 X509IssuerSerial: [
          //                                   {
          //                                     X509IssuerName: [
          //                                       {
          //                                         _: 'C=MY, O=Raffcomm Technologies Sdn Bhd, OU=1000449-W, CN=CypherSign Pro Max',
          //                                       },
          //                                     ],
          //                                     X509SerialNumber: [
          //                                       {
          //                                         _: '1308502606566147853',
          //                                       },
          //                                     ],
          //                                   },
          //                                 ],
          //                               },
          //                             ],
          //                           },
          //                         ],
          //                         SignatureValue: [
          //                           {
          //                             _: 'w5LWz+bY+B2tghxgCjAJ4cZ4daIskkk3RfY9a9nMMD8ryZo6StL4VxFJq1Xh8zrYAjWWRw7DvcUP5prEQEQWpA3ocdI74pHr39T+b20u2iy70mtkZpz6NTtYF7ZL9Hls8MtK/fKDy/JJb4S7IxF0c7y8IQ258vUCARriUaHvhB3zoL2lKi7dH4EwTfDz1bQd5cKVM7CxD/0k3vB37prhW0YGtarhErqRXeqgWPvWvgkksO73MjMNmwJJymfWaYp42LiPelBB2deB1NNEeIV8qOYG6O9dnwTGB6gE5MzaYYwk2Vrw7/9vARnTrhL5qe3VaCkYAJvzxCTWm9P73SKODg==',
          //                           },
          //                         ],
          //                         SignedInfo: [
          //                           {
          //                             SignatureMethod: [
          //                               {
          //                                 _: '',
          //                                 Algorithm:
          //                                   'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
          //                               },
          //                             ],
          //                             Reference: [
          //                               {
          //                                 Type: 'http://uri.etsi.org/01903/v1.3.2#SignedProperties',
          //                                 URI: '#id-xades-signed-props',
          //                                 DigestMethod: [
          //                                   {
          //                                     _: '',
          //                                     Algorithm:
          //                                       'http://www.w3.org/2001/04/xmlenc#sha256',
          //                                   },
          //                                 ],
          //                                 DigestValue: [
          //                                   {
          //                                     _: 'YtnXjwGD9a3izt01otM5PrZWSqCkALYkRogvArtxK9Q=',
          //                                   },
          //                                 ],
          //                               },
          //                               {
          //                                 Type: '',
          //                                 URI: '',
          //                                 DigestMethod: [
          //                                   {
          //                                     _: '',
          //                                     Algorithm:
          //                                       'http://www.w3.org/2001/04/xmlenc#sha256',
          //                                   },
          //                                 ],
          //                                 DigestValue: [
          //                                   {
          //                                     _: '3+0mMUPmCNfK/yILqruu9vXKnHsj50Q9knpXrBXzfV0=',
          //                                   },
          //                                 ],
          //                               },
          //                             ],
          //                           },
          //                         ],
          //                       },
          //                     ],
          //                   },
          //                 ],
          //               },
          //             ],
          //           },
          //         ],
          //       },
          //     ],
          //   },
          // ],
        },
      ],
    }

    // Submit the JSON invoice
    const response = await client.submitJsonInvoice(invoice, 'JSON-INV12345')

    console.log('JSON invoice submission successful!')
    console.log(`Document ID: ${response.documentId}`)
    console.log(`Response code: ${response.code}`)
    console.log(`Message: ${response.message}`)

    // Optionally check the status after submission
    if (response.documentId) {
      console.log('Checking invoice status...')
      const statusResponse = await client.getInvoiceStatus(response.documentId)
      console.log('Invoice status:', statusResponse)
    }

    return response
  } catch (error) {
    console.error('Error submitting JSON invoice:', error)
    throw error
  }
}

/**
 * Load and submit a JSON invoice from a file
 */
async function loadAndSubmitJsonInvoice(filePath: string) {
  const client = new MyInvoisClient(
    'YOUR_CLIENT_ID',
    'YOUR_CLIENT_SECRET',
    'sandbox',
  )

  try {
    // Read the JSON invoice from file
    const invoiceData = JSON.parse(fs.readFileSync(filePath, 'utf8'))

    console.log(`Submitting invoice from file: ${filePath}`)

    // Submit the JSON invoice
    const response = await client.submitJsonInvoice(invoiceData)

    console.log('JSON invoice submission successful!')
    console.log(`Document ID: ${response.documentId}`)

    return response
  } catch (error) {
    console.error(`Error submitting JSON invoice from file ${filePath}:`, error)
    throw error
  }
}

/**
 * Submit multiple JSON invoices from a directory
 */
async function submitMultipleJsonInvoices(directoryPath: string) {
  const client = new MyInvoisClient(
    'YOUR_CLIENT_ID',
    'YOUR_CLIENT_SECRET',
    'sandbox',
  )

  try {
    // Read all JSON files from the directory
    const files = fs
      .readdirSync(directoryPath)
      .filter(file => file.endsWith('.json'))

    if (files.length === 0) {
      console.log('No JSON files found in the directory')
      return []
    }

    console.log(`Found ${files.length} JSON invoice files to submit`)

    // Load all invoices
    const invoices = files.map(file => {
      const filePath = `${directoryPath}/${file}`
      console.log(`Loading invoice from ${filePath}`)
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    })

    // Submit all invoices
    console.log('Submitting invoices in batch...')
    const results = await client.submitMultipleJsonInvoices(invoices)

    // Print results
    console.log('\nSubmission results:')
    files.forEach((file, index) => {
      const result = results[index]
      console.log(
        `- ${file}: ${result.code === 'SUCCESS' ? 'SUCCESS' : 'FAILED'}`,
      )
      if (result.documentId) {
        console.log(`  Document ID: ${result.documentId}`)
      }
      if (result.code !== 'SUCCESS') {
        console.log(`  Error: ${result.message}`)
      }
    })

    // Summary
    const successCount = results.filter(r => r.code === 'SUCCESS').length
    console.log(
      `\nSummary: ${successCount}/${results.length} invoices submitted successfully`,
    )

    return results
  } catch (error) {
    console.error('Error in batch submission:', error)
    throw error
  }
}

submitJsonInvoice()
