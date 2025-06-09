import crypto from 'crypto'
import type { InvoiceV1_1 } from '../types'
import {
  extractCertificateInfo,
  calculateDocumentDigest,
  calculateSignedPropertiesDigest,
  createSignedProperties,
  calculateCertificateDigest,
} from './document'

export interface CertificateAnalysisResult {
  organizationIdentifier?: string
  serialNumber?: string
  issuerName: string
  subjectName: string
  issues: string[]
  recommendations: string[]
}

export interface SignatureAnalysisResult {
  documentDigest: string
  certificateDigest: string
  signedPropertiesDigest: string
  issues: string[]
  recommendations: string[]
}

export interface DiagnosticResult {
  certificateAnalysis: CertificateAnalysisResult
  signatureAnalysis: SignatureAnalysisResult
  summary: {
    totalIssues: number
    certificateIssues: number
    signatureIssues: number
  }
}

/**
 * Analyzes certificate for MyInvois compatibility issues
 */
function analyzeCertificateForDiagnostics(
  certificatePem: string,
): CertificateAnalysisResult {
  const issues: string[] = []
  const recommendations: string[] = []

  try {
    const cert = new crypto.X509Certificate(certificatePem)
    const certInfo = extractCertificateInfo(certificatePem)

    // Parse subject fields for MyInvois analysis
    const parseSubjectFields = (dn: string) => {
      const fields: Record<string, string> = {}
      dn.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key) {
            fields[key.trim()] = valueParts.join('=').trim()
          }
        }
      })
      return fields
    }

    const subjectFields = parseSubjectFields(cert.subject)
    const organizationIdentifier =
      subjectFields['organizationIdentifier'] || subjectFields['2.5.4.97']
    const serialNumber = subjectFields['serialNumber']

    // DS311 - TIN Mismatch Analysis
    if (!organizationIdentifier) {
      issues.push(
        'DS311: Certificate missing organizationIdentifier field (TIN)',
      )
      recommendations.push(
        'CRITICAL: Generate new certificate with organizationIdentifier matching your MyInvois TIN',
      )
      recommendations.push(
        'Portal Error: "Signer of invoice doesn\'t match the submitter of document. TIN doesn\'t match with the OI."',
      )
    } else {
      // Additional TIN format validation
      if (organizationIdentifier.length < 10) {
        issues.push(
          'DS311: OrganizationIdentifier (TIN) appears too short - may cause submission rejection',
        )
        recommendations.push(
          'Verify TIN format matches exactly what is registered in MyInvois',
        )
      }
    }

    // DS312 - Registration Number Analysis
    if (!serialNumber) {
      issues.push(
        'DS312: Certificate missing serialNumber field (business registration)',
      )
      recommendations.push(
        'CRITICAL: Generate new certificate with serialNumber matching your business registration',
      )
      recommendations.push(
        'Portal Error: "Submitter registration/identity number doesn\'t match with the certificate SERIALNUMBER."',
      )
    }

    // DS329 - Certificate Trust Analysis
    if (cert.issuer === cert.subject) {
      issues.push(
        'DS329: Self-signed certificate detected - will fail chain of trust validation',
      )
      recommendations.push(
        'BLOCKING: Obtain certificate from MyInvois-approved CA:',
      )
      recommendations.push('• MSC Trustgate Sdn Bhd')
      recommendations.push('• DigiCert Sdn Bhd')
      recommendations.push('• Cybersign Asia Sdn Bhd')
      recommendations.push(
        'Portal Error: "Certificate is not valid according to the chain of trust validation or has been issued by an untrusted certificate authority."',
      )
    } else {
      // Check if issuer looks like a known CA
      const issuerName = cert.issuer.toLowerCase()
      const approvedCAs = ['msc trustgate', 'digicert', 'cybersign']
      const isFromApprovedCA = approvedCAs.some(ca => issuerName.includes(ca))

      if (!isFromApprovedCA) {
        issues.push('DS329: Certificate may not be from MyInvois-approved CA')
        recommendations.push(
          'Verify certificate was issued by an approved CA for MyInvois',
        )
      }
    }

    // DS326 - Issuer Name Format Analysis (Enhanced)
    const rawIssuer = cert.issuer
    const normalizedIssuer = certInfo.issuerName

    // Check for issues in the NORMALIZED issuer (these are actual problems)
    const normalizedIssuerIssues = [
      {
        check: normalizedIssuer.includes('\n'),
        issue: 'Normalized issuer still contains newlines',
      },
      {
        check: normalizedIssuer.includes('  '),
        issue: 'Normalized issuer contains double spaces',
      },
      {
        check: /=\s+/.test(normalizedIssuer),
        issue: 'Normalized issuer has spaces after equals',
      },
      {
        check: /\s+=/.test(normalizedIssuer),
        issue: 'Normalized issuer has spaces before equals',
      },
      {
        check: normalizedIssuer.includes('\r'),
        issue: 'Normalized issuer contains carriage returns',
      },
    ]

    // Only report actual issues in the normalized version that will cause portal errors
    const hasActualFormatIssues = normalizedIssuerIssues.some(
      ({ check, issue }) => {
        if (check) {
          issues.push(`DS326: ${issue} - will cause X509IssuerName mismatch`)
          return true
        }
        return false
      },
    )

    // Check if raw issuer has issues but normalized version is OK (informational)
    const hasRawIssuesButNormalizedOk =
      rawIssuer.includes('\n') && !normalizedIssuer.includes('\n')

    if (hasActualFormatIssues) {
      recommendations.push(
        'CRITICAL: Fix issuer name normalization in signature generation',
      )
      recommendations.push(
        'Portal Error: "Certificate X509IssuerName doesn\'t match the X509IssuerName value provided in the signed properties section."',
      )
      recommendations.push(
        'The normalization function is not properly formatting the issuer name',
      )
      recommendations.push(
        'Debug: Check document.ts extractCertificateInfo() normalization logic',
      )
    } else if (hasRawIssuesButNormalizedOk) {
      // This is informational - normalization is working correctly
      console.log(
        'ℹ️  Note: Raw certificate issuer has newlines but normalization is handling them correctly',
      )
    }

    // Additional certificate validity checks
    const now = new Date()
    const validFrom = new Date(cert.validFrom)
    const validTo = new Date(cert.validTo)

    if (now < validFrom) {
      issues.push('DS329: Certificate not yet valid (future start date)')
      recommendations.push('Wait until certificate validity period begins')
    }

    if (now > validTo) {
      issues.push('DS329: Certificate has expired')
      recommendations.push(
        'BLOCKING: Renew certificate - expired certificates are rejected',
      )
    }

    // Check certificate key usage (if available)
    try {
      if (cert.keyUsage && !cert.keyUsage.includes('digital signature')) {
        issues.push('DS333: Certificate lacks digitalSignature key usage')
        recommendations.push(
          'Generate new certificate with digitalSignature key usage enabled',
        )
      }
    } catch {
      // Key usage might not be available in all certificates
      console.log('Note: Could not check key usage extensions')
    }

    return {
      organizationIdentifier,
      serialNumber,
      issuerName: certInfo.issuerName,
      subjectName: certInfo.subjectName,
      issues,
      recommendations,
    }
  } catch (error) {
    issues.push(`Certificate parsing failed: ${error}`)
    recommendations.push('Verify certificate format and validity')

    return {
      issuerName: '',
      subjectName: '',
      issues,
      recommendations,
    }
  }
}

