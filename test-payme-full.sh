#!/bin/bash

echo "======================================"
echo "Payme Integration Diagnostic"
echo "======================================"
echo ""

MERCHANT_ID="68ad7cf18f3347fe865948ca"
PROD_PASSWORD="TvFVFe5n%c5bTdwNZtf?MfXmmKJKADMxkc?4"
TEST_PASSWORD="ojWN@Ua290xxu%u0cdGP5U9JA?rMr&2b#oN3"
WEBHOOK_URL="https://www.ailem.uz/api/payme-webhook"

echo "Configuration:"
echo "  Merchant ID: $MERCHANT_ID"
echo "  Webhook URL: $WEBHOOK_URL"
echo "  Prod Password: $PROD_PASSWORD"
echo "  Test Password: $TEST_PASSWORD"
echo ""

# Test 1: Webhook with production password
echo "======================================"
echo "Test 1: Webhook Auth (Production)"
echo "======================================"
AUTH_STRING="Paycom:${PROD_PASSWORD}"
AUTH_HEADER=$(echo -n "$AUTH_STRING" | base64)
echo "Base64: $AUTH_HEADER"
echo ""

RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $AUTH_HEADER" \
  -d '{
    "id": 1,
    "method": "CheckPerformTransaction",
    "params": {
      "amount": 100000,
      "account": {"order_id": "test123"}
    }
  }')

echo "Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "\-32504"; then
    echo "❌ FAIL: Authentication failed with production password"
    echo ""
    
    # Try with test password
    echo "======================================"
    echo "Test 2: Webhook Auth (Test)"
    echo "======================================"
    AUTH_STRING="Paycom:${TEST_PASSWORD}"
    AUTH_HEADER=$(echo -n "$AUTH_STRING" | base64)
    echo "Base64: $AUTH_HEADER"
    echo ""
    
    RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: Basic $AUTH_HEADER" \
      -d '{
        "id": 1,
        "method": "CheckPerformTransaction",
        "params": {
          "amount": 100000,
          "account": {"order_id": "test123"}
        }
      }')
    
    echo "Response: $RESPONSE"
    echo ""
    
    if echo "$RESPONSE" | grep -q "\-32504"; then
        echo "❌ FAIL: Authentication failed with test password too"
    elif echo "$RESPONSE" | grep -q "\-31050"; then
        echo "✅ SUCCESS: Authentication works with test password!"
        echo "⚠️  You need to use TEST mode, not production"
    else
        echo "✅ SUCCESS: Test password authentication works"
    fi
else
    echo "✅ SUCCESS: Production password authentication works"
fi

echo ""
echo "======================================"
echo "Test 3: Payment Link Generation"
echo "======================================"

# Generate test payment link
ORDER_ID="TEST$(date +%s)"
AMOUNT=1000
AMOUNT_TIYIN=$((AMOUNT * 100))

PARAMS="m=${MERCHANT_ID};ac.order_id=${ORDER_ID};a=${AMOUNT_TIYIN}"
PARAMS_BASE64=$(echo -n "$PARAMS" | base64)

CHECKOUT_URL_PROD="https://checkout.paycom.uz/${PARAMS_BASE64}"
CHECKOUT_URL_TEST="https://checkout.test.paycom.uz/${PARAMS_BASE64}"

echo "Production URL:"
echo "$CHECKOUT_URL_PROD"
echo ""
echo "Test URL:"
echo "$CHECKOUT_URL_TEST"
echo ""

echo "======================================"
echo "Summary & Recommendations"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Check which password works in webhook tests above"
echo "2. Try opening the payment URLs in a browser"
echo "3. Send the working configuration to Payme support"
echo ""
