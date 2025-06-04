import * as crypto from 'crypto'
import type { InvoiceV1_1 } from '../types/documents/invoice-1_1.d.ts'
import { DOMParserImpl, XMLSerializerImpl } from 'xmldom-ts'
import { canonicalizeAndHashDocumentWithC14N11Fallback } from './signature/canonicalize'
import { hashCertificate } from './signature/hashCert'
import { hashSignedPropertiesWithC14N11Fallback } from './signature/hashSignedProperties'
import {
  populateFinalDocument,
  type FinalDocumentData,
} from './signature/populateFinalDocument'
import {
  populateSignedProperties,
  type SignedPropertiesData,
} from './signature/populateSignedProperties'
import { signDocumentDigest } from './signature/sign'
import { transformXmlInvoice } from './signature/transform'

export interface ResponseDocument {
  invoiceCodeNumber: string
  error?: {
    code: string | null
    message: string
    target: string
    propertyPath: string | null
    details: any[]
  }
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

/**
 * Escapes XML special characters
 */
const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Minifies XML by removing unnecessary whitespace and line breaks
 * As recommended by MyInvois documentation for Submit Documents API
 */
const minifyXML = (xmlString: string): string => {
  return xmlString
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/>\s/g, '>') // Remove space after opening tags
    .replace(/\s</g, '<') // Remove space before closing tags
    .trim() // Remove leading/trailing whitespace
}

/**
 * Generates supplier XML section
 */
const generateSupplierXML = (supplier: InvoiceV1_1['supplier']): string => {
  return `
  <cac:AccountingSupplierParty>
    <cac:Party>
      ${supplier.industryClassificationCode ? `<cbc:IndustryClassificationCode>${supplier.industryClassificationCode}</cbc:IndustryClassificationCode>` : ''}
      <cac:PartyIdentification>
        <cbc:ID schemeID="TIN">${escapeXml(supplier.tin)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${supplier.registrationType}">${escapeXml(supplier.registrationNumber)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="SST">${escapeXml(supplier.sstRegistrationNumber || 'NA')}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="TTX">NA</cbc:ID>
      </cac:PartyIdentification>
      ${generatePostalAddressXML(supplier.address)}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(supplier.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${escapeXml(supplier.contactNumber)}</cbc:Telephone>
        <cbc:ElectronicMail>${escapeXml(supplier.email || 'NA')}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>`
}

/**
 * Generates buyer XML section
 */
const generateBuyerXML = (buyer: InvoiceV1_1['buyer']): string => {
  return `
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="TIN">${escapeXml(buyer.tin)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="BRN">${escapeXml(buyer.registrationNumber || 'NA')}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="SST">${escapeXml(buyer.sstRegistrationNumber || 'NA')}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="TTX">NA</cbc:ID>
      </cac:PartyIdentification>
      ${generatePostalAddressXML(buyer.address)}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(buyer.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${escapeXml(buyer.contactNumber || 'NA')}</cbc:Telephone>
        <cbc:ElectronicMail>${escapeXml(buyer.email || 'NA')}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>`
}

/**
 * Generates postal address XML section (updated to match working example)
 */
const generatePostalAddressXML = (
  address: InvoiceV1_1['supplier']['address'],
): string => {
  return `
      <cac:PostalAddress>
        <cbc:CityName>${escapeXml(address.cityName || ' ')}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(address.postalZone || ' ')}</cbc:PostalZone>
        <cbc:CountrySubentityCode>${escapeXml(address.state || ' ')}</cbc:CountrySubentityCode>
        <cac:AddressLine>
          <cbc:Line>${escapeXml(address.addressLine0 || 'NA')}</cbc:Line>
        </cac:AddressLine>
        <cac:AddressLine>
          <cbc:Line>${escapeXml(address.addressLine1 || ' ')}</cbc:Line>
        </cac:AddressLine>
        <cac:AddressLine>
          <cbc:Line>${escapeXml(address.addressLine2 || ' ')}</cbc:Line>
        </cac:AddressLine>
        <cac:Country>
          <cbc:IdentificationCode listID="ISO3166-1" listAgencyID="6">${escapeXml(address.country || ' ')}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>`
}

