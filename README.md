# MyInvois Client

A comprehensive Node.js client for Malaysia's MyInvois e-invoicing system with full digital signature support.

## Installation

```bash
bun install
```

## Testing

```bash
bun test
```

## Generating Test Certificates for Development

For testing purposes, you can generate self-signed certificates with MyInvois-required fields:

### 1. Create Certificate Configuration

Create `myinvois-cert.conf`:

```ini
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = MY
ST = YOUR_STATE
L = YOUR_CITY
O = YOUR_COMPANY_NAME
CN = YOUR_COMPANY_NAME
emailAddress = YOUR_EMAIL
serialNumber = YOUR_BUSINESS_REGISTRATION_NUMBER

[v3_req]
keyUsage = keyEncipherment, dataEncipherment, digitalSignature, nonRepudiation
extendedKeyUsage = clientAuth, emailProtection
subjectAltName = @alt_names

[alt_names]
email.1 = YOUR_EMAIL
DNS.1 = YOUR_DOMAIN
```

### 2. Generate Private Key

```bash
openssl genrsa -out myinvois-test-key.pem 2048
```

### 3. Generate Certificate with Required MyInvois Fields

```bash
# Basic certificate with SERIALNUMBER
openssl req -new -x509 -key myinvois-test-key.pem -out myinvois-test-cert.pem -days 365 -config myinvois-cert.conf

# Enhanced certificate with organizationIdentifier (OI) field for TIN
openssl req -new -x509 -key myinvois-test-key.pem -out myinvois-enhanced-cert.pem -days 365 \
  -subj "/C=MY/ST=YOUR_STATE/L=YOUR_CITY/O=YOUR_COMPANY_NAME/CN=YOUR_COMPANY_NAME/serialNumber=YOUR_BUSINESS_REG/2.5.4.97=YOUR_TIN/emailAddress=YOUR_EMAIL"
```

### 4. Verify Certificate Fields

```bash
# Check certificate details
openssl x509 -in myinvois-enhanced-cert.pem -text -noout | grep -A 2 -B 2 "Subject:"

# Should show both:
# serialNumber=YOUR_BUSINESS_REG
# organizationIdentifier=YOUR_TIN
```

## Example Values

Replace the placeholders with your actual values:

- `YOUR_STATE`: `Kuala Lumpur`
- `YOUR_CITY`: `Kuala Lumpur` 
- `YOUR_COMPANY_NAME`: `My Company Sdn Bhd`
- `YOUR_EMAIL`: `admin@mycompany.com`
- `YOUR_BUSINESS_REG`: `202301234567` (SSM registration)
- `YOUR_TIN`: `IG00000000000` (MyInvois TIN)
- `YOUR_DOMAIN`: `mycompany.com`

## Production Certificates

⚠️ **For production use, obtain official business certificates from MyInvois-approved Certificate Authorities:**

- **MSC Trustgate**: https://www.msctrustgate.com/
- **Digicert Sdn Bhd**
- **Cybersign Asia**

The certificate must include:
- `organizationIdentifier` field with your TIN
- `SERIALNUMBER` field with your business registration number
- Issued by a MyInvois-trusted CA

This project was created using `bun init` in bun v1.2.10. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
