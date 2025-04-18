/**
 * Represents the Digest Method structure used within the signature.
 */
export interface DigestMethod {
  /** Algorithm used for digest. Should be http://www.w3.org/2001/04/xmlenc#sha256 */
  Algorithm: string
}

/**
 * Represents the Cert Digest structure.
 */
export interface CertDigest {
  /** Digest method details. */
  "ds:DigestMethod": DigestMethod
  /** Base64 encoded HEX-SHA256 certificate information (CertDigest). */
  "ds:DigestValue": string // base64binary
}

/**
 * Represents the Issuer Serial structure within the Signing Certificate.
 */
export interface IssuerSerial {
  /** CN of the certificate issuer (Organization name). */
  "ds:X509IssuerName": string
  /** Digital certificate serial number. */
  "ds:X509SerialNumber": string // xsd:normalizedString -> string
}

/**
 * Represents the Certificate structure within Signing Certificate.
 */
export interface Cert {
  /** Certificate digest details. */
  "xades:CertDigest": CertDigest
  /** Issuer details. */
  "xades:IssuerSerial": IssuerSerial
}

/**
 * Represents the Signing Certificate structure.
 */
export interface SigningCertificate {
  /** Certificate details. */
  "xades:Cert": Cert
}

/**
 * Represents the Signed Signature Properties.
 */
export interface SignedSignatureProperties {
  /** UTC timestamp of signing (YYYY-MM-DDTHH:mm:ssZ). */
  "xades:SigningTime": string // dateTime
  /** Signing certificate details. */
  "xades:SigningCertificate": SigningCertificate
  // Note: Other optional properties like SignaturePolicyIdentifier might exist
}

/**
 * Represents the Signed Properties structure.
 */
export interface SignedProperties {
  /** Target attribute, should be 'signature'. */
  Target: string
  /** ID attribute, should be 'id-xades-signed-props'. */
  Id: string
  /** Signed signature properties. */
  "xades:SignedSignatureProperties": SignedSignatureProperties
}

/**
 * Represents the Qualifying Properties structure (Object element).
 */
export interface QualifyingProperties {
  /** Target attribute, should be 'signature'. */
  Target: string
  /** Signed properties details. */
  "xades:SignedProperties": SignedProperties
  // Note: UnsignedProperties might exist but are not detailed in the mandatory part
}

/**
 * Represents the X509 Data structure within KeyInfo.
 */
export interface X509Data {
  /** Base64 encoded X509 certificate. */
  "ds:X509Certificate": string // base64binary
}

/**
 * Represents the Key Information structure.
 */
export interface KeyInfo {
  /** X509 certificate data. */
  "ds:X509Data": X509Data
}

/**
 * Represents the Transform structure within Reference.
 */
export interface Transform {
  /** Algorithm attribute for the transform. */
  Algorithm: string
}

/**
 * Represents a Reference within SignedInfo.
 */
export interface Reference {
  /** ID attribute for the reference (e.g., 'id-doc-signed-data', 'id-xades-signed-props'). */
  Id?: string
  /** URI attribute for the reference (e.g., '', '#id-xades-signed-props'). */
  URI: string
  /** Optional Transforms applied. */
  "ds:Transforms"?: {
    "ds:Transform": Transform | Transform[] // Can be single or multiple transforms
  }
  /** Digest method details. */
  "ds:DigestMethod": DigestMethod
  /** Base64 encoded digest value (DocDigest or PropsDigest). */
  "ds:DigestValue": string // base64binary
}

/**
 * Represents the Canonicalization Method structure.
 */
export interface CanonicalizationMethod {
  /** Algorithm used for canonicalization. Should be http://www.w3.org/2006/12/xml-c14n11 */
  Algorithm: string
}

/**
 * Represents the Signature Method structure.
 */
export interface SignatureMethod {
  /** Algorithm used for signing. Should be http://www.w3.org/2001/04/xmldsig-more#rsa-sha256 */
  Algorithm: string
}

/**
 * Represents the Signed Information structure.
 */
export interface SignedInfo {
  /** Canonicalization method details. */
  "ds:CanonicalizationMethod": CanonicalizationMethod
  /** Signature method details. */
  "ds:SignatureMethod": SignatureMethod
  /** References to signed data and properties. Should contain two references. */
  "ds:Reference": [Reference, Reference] // Expecting two: one for document, one for signed properties
}

/**
 * Represents the root Signature element (IssuerDigitalSignature).
 * Based on the documentation: https://sdk.myinvois.hasil.gov.my/signature/
 * Conforms to XAdES enveloped signature requirements for UBL.
 */
export interface IssuerDigitalSignature {
  /** ID attribute, should be 'DocSig'. */
  Id: string
  /** Signed information details. */
  "ds:SignedInfo": SignedInfo
  /** Base64 encoded signature value (Sig). */
  "ds:SignatureValue": string // base64binary
  /** Public key information (certificate). */
  "ds:KeyInfo": KeyInfo
  /** Object containing signed properties. */
  "ds:Object": {
    "xades:QualifyingProperties": QualifyingProperties
  }
}