/**
 * Analyzes signature generation for potential issues
 */
function analyzeSignatureForDiagnostics(
  invoices: InvoiceV1_1[],
  certificatePem: string,
): SignatureAnalysisResult {
  const issues: string[] = []
  const recommendations: string[] = []

  try {
    // Step 1: Document digest
    const documentDigest = calculateDocumentDigest(invoices)

    // Step 2: Certificate digest
    const certificateDigest = calculateCertificateDigest(certificatePem)

    // Step 3: Extract certificate info
    const certInfo = extractCertificateInfo(certificatePem)
    const signingTime = new Date().toISOString()

    // Step 4: Create signed properties
    const signedProperties = createSignedProperties(
      certificateDigest,
      signingTime,
      certInfo.issuerName,
      certInfo.serialNumber,
    )

    // Step 5: Signed properties digest
    const signedPropertiesDigest =
      calculateSignedPropertiesDigest(signedProperties)

    // DS333 - Document Signature Validation
    if (documentDigest.length === 0) {
      issues.push('DS333: Document digest generation failed')
      recommendations.push(
        'CRITICAL: Verify document serialization excludes UBLExtensions/Signature',
      )
      recommendations.push(
        'Portal Error: "Document signature value is not a valid signature of the document digest using the public key of the certificate provided."',
      )
    }

    if (certificateDigest.length === 0) {
      issues.push('DS333: Certificate digest generation failed')
      recommendations.push('CRITICAL: Verify certificate format and encoding')
      recommendations.push(
        'Certificate must be properly base64 encoded without headers/footers',
      )
    }

    if (signedPropertiesDigest.length === 0) {
      issues.push('DS333: Signed properties digest generation failed')
      recommendations.push(
        'CRITICAL: Verify signed properties structure and canonicalization',
      )
      recommendations.push(
        'Check XML canonicalization (C14N) is applied correctly',
      )
    }

    // Additional DS333 checks
    try {
      const cert = new crypto.X509Certificate(certificatePem)

      // Verify the certificate has the required algorithms for MyInvois
      const publicKey = cert.publicKey
      const keyDetails = publicKey.asymmetricKeyDetails

      if (keyDetails) {
        // Check if key size is adequate for RSA (minimum 2048 bits)
        if (
          publicKey.asymmetricKeyType === 'rsa' &&
          keyDetails.modulusLength &&
          keyDetails.modulusLength < 2048
        ) {
          issues.push(
            'DS333: RSA key size too small (minimum 2048 bits required)',
          )
          recommendations.push(
            'CRITICAL: Generate new certificate with RSA 2048+ bits',
          )
        }

        // Check supported key types
        const supportedKeyTypes = ['rsa', 'ec']
        if (!supportedKeyTypes.includes(publicKey.asymmetricKeyType || '')) {
          issues.push(
            `DS333: Unsupported key type: ${publicKey.asymmetricKeyType}`,
          )
          recommendations.push(
            'CRITICAL: Use RSA or EC key types for MyInvois compatibility',
          )
        }
      }

      // Test certificate format validity
      const certBuffer = Buffer.from(
        certificatePem.replace(/-----[^-]+-----/g, '').replace(/\s/g, ''),
        'base64',
      )
      if (certBuffer.length === 0) {
        issues.push('DS333: Certificate encoding appears invalid')
        recommendations.push(
          'CRITICAL: Verify certificate is properly PEM encoded',
        )
      }
    } catch (error) {
      issues.push(`DS333: Certificate validation failed - ${error}`)
      recommendations.push(
        'CRITICAL: Verify certificate format and structure are valid',
      )
    }

    // Validate digest formats (should be base64)
    const isValidBase64 = (str: string) => {
      try {
        return Buffer.from(str, 'base64').toString('base64') === str
      } catch {
        return false
      }
    }

    if (documentDigest && !isValidBase64(documentDigest)) {
      issues.push('DS333: Document digest is not valid base64 format')
      recommendations.push('Ensure digest is properly base64 encoded')
    }

    if (certificateDigest && !isValidBase64(certificateDigest)) {
      issues.push('DS333: Certificate digest is not valid base64 format')
      recommendations.push(
        'Ensure certificate digest is properly base64 encoded',
      )
    }

    if (signedPropertiesDigest && !isValidBase64(signedPropertiesDigest)) {
      issues.push('DS333: Signed properties digest is not valid base64 format')
      recommendations.push(
        'Ensure signed properties digest is properly base64 encoded',
      )
    }

    return {
      documentDigest,
      certificateDigest,
      signedPropertiesDigest,
      issues,
      recommendations,
    }
  } catch (error) {
    issues.push(`Signature analysis failed: ${error}`)
    recommendations.push('Review signature generation implementation')

    return {
      documentDigest: '',
      certificateDigest: '',
      signedPropertiesDigest: '',
      issues,
      recommendations,
    }
  }
}

