#!/bin/bash

# MyInvois Test Certificate Generator
# Generates self-signed certificates with required MyInvois fields for testing

set -e  # Exit on any error

echo "🔐 MyInvois Test Certificate Generator"
echo "======================================"
echo ""

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    echo "❌ Error: OpenSSL is not installed or not in PATH"
    echo "Please install OpenSSL first."
    exit 1
fi

echo "✅ OpenSSL found: $(openssl version)"
echo ""

# Get user input
echo "📝 Please provide your certificate details:"
echo ""

read -p "Company Name (e.g., 'My Company Sdn Bhd'): " COMPANY_NAME
read -p "State/Province (e.g., 'Kuala Lumpur'): " STATE
read -p "City (e.g., 'Kuala Lumpur'): " CITY
read -p "Email Address: " EMAIL
read -p "Domain (optional, e.g., 'mycompany.com'): " DOMAIN
read -p "Business Registration Number (e.g., '202301234567'): " BUSINESS_REG
read -p "MyInvois TIN (e.g., 'IG00000000000'): " TIN

echo ""

# Validate required fields
if [[ -z "$COMPANY_NAME" || -z "$STATE" || -z "$CITY" || -z "$EMAIL" || -z "$BUSINESS_REG" || -z "$TIN" ]]; then
    echo "❌ Error: All fields except domain are required"
    exit 1
fi

# Set default domain if not provided
if [[ -z "$DOMAIN" ]]; then
    DOMAIN="localhost"
fi

echo "📋 Certificate Details:"
echo "  Company: $COMPANY_NAME"
echo "  State: $STATE"
echo "  City: $CITY"
echo "  Email: $EMAIL"
echo "  Domain: $DOMAIN"
echo "  Business Reg: $BUSINESS_REG"
echo "  TIN: $TIN"
echo ""

read -p "Continue with these details? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled by user"
    exit 0
fi

echo ""
echo "🔧 Generating certificate files..."

# Create temporary config file
CONFIG_FILE="myinvois-cert-temp.conf"
cat > "$CONFIG_FILE" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = MY
ST = $STATE
L = $CITY
O = $COMPANY_NAME
CN = $COMPANY_NAME
emailAddress = $EMAIL
serialNumber = $BUSINESS_REG

[v3_req]
keyUsage = keyEncipherment, dataEncipherment, digitalSignature, nonRepudiation
extendedKeyUsage = clientAuth, emailProtection
subjectAltName = @alt_names

[alt_names]
email.1 = $EMAIL
DNS.1 = $DOMAIN
EOF

# Generate private key
echo "🔑 Generating private key..."
if openssl genrsa -out myinvois-test-key.pem 2048; then
    chmod 600 myinvois-test-key.pem
    echo "✅ Private key saved: myinvois-test-key.pem"
else
    echo "❌ Failed to generate private key"
    exit 1
fi

# Generate basic certificate
echo "📜 Generating basic certificate..."
if openssl req -new -x509 -key myinvois-test-key.pem -out myinvois-test-cert.pem -days 365 -config "$CONFIG_FILE"; then
    echo "✅ Basic certificate saved: myinvois-test-cert.pem"
else
    echo "❌ Failed to generate basic certificate"
    exit 1
fi

# Generate enhanced certificate with organizationIdentifier
echo "🚀 Generating enhanced certificate with organizationIdentifier..."
if openssl req -new -x509 -key myinvois-test-key.pem -out myinvois-enhanced-cert.pem -days 365 \
  -subj "/C=MY/ST=$STATE/L=$CITY/O=$COMPANY_NAME/CN=$COMPANY_NAME/serialNumber=$BUSINESS_REG/2.5.4.97=$TIN/emailAddress=$EMAIL"; then
    echo "✅ Enhanced certificate saved: myinvois-enhanced-cert.pem"
else
    echo "❌ Failed to generate enhanced certificate"
    exit 1
fi

# Clean up temporary config
rm "$CONFIG_FILE"

echo ""
echo "🔍 Verifying enhanced certificate..."

# Verify the enhanced certificate has required fields
if openssl x509 -in myinvois-enhanced-cert.pem -text -noout | grep -q "organizationIdentifier"; then
    echo "✅ organizationIdentifier field: Found"
else
    echo "❌ organizationIdentifier field: Missing"
fi

if openssl x509 -in myinvois-enhanced-cert.pem -text -noout | grep -q "serialNumber"; then
    echo "✅ SERIALNUMBER field: Found"
else
    echo "❌ SERIALNUMBER field: Missing"
fi

echo ""
echo "📋 Certificate subject:"
openssl x509 -in myinvois-enhanced-cert.pem -noout -subject | sed 's/subject=/  /'

echo ""
echo "🎉 Certificate generation complete!"
echo ""
echo "📁 Generated files:"
echo "  • myinvois-test-key.pem (private key - keep secure!)"
echo "  • myinvois-test-cert.pem (basic certificate)"
echo "  • myinvois-enhanced-cert.pem (with organizationIdentifier - recommended)"
echo ""
echo "💡 Next steps:"
echo "  1. Use 'myinvois-enhanced-cert.pem' for testing MyInvois integration"
echo "  2. Update your environment variables to use these files"
echo "  3. For production, obtain official certificate from MyInvois-approved CA"
echo ""
echo "⚠️  Note: These are self-signed certificates for testing only!"
echo "   They will resolve DS306, DS307, DS309 errors but not CA trust issues." 