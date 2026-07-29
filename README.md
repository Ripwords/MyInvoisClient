# MyInvois Client

A comprehensive Node.js client for Malaysia's MyInvois e-invoicing system with full digital signature support.

## Installation

```bash
bun install
```

## Environment Variables

Create a `.env` file in the project root with your MyInvois credentials:

```bash
# MyInvois API Credentials (from MyInvois portal)
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here

# Your Certificate and Private Key (PEM format)
TEST_CERTIFICATE="-----BEGIN CERTIFICATE-----
your_certificate_content_here
-----END CERTIFICATE-----"

TEST_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
your_private_key_content_here
-----END PRIVATE KEY-----"

# Your MyInvois TIN (Tax Identification Number)
TIN_VALUE=IG12345678901

# Your NRIC/Business Registration Number
NRIC_VALUE=123456789012

# Additional test TINs for comprehensive testing
TEST_TIN_1=C12345678901
TEST_TIN_2=C98765432109
TEST_TIN_3=IG98765432109

# Test buyer information
BUYER_TIN_VALUE=IG00000000000
BUYER_NRIC_VALUE=000000000000
```

⚠️ **Important**: Never commit your actual TIN, NRIC, certificates, or API credentials to version control.

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
- `YOUR_TIN`: `IG12345678901` (MyInvois TIN)
- `YOUR_DOMAIN`: `mycompany.com`

## Rate Limiting

The client includes a built-in, per-`clientId` request queue that proactively
keeps each API category within the MyInvois-documented limits (e.g. submit
documents 100/min, get submission 300/min, cancel/reject 12/min). Requests that
would exceed a category's limit are queued and released as the sliding window
frees up — you can fire calls freely and the queue paces them.

### Known limitations

These are intentional trade-offs for a dependency-free, in-process limiter.
Plan around them for production deployments:

- **In-process only.** Limits are tracked in memory per Node.js process. If you
  run multiple instances/workers (clustered NestJS, PM2 cluster, serverless,
  multiple pods), each process tracks its own counts, so the *combined* traffic
  can exceed the MyInvois limit. For horizontally-scaled deployments, throttle
  upstream or route MyInvois calls through a single worker.
- **Bursts within the cap.** The limiter allows up to `max` requests in the same
  instant (as long as the 60s window allows it). This is within the documented
  limit, but if you observe `429`s under heavy concurrency, reduce upstream
  concurrency.
- **No automatic `429` / `Retry-After` back-off.** The limiter is proactive
  only; it does not currently inspect rate-limit response headers and retry.
- **Login is not queued.** Token requests (`/connect/token`) bypass the queue.
  Cache and reuse the client so token refreshes stay infrequent.

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

## License

MIT — see [LICENSE](LICENSE).
