import type { InvoiceV1_1 } from 'src/types'
import { DOMParserImpl, XMLSerializerImpl } from 'xmldom-ts'
import { transformXmlInvoice } from './signature/transform'
import { canonicalizeAndHashDocument } from './signature/canonicalize'
import { signDocumentDigest } from './signature/sign'
import { hashCertificate } from './signature/hashCert'
import {
  populateSignedProperties,
  type SignedPropertiesData,
} from './signature/populateSignedProperties'
import { hashSignedProperties } from './signature/hashSignedProperties'
import {
  populateFinalDocument,
  type FinalDocumentData,
} from './signature/populateFinalDocument'

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
 * Generates a signed UBL XML invoice document following MyInvois specifications.
 *
 * @param invoiceInfo - The invoice data structure
 * @param signingCredentials - Digital signature credentials
 * @returns Promise<string> - The complete signed XML document ready for submission
 */
export async function generateSignedInvoiceXML(
  invoiceInfo: InvoiceV1_1,
  signingCredentials: SigningCredentials,
): Promise<string> {
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

  // Step 3: Canonicalize and generate document hash (DocDigest)
  const docDigest = await canonicalizeAndHashDocument(transformedDoc)

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

  // Step 7: Generate signed properties hash (PropsDigest)
  const propsDigest = await hashSignedProperties(templateDoc)

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
 * Generates the UBL XML template with complete signature structure
 */
function generateUBLXMLTemplate(invoiceInfo: InvoiceV1_1): string {
  const { supplier, buyer, invoiceLineItems, legalMonetaryTotal, taxTotal } =
    invoiceInfo

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" 
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" 
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
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
                <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
                <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
                <ds:Reference Id="id-doc-signed-data" URI="">
                  <ds:Transforms>
                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                      <ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath>
                    </ds:Transform>
                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                      <ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath>
                    </ds:Transform>
                    <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
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
 * Generates supplier XML section
 */
function generateSupplierXML(supplier: InvoiceV1_1['supplier']): string {
  return `
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="TIN">${escapeXml(supplier.tin)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="BRN">${escapeXml(supplier.registrationNumber)}</cbc:ID>
      </cac:PartyIdentification>
      ${
        supplier.sstRegistrationNumber
          ? `
      <cac:PartyIdentification>
        <cbc:ID schemeID="SST">${escapeXml(supplier.sstRegistrationNumber)}</cbc:ID>
      </cac:PartyIdentification>`
          : ''
      }
      ${generateAddressXML(supplier.address)}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(supplier.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${escapeXml(supplier.contactNumber)}</cbc:Telephone>
        ${supplier.email ? `<cbc:ElectronicMail>${escapeXml(supplier.email)}</cbc:ElectronicMail>` : ''}
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>`
}

/**
 * Generates buyer XML section
 */
function generateBuyerXML(buyer: InvoiceV1_1['buyer']): string {
  return `
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="TIN">${escapeXml(buyer.tin)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="BRN">${escapeXml(buyer.registrationNumber)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="SST">${escapeXml(buyer.sstRegistrationNumber)}</cbc:ID>
      </cac:PartyIdentification>
      ${generateAddressXML(buyer.address)}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(buyer.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${escapeXml(buyer.contactNumber)}</cbc:Telephone>
        ${buyer.email ? `<cbc:ElectronicMail>${escapeXml(buyer.email)}</cbc:ElectronicMail>` : ''}
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>`
}

/**
 * Generates address XML section
 */
function generateAddressXML(
  address: InvoiceV1_1['supplier']['address'],
): string {
  return `
      <cac:PostalAddress>
        <cbc:CityName>${escapeXml(address.cityName)}</cbc:CityName>
        ${address.postalZone ? `<cbc:PostalZone>${escapeXml(address.postalZone)}</cbc:PostalZone>` : ''}
        <cbc:CountrySubentityCode>${escapeXml(address.state)}</cbc:CountrySubentityCode>
        <cac:AddressLine>
          <cbc:Line>${escapeXml(address.addressLine0)}</cbc:Line>
        </cac:AddressLine>
        ${
          address.addressLine1
            ? `
        <cac:AddressLine>
          <cbc:Line>${escapeXml(address.addressLine1)}</cbc:Line>
        </cac:AddressLine>`
            : ''
        }
        ${
          address.addressLine2
            ? `
        <cac:AddressLine>
          <cbc:Line>${escapeXml(address.addressLine2)}</cbc:Line>
        </cac:AddressLine>`
            : ''
        }
        <cac:Country>
          <cbc:IdentificationCode listID="ISO3166-1" listAgencyID="6">${escapeXml(address.country)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>`
}

/**
 * Generates delivery XML section
 */
function generateDeliveryXML(
  delivery: NonNullable<InvoiceV1_1['delivery']>,
): string {
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
    ${delivery.deliveryLocation ? generateAddressXML(delivery.deliveryLocation) : ''}
  </cac:Delivery>`
}

/**
 * Generates payment means XML section
 */
function generatePaymentMeansXML(
  paymentMeans: NonNullable<InvoiceV1_1['paymentMeans']>[0],
): string {
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
function generateAllowanceChargeXML(
  allowanceCharge: NonNullable<InvoiceV1_1['allowanceCharges']>[0],
): string {
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
function generateTaxTotalXML(taxTotal: InvoiceV1_1['taxTotal']): string {
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
 * Generates legal monetary total XML section
 */
function generateLegalMonetaryTotalXML(
  total: InvoiceV1_1['legalMonetaryTotal'],
): string {
  return `
  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="MYR">${total.taxExclusiveAmount}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="MYR">${total.taxInclusiveAmount}</cbc:TaxInclusiveAmount>
    ${total.allowanceTotalAmount ? `<cbc:AllowanceTotalAmount currencyID="MYR">${total.allowanceTotalAmount}</cbc:AllowanceTotalAmount>` : ''}
    ${total.chargeTotalAmount ? `<cbc:ChargeTotalAmount currencyID="MYR">${total.chargeTotalAmount}</cbc:ChargeTotalAmount>` : ''}
    ${total.prepaidAmount ? `<cbc:PrepaidAmount currencyID="MYR">${total.prepaidAmount}</cbc:PrepaidAmount>` : ''}
    ${total.payableRoundingAmount ? `<cbc:PayableRoundingAmount currencyID="MYR">${total.payableRoundingAmount}</cbc:PayableRoundingAmount>` : ''}
    <cbc:PayableAmount currencyID="MYR">${total.payableAmount}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>`
}

/**
 * Generates invoice line XML section
 */
function generateInvoiceLineXML(
  item: InvoiceV1_1['invoiceLineItems'][0],
  lineNumber: number,
): string {
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
        ${item.taxRate ? `<cbc:Percent>${item.taxRate}</cbc:Percent>` : ''}
        <cac:TaxCategory>
          <cbc:ID>${item.taxType}</cbc:ID>
          ${item.taxExemptionReasonCode ? `<cbc:TaxExemptionReason>${item.taxExemptionReasonCode}</cbc:TaxExemptionReason>` : ''}
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
        <cbc:ItemClassificationCode listID="CLASS">${item.itemClassificationCode}</cbc:ItemClassificationCode>
      </cac:CommodityClassification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="MYR">${item.unitPrice}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
}

/**
 * Escapes XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generates a document hash for submission (separate from signature DocDigest)
 * This is the SHA256 hash required by the Submit Documents API
 */
export function generateDocumentHash(xmlDocument: string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(xmlDocument, 'utf8').digest('hex')
}

/**
 * Encodes the XML document to base64 for submission
 */
export function encodeDocumentForSubmission(xmlDocument: string): string {
  return Buffer.from(xmlDocument, 'utf8').toString('base64')
}

/**
 * Utility functions for extracting certificate information
 */
import * as crypto from 'crypto'

/**
 * Extracts certificate information from a PEM certificate file
 * @param certificatePem - The certificate in PEM format
 * @returns Object containing issuer name and serial number
 */
export function extractCertificateInfo(certificatePem: string): {
  issuerName: string
  serialNumber: string
} {
  try {
    // Create X509Certificate object (Node.js 15.6.0+)
    const cert = new crypto.X509Certificate(certificatePem)

    // Extract issuer name (in the format required by MyInvois)
    const issuerName = cert.issuer

    // Extract serial number and convert to decimal string
    const serialNumber = cert.serialNumber

    return {
      issuerName,
      serialNumber,
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
export function validateKeyPair(
  certificatePem: string,
  privateKeyPem: string,
): boolean {
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
 * Generates a test certificate and private key for development/testing purposes ONLY
 * WARNING: This is for testing signature creation logic only.
 * Real MyInvois submissions require official certificates from LHDNM/approved CAs.
 *
 * @param subjectName - The subject name for the certificate
 * @returns Object containing test certificate and private key in PEM format
 */
export function generateTestCertificate(
  subjectName: string = 'CN=Test Certificate, O=Test Organization, C=MY',
): {
  certificatePem: string
  privateKeyPem: string
} {
  try {
    // Generate RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    })

    // Create a self-signed certificate
    // Note: This is a simplified version for testing. Real certificates have more complex structures.
    const cert = createSelfSignedCertificate(subjectName, publicKey, privateKey)

    return {
      certificatePem: cert,
      privateKeyPem: privateKey,
    }
  } catch (error) {
    throw new Error(`Failed to generate test certificate: ${error}`)
  }
}

/**
 * Creates a self-signed X.509 certificate for testing
 * This is a simplified implementation for development testing only
 */
function createSelfSignedCertificate(
  subjectName: string,
  publicKey: string,
  privateKey: string,
): string {
  // This is a basic implementation. For more robust certificate generation,
  // you might want to use libraries like 'node-forge' or 'pki.js'

  // Create certificate using Node.js crypto (simplified approach)
  const serialNumber = Math.floor(Math.random() * 1000000000).toString()

  // For testing, we'll create a basic certificate structure
  // In a real scenario, you'd use proper ASN.1 encoding

  // This is a placeholder - for actual certificate generation,
  // consider using the node-forge library which provides proper X.509 certificate creation
  throw new Error(
    'Self-signed certificate generation requires additional libraries. Please use the manual OpenSSL approach below.',
  )
}

/**
 * Instructions for creating test certificates using OpenSSL
 * Run these commands in your terminal to create test certificates for development
 */
export function getTestCertificateInstructions(): string {
  return `
# Create test certificates for development using OpenSSL

# 1. Generate a private key
openssl genrsa -out test-private-key.pem 2048

# 2. Create a self-signed certificate
openssl req -new -x509 -key test-private-key.pem -out test-certificate.pem -days 365 \\
  -subj "/C=MY/O=Test Organization/CN=Test Certificate"

# 3. View the certificate details (optional)
openssl x509 -in test-certificate.pem -text -noout

# 4. Use in your application
const fs = require('fs')
const certificatePem = fs.readFileSync('./test-certificate.pem', 'utf8')
const privateKeyPem = fs.readFileSync('./test-private-key.pem', 'utf8')

const testCredentials = createSigningCredentials(certificatePem, privateKeyPem)

# WARNING: These test certificates will NOT work with the actual MyInvois API.
# They are only for testing your signature creation logic locally.
`
}

/**
 * Creates test signing credentials using a predefined test certificate
 * This uses the same structure as the example XML you provided, but with test values
 */
export function createTestSigningCredentials(): SigningCredentials {
  // Test private key (THIS IS FOR TESTING ONLY - NEVER USE IN PRODUCTION)
  const testPrivateKey = process.env.PRIVATE_KEY!

  // Test certificate (THIS IS FOR TESTING ONLY)
  const testCertificate = process.env.CERTIFICATE!

  console.warn(`
⚠️  WARNING: Using test credentials for development only!
These credentials will NOT work with the actual MyInvois API.
You must obtain official certificates from LHDNM for production use.
`)

  return {
    privateKeyPem: testPrivateKey,
    certificatePem: testCertificate,
    issuerName:
      'CN=Test LHDNM Sub CA V1, OU=Terms of use at https://www.posdigicert.com.my, O=LHDNM, C=MY',
    serialNumber: '123456789012345678901234567890123456789',
  }
}