/**
 * Generates delivery XML section
 */
const generateDeliveryXML = (
  delivery: NonNullable<InvoiceV1_1['delivery']>,
): string => {
  return `
  <cac:Delivery>
    ${delivery.actualDeliveryDate ? `<cbc:ActualDeliveryDate>${delivery.actualDeliveryDate}</cbc:ActualDeliveryDate>` : ''}
    ${
      delivery.deliveryParty
        ? `
    <cac:DeliveryParty>
      ${
        delivery.deliveryParty.name
          ? `
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(delivery.deliveryParty.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>`
          : ''
      }
    </cac:DeliveryParty>`
        : ''
    }
    ${delivery.deliveryLocation ? generatePostalAddressXML(delivery.deliveryLocation) : ''}
  </cac:Delivery>`
}

/**
 * Generates payment means XML section
 */
const generatePaymentMeansXML = (
  paymentMeans: NonNullable<InvoiceV1_1['paymentMeans']>[0],
): string => {
  return `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${paymentMeans.paymentMeansCode}</cbc:PaymentMeansCode>
    ${paymentMeans.paymentDueDate ? `<cbc:PaymentDueDate>${paymentMeans.paymentDueDate}</cbc:PaymentDueDate>` : ''}
    ${
      paymentMeans.payeeFinancialAccountID
        ? `
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escapeXml(paymentMeans.payeeFinancialAccountID)}</cbc:ID>
    </cac:PayeeFinancialAccount>`
        : ''
    }
  </cac:PaymentMeans>`
}

/**
 * Generates allowance/charge XML section
 */
const generateAllowanceChargeXML = (
  allowanceCharge: NonNullable<InvoiceV1_1['allowanceCharges']>[0],
): string => {
  return `
  <cac:AllowanceCharge>
    <cbc:ChargeIndicator>${allowanceCharge.chargeIndicator}</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReason>${escapeXml(allowanceCharge.reason)}</cbc:AllowanceChargeReason>
    ${allowanceCharge.multiplierFactorNumeric ? `<cbc:MultiplierFactorNumeric>${allowanceCharge.multiplierFactorNumeric}</cbc:MultiplierFactorNumeric>` : ''}
    <cbc:Amount currencyID="MYR">${allowanceCharge.amount}</cbc:Amount>
    ${allowanceCharge.baseAmount ? `<cbc:BaseAmount currencyID="MYR">${allowanceCharge.baseAmount}</cbc:BaseAmount>` : ''}
  </cac:AllowanceCharge>`
}

/**
 * Generates tax total XML section
 */