/**
 * Comprehensive signature diagnostics
 */
export function diagnoseSignatureIssues(
  invoices: InvoiceV1_1[],
  certificatePem: string,
): DiagnosticResult {
  const certificateAnalysis = analyzeCertificateForDiagnostics(certificatePem)
  const signatureAnalysis = analyzeSignatureForDiagnostics(
    invoices,
    certificatePem,
  )

  const certificateIssues = certificateAnalysis.issues.length
  const signatureIssues = signatureAnalysis.issues.length

  return {
    certificateAnalysis,
    signatureAnalysis,
    summary: {
      totalIssues: certificateIssues + signatureIssues,
      certificateIssues,
      signatureIssues,
    },
  }
}

/**
 * Prints diagnostic results in a formatted way
 */
export function printDiagnostics(result: DiagnosticResult): void {
  console.log('\n🔍 MyInvois Signature Diagnostics Report')
  console.log('='.repeat(60))

  // Certificate Analysis
  console.log('\n📜 CERTIFICATE ANALYSIS')
  console.log('-'.repeat(30))

  console.log(`  Issuer: ${result.certificateAnalysis.issuerName}`)
  console.log(`  Subject: ${result.certificateAnalysis.subjectName}`)

  if (result.certificateAnalysis.organizationIdentifier) {
    console.log(
      `  Organization ID (TIN): ${result.certificateAnalysis.organizationIdentifier}`,
    )
  }

  if (result.certificateAnalysis.serialNumber) {
    console.log(`  Serial Number: ${result.certificateAnalysis.serialNumber}`)
  }

  if (result.certificateAnalysis.issues.length > 0) {
    console.log('\n  🚨 Certificate Issues:')
    result.certificateAnalysis.issues.forEach((issue, index) => {
      console.log(`    ${index + 1}. ${issue}`)
    })
  }

  if (result.certificateAnalysis.recommendations.length > 0) {
    console.log('\n  💡 Certificate Recommendations:')
    result.certificateAnalysis.recommendations.forEach((rec, index) => {
      console.log(`    ${index + 1}. ${rec}`)
    })
  }

  // Signature Analysis
  console.log('\n🔐 SIGNATURE ANALYSIS')
  console.log('-'.repeat(30))

  console.log(
    `  Document Digest: ${result.signatureAnalysis.documentDigest.substring(0, 32)}...`,
  )
  console.log(
    `  Certificate Digest: ${result.signatureAnalysis.certificateDigest.substring(0, 32)}...`,
  )
  console.log(
    `  Signed Properties Digest: ${result.signatureAnalysis.signedPropertiesDigest.substring(0, 32)}...`,
  )

  if (result.signatureAnalysis.issues.length > 0) {
    console.log('\n  🚨 Signature Issues:')
    result.signatureAnalysis.issues.forEach((issue, index) => {
      console.log(`    ${index + 1}. ${issue}`)
    })
  }

  if (result.signatureAnalysis.recommendations.length > 0) {
    console.log('\n  💡 Signature Recommendations:')
    result.signatureAnalysis.recommendations.forEach((rec, index) => {
      console.log(`    ${index + 1}. ${rec}`)
    })
  }

  // Summary
  console.log('\n📊 SUMMARY')
  console.log('-'.repeat(30))
  console.log(`  Total Issues Found: ${result.summary.totalIssues}`)
  console.log(`  Certificate Issues: ${result.summary.certificateIssues}`)
  console.log(`  Signature Issues: ${result.summary.signatureIssues}`)

  if (result.summary.totalIssues === 0) {
    console.log('\n  ✅ No issues detected in current analysis')
    console.log('  🎉 Certificate and signature implementation appear valid')
  } else {
    console.log('\n  ⚠️  Issues detected - review recommendations above')

    // Check for specific portal errors
    const hasDS311 = result.certificateAnalysis.issues.some(issue =>
      issue.includes('DS311'),
    )
    const hasDS312 = result.certificateAnalysis.issues.some(issue =>
      issue.includes('DS312'),
    )
    const hasDS326 = result.certificateAnalysis.issues.some(issue =>
      issue.includes('DS326'),
    )
    const hasDS329 = result.certificateAnalysis.issues.some(issue =>
      issue.includes('DS329'),
    )
    const hasDS333 = result.signatureAnalysis.issues.some(issue =>
      issue.includes('DS333'),
    )

    console.log('\n  🎯 MYINVOIS PORTAL ERROR ANALYSIS:')

    if (hasDS311) {
      console.log(
        '     ❌ DS311 - TIN mismatch between certificate and submitter',
      )
    }

    if (hasDS312) {
      console.log(
        '     ❌ DS312 - Registration number mismatch with certificate',
      )
    }

    if (hasDS326) {
      console.log('     ❌ DS326 - X509IssuerName format inconsistency')
    }

    if (hasDS329) {
      console.log('     ❌ DS329 - Certificate trust chain validation failure')
    }

    if (hasDS333) {
      console.log('     ❌ DS333 - Document signature validation failure')
    }

    if (result.summary.certificateIssues > 0) {
      console.log('\n  🚨 PRIMARY ACTION REQUIRED:')
      console.log('     Certificate issues must be resolved first')
      console.log(
        '     Self-generated certificates cannot pass MyInvois validation',
      )
    }

    if (result.summary.signatureIssues > 0) {
      console.log('\n  ⚙️  SECONDARY ACTION:')
      console.log('     Review and optimize signature implementation')
    }

    console.log('\n  📋 NEXT STEPS:')
    console.log('     1. Address BLOCKING/CRITICAL issues first')
    console.log('     2. Test with updated certificate/implementation')
    console.log('     3. Re-run diagnostics to verify fixes')
    console.log('     4. Submit test document to MyInvois portal')
  }

  console.log('\n' + '='.repeat(60))
}
