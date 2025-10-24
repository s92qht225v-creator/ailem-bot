#!/bin/bash

# Test Payme Basic Auth
# This will call your webhook to verify authentication works

MERCHANT_ID="68ad7cf18f3347fe865948ca"
PROD_PASSWORD="TvFVFe5n%c5bTdwNZtf?MfXmmKJKADMxkc?4"
WEBHOOK_URL="https://www.ailem.uz/api/payme-webhook"

# Create Basic Auth header: base64(Paycom:password)
AUTH_STRING="Paycom:${PROD_PASSWORD}"
AUTH_HEADER=$(echo -n "$AUTH_STRING" | base64)

echo "Testing Payme Basic Auth..."
echo "Merchant ID: $MERCHANT_ID"
echo "Auth String: $AUTH_STRING"
echo "Base64 Auth: $AUTH_HEADER"
echo ""
echo "Calling webhook with CheckPerformTransaction..."
echo ""

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $AUTH_HEADER" \
  -d '{
    "id": 1,
    "method": "CheckPerformTransaction",
    "params": {
      "amount": 100000,
      "account": {
        "order_id": "test123"
      }
    }
  }' | jq '.'

echo ""
echo ""
echo "If you see error -32504: Authentication failed"
echo "If you see error -31050: Auth OK, but order not found (expected)"
echo "If you see {\"allow\": true}: Auth OK and order exists"