const generateTaxTotalXML = (taxTotal: InvoiceV1_1['taxTotal']): string => {
  return `
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="MYR">${taxTotal.taxAmount}</cbc:TaxAmount>
    ${
      taxTotal.taxSubtotals
        ? taxTotal.taxSubtotals
            .map(
              subtotal => `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="MYR">${subtotal.taxableAmount}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="MYR">${subtotal.taxAmount}</cbc:TaxAmount>
      ${subtotal.taxCategory.taxRate ? `<cbc:Percent>${subtotal.taxCategory.taxRate}</cbc:Percent>` : ''}
      <cac:TaxCategory>
        <cbc:ID>${subtotal.taxCategory.taxTypeCode}</cbc:ID>
        ${subtotal.taxCategory.taxExemptionReason ? `<cbc:TaxExemptionReason>${escapeXml(subtotal.taxCategory.taxExemptionReason)}</cbc:TaxExemptionReason>` : ''}
        <cac:TaxScheme>
          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">OTH</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`,
            )
            .join('')
        : ''
    }
  </cac:TaxTotal>`
}

/**
 * Generates legal monetary total XML section (updated to match working example)
 */
const generateLegalMonetaryTotalXML = (
  total: InvoiceV1_1['legalMonetaryTotal'],
): string => {
  return `
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="MYR">${total.taxExclusiveAmount}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="MYR">${total.taxExclusiveAmount}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="MYR">${total.taxInclusiveAmount}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="MYR">${total.allowanceTotalAmount || '0'}</cbc:AllowanceTotalAmount>
    <cbc:ChargeTotalAmount currencyID="MYR">${total.chargeTotalAmount || '0'}</cbc:ChargeTotalAmount>
    ${total.prepaidAmount ? `<cbc:PrepaidAmount currencyID="MYR">${total.prepaidAmount}</cbc:PrepaidAmount>` : ''}
    <cbc:PayableRoundingAmount currencyID="MYR">${total.payableRoundingAmount || '0'}</cbc:PayableRoundingAmount>
    <cbc:PayableAmount currencyID="MYR">${total.payableAmount}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>`
}

/**
 * Generates invoice line XML section (updated to match working example)
 */
const generateInvoiceLineXML = (
  item: InvoiceV1_1['invoiceLineItems'][0],
  lineNumber: number,
): string => {
  return `
  <cac:InvoiceLine>
    <cbc:ID>${lineNumber}</cbc:ID>
    ${item.quantity && item.measurement ? `<cbc:InvoicedQuantity unitCode="${item.measurement}">${item.quantity}</cbc:InvoicedQuantity>` : ''}
    <cbc:LineExtensionAmount currencyID="MYR">${item.totalTaxableAmountPerLine}</cbc:LineExtensionAmount>
    ${
      item.discountAmount
        ? `
    <cac:AllowanceCharge>
      <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
      <cbc:AllowanceChargeReason>Discount</cbc:AllowanceChargeReason>
      ${item.discountRate ? `<cbc:MultiplierFactorNumeric>${item.discountRate / 100}</cbc:MultiplierFactorNumeric>` : ''}
      <cbc:Amount currencyID="MYR">${item.discountAmount}</cbc:Amount>
    </cac:AllowanceCharge>`
        : ''
    }
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="MYR">${item.taxAmount}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="MYR">${item.totalTaxableAmountPerLine}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="MYR">${item.taxAmount}</cbc:TaxAmount>
        ${item.taxRate ? `<cbc:Percent>${item.taxRate.toFixed(2)}</cbc:Percent>` : ''}
        <cac:TaxCategory>
          <cbc:ID>${item.taxType}</cbc:ID>
          <cac:TaxScheme>
            <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">OTH</cbc:ID>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description>${escapeXml(item.itemDescription)}</cbc:Description>
      ${
        item.countryOfOrigin
          ? `
      <cac:OriginCountry>
        <cbc:IdentificationCode>${item.countryOfOrigin}</cbc:IdentificationCode>
      </cac:OriginCountry>`
          : ''
      }
      <cac:CommodityClassification>
        <cbc:ItemClassificationCode listID="PTC">001</cbc:ItemClassificationCode>
      </cac:CommodityClassification>
      <cac:CommodityClassification>
        <cbc:ItemClassificationCode listID="CLASS">${item.itemClassificationCode}</cbc:ItemClassificationCode>
      </cac:CommodityClassification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="MYR">${item.unitPrice}</cbc:PriceAmount>
    </cac:Price>
    <cac:ItemPriceExtension>
      <cbc:Amount currencyID="MYR">${item.totalTaxableAmountPerLine}</cbc:Amount>
    </cac:ItemPriceExtension>
  </cac:InvoiceLine>`
}

/**
 * Generates a document hash for submission (separate from signature DocDigest)
 * This is the SHA256 hash required by the Submit Documents API
 *
 * OFFICIAL MyInvois FAQ: "The XML/JSON document is hashed using SHA-256 to create the documentHash value"
 * CRITICAL: Must hash the SAME document that gets encoded for submission (minified XML)
 * Source: https://sdk.myinvois.hasil.gov.my/faq/#how-to-hash-the-documenthash-value-and-encode-the-document-value
 */
export const generateDocumentHash = (xmlDocument: string): string => {
  try {
    console.log(
      '🔧 Generating document hash using official MyInvois method (minified XML SHA256)',
    )

    // CRITICAL: Use the same minified XML that encodeDocumentForSubmission uses
    const minifiedXML = minifyXML(xmlDocument)

    const crypto = require('crypto')
    const documentHash = crypto
      .createHash('sha256')
      .update(minifiedXML, 'utf8')
      .digest('hex')

    console.log('📊 Original XML length:', xmlDocument.length, 'characters')
    console.log('📊 Minified XML length:', minifiedXML.length, 'characters')
    console.log('📊 Document hash (SHA256 hex):', documentHash)
    console.log(
      '📊 Hash length:',
      documentHash.length,
      'characters (should be 64)',
    )

    // Validate hash length
    if (documentHash.length !== 64) {
      console.error(
        `❌ Invalid hash length: ${documentHash.length}, expected 64 characters`,
      )
      throw new Error(`Invalid SHA256 hash length: ${documentHash.length}`)
    }

    return documentHash
  } catch (error) {
    console.error('❌ Error generating document hash:', error)
    throw new Error(`Failed to generate document hash: ${error}`)
  }
}

/**
 * Encodes the XML document to base64 for submission
 * Includes minification as recommended by MyInvois documentation
 */
export const encodeDocumentForSubmission = (xmlDocument: string): string => {
  const minifiedXML = minifyXML(xmlDocument)
  return Buffer.from(minifiedXML, 'utf8').toString('base64')
}

/**
 * Utility functions for extracting certificate information
 */

/**
 * Extracts certificate information from a PEM certificate file
 * @param certificatePem - The certificate in PEM format
 * @returns Object containing issuer name and serial number
 */
export const extractCertificateInfo = (
  certificatePem: string,
): {
  issuerName: string
  serialNumber: string
} => {
  try {
    // Create X509Certificate object (Node.js 15.6.0+)
    const cert = new crypto.X509Certificate(certificatePem)

    // Extract issuer name (in the format required by MyInvois)
    const issuerName = cert.issuer

    // Extract serial number and convert from hex to decimal as required by MyInvois
    const serialNumberHex = cert.serialNumber
    console.log('📋 Certificate serial number (hex):', serialNumberHex)

    // Convert hex to decimal string (MyInvois requires integer format)
    const serialNumberDecimal = BigInt('0x' + serialNumberHex).toString()
    console.log('📋 Certificate serial number (decimal):', serialNumberDecimal)

    return {
      issuerName,
      serialNumber: serialNumberDecimal,
    }
  } catch (error) {
    throw new Error(`Failed to extract certificate info: ${error}`)
  }
}

/**
 * Validates that certificate and private key match
 * @param certificatePem - The certificate in PEM format
 * @param privateKeyPem - The private key in PEM format
 * @returns boolean indicating if they match
 */
export const validateKeyPair = (
  certificatePem: string,
  privateKeyPem: string,
): boolean => {
  try {
    // Extract public key from certificate
    const cert = new crypto.X509Certificate(certificatePem)
    const publicKey = cert.publicKey

    // Create a test signature with private key
    const testData = 'test-validation-data'
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(testData)
    const signature = signer.sign(privateKeyPem)

    // Verify signature with public key
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(testData)
    return verifier.verify(publicKey, signature)
  } catch (error) {
    console.error('Key pair validation failed:', error)
    return false
  }
}

/**
 * Helper function to create SigningCredentials from certificate and private key files
 * @param certificatePem - The certificate in PEM format
 * @param privateKeyPem - The private key in PEM format
 * @returns Complete SigningCredentials object
 */
export function createSigningCredentials(
  certificatePem: string,
  privateKeyPem: string,
): SigningCredentials {
  // Validate that the key pair matches
  if (!validateKeyPair(certificatePem, privateKeyPem)) {
    throw new Error('Certificate and private key do not match')
  }

  // Extract certificate information
  const { issuerName, serialNumber } = extractCertificateInfo(certificatePem)

  return {
    privateKeyPem,
    certificatePem,
    issuerName,
    serialNumber,
  }
}

/**
 * Generates the UBL XML template with complete signature structure
 */
export function generateUBLXMLTemplate(invoiceInfo: InvoiceV1_1): string {
  const { supplier, buyer, invoiceLineItems, legalMonetaryTotal, taxTotal } =
    invoiceInfo

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" 
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" 
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <UBLExtensions xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <UBLExtension>
      <ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ExtensionURI>
      <ExtensionContent>
        <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2" 
                                   xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2" 
                                   xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">
          <sac:SignatureInformation>
            <cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID>
            <sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>
            <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
              <ds:SignedInfo>
                <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
                <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
                <ds:Reference Id="id-doc-signed-data" URI="">
                  <ds:Transforms>
                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                      <ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath>
                    </ds:Transform>
                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                      <ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath>
                    </ds:Transform>
                    <ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
                  </ds:Transforms>
                  <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                  <ds:DigestValue></ds:DigestValue>
                </ds:Reference>
                <ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#id-xades-signed-props">
                  <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                  <ds:DigestValue></ds:DigestValue>
                </ds:Reference>
              </ds:SignedInfo>
              <ds:SignatureValue></ds:SignatureValue>
              <ds:KeyInfo>
                <ds:X509Data>
                  <ds:X509Certificate></ds:X509Certificate>
                </ds:X509Data>
              </ds:KeyInfo>
              <ds:Object>
                <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="signature">
                  <xades:SignedProperties Id="id-xades-signed-props">
                    <xades:SignedSignatureProperties>
                      <xades:SigningTime></xades:SigningTime>
                      <xades:SigningCertificate>
                        <xades:Cert>
                          <xades:CertDigest>
                            <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                            <ds:DigestValue></ds:DigestValue>
                          </xades:CertDigest>
                          <xades:IssuerSerial>
                            <ds:X509IssuerName></ds:X509IssuerName>
                            <ds:X509SerialNumber></ds:X509SerialNumber>
                          </xades:IssuerSerial>
                        </xades:Cert>
                      </xades:SigningCertificate>
                    </xades:SignedSignatureProperties>
                  </xades:SignedProperties>
                </xades:QualifyingProperties>
              </ds:Object>
            </ds:Signature>
          </sac:SignatureInformation>
        </sig:UBLDocumentSignatures>
      </ExtensionContent>
    </UBLExtension>
  </UBLExtensions>
  <cbc:ID>${escapeXml(invoiceInfo.eInvoiceCodeOrNumber)}</cbc:ID>
  <cbc:IssueDate>${invoiceInfo.eInvoiceDate}</cbc:IssueDate>
  <cbc:IssueTime>${invoiceInfo.eInvoiceTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listVersionID="1.1">${invoiceInfo.eInvoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoiceInfo.invoiceCurrencyCode}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${invoiceInfo.invoiceCurrencyCode}</cbc:TaxCurrencyCode>
  ${
    invoiceInfo.billingPeriodStartDate && invoiceInfo.billingPeriodEndDate
      ? `
  <cac:InvoicePeriod>
    <cbc:StartDate>${invoiceInfo.billingPeriodStartDate}</cbc:StartDate>
    <cbc:EndDate>${invoiceInfo.billingPeriodEndDate}</cbc:EndDate>
    ${invoiceInfo.frequencyOfBilling ? `<cbc:Description>${escapeXml(invoiceInfo.frequencyOfBilling)}</cbc:Description>` : ''}
  </cac:InvoicePeriod>`
      : ''
  }
  <cac:Signature>
    <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>
    <cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod>
  </cac:Signature>
  ${generateSupplierXML(supplier)}
  ${generateBuyerXML(buyer)}
  ${invoiceInfo.delivery ? generateDeliveryXML(invoiceInfo.delivery) : ''}
  ${invoiceInfo.paymentMeans ? invoiceInfo.paymentMeans.map(pm => generatePaymentMeansXML(pm)).join('') : ''}
  ${invoiceInfo.allowanceCharges ? invoiceInfo.allowanceCharges.map(ac => generateAllowanceChargeXML(ac)).join('') : ''}
  ${generateTaxTotalXML(taxTotal)}
  ${generateLegalMonetaryTotalXML(legalMonetaryTotal)}
  ${invoiceLineItems.map((item, index) => generateInvoiceLineXML(item, index + 1)).join('')}
</Invoice>`
}

