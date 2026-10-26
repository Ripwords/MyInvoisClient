# Certificates

MyInvois signatures must be made with a certificate from an approved CA. The
official requirements live in the
[signature FAQ](https://sdk.myinvois.hasil.gov.my/signature/).

## Production certificates

Obtain official business certificates from MyInvois-approved Certificate
Authorities:

- **MSC Trustgate**: https://www.msctrustgate.com/
- **Digicert Sdn Bhd**
- **Cybersign Asia**

The certificate must include:

- `organizationIdentifier` field with your TIN
- `SERIALNUMBER` field with your business registration number
- the **Document Signing EKU** (`1.3.6.1.4.1.311.10.3.12`)
- issuance by a MyInvois-trusted CA

## Loading certificates

From a PKCS#12 bundle:

```typescript
const client = MyInvoisClient.fromP12(
  clientId, clientSecret, 'production',
  '/path/to/certificate.p12', // or a Buffer
  passphrase,
)
```

From PEM strings via `MyInvoisClient.create({ certificatePem, privateKeyPem, ... })`.
The constructor validates that the key pair matches and extracts the issuer
name and serial number used in the XAdES `KeyInfo`.

## Self-signed certificates for development

A self-signed certificate lets you exercise the full pipeline in the sandbox:
documents are accepted and pass all structural checks, failing only the
`Step08` certificate-validity validation (`DS304`/`DS329`). The repository
README documents the exact `openssl` commands, including the required
`SERIALNUMBER`, `organizationIdentifier` and Document Signing EKU fields.

::: warning
Never commit certificates, private keys or API credentials to version control.
:::
