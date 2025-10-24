#!/bin/bash

# Test Click webhook prepare request
# Replace with your actual Click order ID from the failed payment

CLICK_ORDER_ID="1761296460000"  # Update this with the actual timestamp from the order
AMOUNT="8000"  # Amount in UZS

echo "Testing Click Prepare webhook..."
echo "Order ID: $CLICK_ORDER_ID"
echo "Amount: $AMOUNT UZS"
echo ""

curl -X POST http://159.65.128.207:3000/click/prepare \
  -H "Content-Type: application/json" \
  -d "{
    \"click_trans_id\": \"12345\",
    \"service_id\": \"82210\",
    \"click_paydoc_id\": \"67890\",
    \"merchant_trans_id\": \"$CLICK_ORDER_ID\",
    \"amount\": \"$AMOUNT\",
    \"action\": \"0\",
    \"sign_time\": \"$(date +%s)\",
    \"sign_string\": \"test_signature\"
  }"

echo ""
echo ""
echo "If you see error -5 (Order not found), the order wasn't created in Supabase"
echo "Check Supabase orders table for click_order_id = $CLICK_ORDER_ID"