/**
 * Generates a signed UBL XML invoice document following MyInvois specifications.
 *
 * @param invoiceInfo - The invoice data structure
 * @param signingCredentials - Digital signature credentials
 * @returns Promise<string> - The complete signed XML document ready for submission
 */
export const generateSignedInvoiceXML = async (
  invoiceInfo: InvoiceV1_1,
  signingCredentials: SigningCredentials,
): Promise<string> => {
  // Step 1: Generate the UBL XML template with signature structure
  const xmlTemplate = generateUBLXMLTemplate(invoiceInfo)

  // Parse the XML template
  const parser = new DOMParserImpl()
  const templateDoc = parser.parseFromString(xmlTemplate, 'application/xml')

  // Step 2: Apply transformations to get the document for hashing
  const transformedXml = transformXmlInvoice(xmlTemplate)
  const transformedDoc = parser.parseFromString(
    transformedXml,
    'application/xml',
  )

  // Step 3: Canonicalize and generate document hash (DocDigest) - try C14N 1.1 first
  const docDigest =
    await canonicalizeAndHashDocumentWithC14N11Fallback(transformedDoc)

  // Step 4: Sign the document digest (Sig)
  const signature = signDocumentDigest(
    docDigest,
    signingCredentials.privateKeyPem,
  )

  // Step 5: Generate certificate hash (CertDigest)
  const certDigest = hashCertificate(signingCredentials.certificatePem)

  // Step 6: Populate signed properties
  const signedPropertiesData: SignedPropertiesData = {
    certDigest,
    signingTime: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), // ISO format without milliseconds
    issuerName: signingCredentials.issuerName,
    serialNumber: signingCredentials.serialNumber,
  }

  populateSignedProperties(templateDoc, signedPropertiesData)

  // Step 7: Generate signed properties hash (PropsDigest) - try C14N 1.1 first
  const propsDigest = await hashSignedPropertiesWithC14N11Fallback(templateDoc)

  // Step 8: Populate final document
  const finalData: FinalDocumentData = {
    signatureValue: signature,
    propsDigest,
    docDigest,
    certificatePem: signingCredentials.certificatePem,
  }

  populateFinalDocument(templateDoc, finalData)

  // Serialize the final signed document
  const serializer = new XMLSerializerImpl()
  return serializer.serializeToString(templateDoc)
}

/**
 * Generates a document hash for submission using the same method as signature creation
 * This ensures consistency with MyInvois validation requirements
 */
export const generateDocumentHashForSubmission = async (
  xmlDocument: string,
): Promise<string> => {
  try {
    console.log(
      '🔧 Generating document hash using signature-compatible method...',
    )

    // Parse the signed XML
    const parser = new DOMParserImpl()

    // Apply the same transformations as used in signature creation
    const transformedXml = transformXmlInvoice(xmlDocument)
    const transformedDoc = parser.parseFromString(
      transformedXml,
      'application/xml',
    )

    // Use the same canonicalization as signature creation
    const base64Digest =
      await canonicalizeAndHashDocumentWithC14N11Fallback(transformedDoc)
    const hexDigest = Buffer.from(base64Digest, 'base64').toString('hex')
    console.log('📊 Canonicalized document hash (base64):', base64Digest)
    console.log('📊 Canonicalized document hash (hex):', hexDigest)
    console.log('📊 Hash length:', hexDigest.length, 'characters')
    return hexDigest
  } catch (error) {
    console.error('Error generating canonicalized hash, using fallback:', error)
    return generateDocumentHash(xmlDocument)
  }
}
