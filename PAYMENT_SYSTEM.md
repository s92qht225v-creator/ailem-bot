# Payment System Documentation

Complete documentation for Ailem's payment system including Payme and Click.uz integrations, stock management, and bonus points system.

**Last Updated:** January 2, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Payment Gateways](#payment-gateways)
3. [Payment Flow](#payment-flow)
4. [Stock Management](#stock-management)
5. [Bonus Points System](#bonus-points-system)
6. [Webhook Implementation](#webhook-implementation)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Configuration](#configuration)

---

## Overview

Ailem uses two payment gateways for the Uzbekistan market:

- **Payme** (primary) - Supports Uzcard, Humo, Visa/Mastercard
- **Click** (alternative) - Supports Uzcard, Humo, Visa/Mastercard

Both gateways integrate via webhooks for automatic order approval, stock deduction, and bonus point awarding.

### Key Features

✅ Automatic order approval via webhooks  
✅ Real-time stock deduction (supports variants)  
✅ Automatic bonus points awarding (3% default)  
✅ Bonus points usage with proper accounting  
✅ Telegram notifications on payment success/failure  
✅ Test mode support for development  

---

## Payment Gateways

### Payme Integration

**Files:**
- Frontend: `src/services/payme.js`
- Webhook: `api/payme-webhook.js`

**Configuration:**
```env
VITE_PAYME_MERCHANT_ID=68ad7cf18f3347fe865948ca
VITE_PAYME_TEST_MODE=true
PAYME_KEY=ojWN@Ua290xxu%u0cdGP5U9JA?rMr&2b#oN3  # Test key
```

**Important:**
- Amount is sent in **tiyin** (1 UZS = 100 tiyin)
- Uses base64-encoded parameters in URL
- Webhook URL: `https://www.ailem.uz/api/payme-webhook`

**Test Card:**
```
Card: 8600 0000 0000 0000
Expiry: 03/99
SMS Code: 666666
```

### Click Integration

**Files:**
- Frontend: `src/services/click.js`
- Webhook: `api/click-webhook.js`

**Configuration:**
```env
VITE_CLICK_MERCHANT_ID=your_merchant_id
VITE_CLICK_SERVICE_ID=your_service_id
VITE_CLICK_TEST_MODE=false
CLICK_SERVICE_ID=your_service_id  # Backend only
CLICK_SECRET_KEY=your_secret_key  # Backend only
```

**Important:**
- Amount is sent in **UZS** (not tiyin)
- Uses query parameters (not base64)
- Two-phase protocol: PREPARE → COMPLETE
- Webhook URL: `https://www.ailem.uz/api/click-webhook`
- **3-second timeout** - webhook must respond quickly

**Test Card:**
```
Card: 8600 1234 5678 9012
Expiry: 03/99
SMS Code: 666666
```

---

## Payment Flow

### User Journey

```
1. User adds items to cart
2. User proceeds to checkout
3. User selects payment method (Payme or Click)
4. [Optional] User applies bonus points for discount
5. Order created with status='pending'
6. User bonus points deducted (if used)
7. Payment link generated
8. User redirected to payment gateway
9. User completes payment
10. Webhook receives notification
11. Order status updated to 'approved'
12. Stock deducted automatically
13. Bonus points awarded (3% of paid amount)
14. User receives Telegram notification
```

### Order Creation Flow

**Location:** `src/components/pages/PaymentPage.jsx`

```javascript
// Generate unique order IDs
const orderId = generateOrderNumber();  // ORD-{timestamp}-{random}
const clickOrderId = `${Date.now()}`;   // Click uses timestamp
const paymeOrderId = `${Date.now()}${Math.random()...}`;  // Payme uses numeric

// Create order object
const order = {
  id: orderId,                           // Display ID
  clickOrderId: clickOrderId,            // For Click webhook lookup
  paymeOrderId: paymeOrderId,            // For Payme webhook lookup
  userId: user.id,
  userTelegramId: user.telegramId,
  items: cartItems.map(item => ({
    productId: item.id,                  // ⚠️ Important: uses 'productId'
    productName: item.name,
    price: item.price,
    quantity: item.quantity,
    color: item.selectedColor,           // ⚠️ Important: uses 'color'
    size: item.selectedSize,             // ⚠️ Important: uses 'size'
    image: item.image
  })),
  subtotal: checkoutData.subtotal,       // Before discount
  bonusDiscount: checkoutData.bonusDiscount,
  bonusPointsUsed: checkoutData.bonusPointsUsed,
  deliveryFee: checkoutData.deliveryFee,
  total: checkoutData.total,             // After all discounts
  status: 'pending',
  paymentMethod: 'click' // or 'payme'
};
```

**Critical Field Names:**
- Items use `productId` (not `id`)
- Items use `color` and `size` (not `selectedColor`/`selectedSize`)
- Both field name formats are supported in webhooks

### Database Schema

**Orders Table:**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  user_telegram_id TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC(10,2),
  bonus_discount NUMERIC(10,2) DEFAULT 0,
  bonus_points_used INTEGER DEFAULT 0,
  delivery_fee NUMERIC(10,2),
  total NUMERIC(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'shipped', 'delivered', 'rejected')),
  payme_order_id TEXT,
  payme_transaction_id TEXT,
  payme_transaction_time BIGINT,
  click_order_id TEXT,
  click_trans_id TEXT,
  click_complete_time BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Stock Management

### How It Works

Stock is automatically deducted when orders are approved via payment webhooks.

**Supports Two Stock Models:**

1. **Regular Stock** - Single stock number for simple products
2. **Variant Stock** - Individual stock per color+size combination

### Variant Stock Example

```json
{
  "name": "Bedsheet",
  "stock": 10,  // ⚠️ Ignored when variants exist
  "variants": [
    { "color": "White", "size": "Twin", "stock": 5 },
    { "color": "White", "size": "Queen", "stock": 3 },
    { "color": "Blue", "size": "Twin", "stock": 2 }
  ]
}
```

### Stock Deduction Logic

**Location:** `api/payme-webhook.js` and `api/click-webhook.js`

```javascript
async function deductStock(order) {
  for (const item of order.items) {
    // Support both 'id' and 'productId' field names
    const productId = item.id || item.productId;
    
    // Fetch product from database
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    // Support both field name formats
    const itemColor = item.color || item.selectedColor;
    const itemSize = item.size || item.selectedSize;
    
    // Check if product uses variant tracking
    if (product.variants?.length > 0 && itemColor && itemSize) {
      // VARIANT STOCK: Deduct from specific variant
      const updatedVariants = product.variants.map(v => {
        if (v.color?.toLowerCase() === itemColor.toLowerCase() &&
            v.size?.toLowerCase() === itemSize.toLowerCase()) {
          return { ...v, stock: Math.max(0, (v.stock || 0) - item.quantity) };
        }
        return v;
      });
      
      await supabase
        .from('products')
        .update({ variants: updatedVariants })
        .eq('id', product.id);
        
    } else {
      // REGULAR STOCK: Deduct from product.stock field
      const newStock = Math.max(0, (product.stock || 0) - item.quantity);
      
      await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', product.id);
    }
  }
}
```

### Admin Panel Stock Deduction

When admin manually approves orders, stock is also deducted:

**Location:** `src/context/AdminContext.jsx`

```javascript
const approveOrder = async (orderId) => {
  await updateOrderStatus(orderId, 'approved');
  
  // Deduct stock for each item
  for (const item of order.items) {
    const product = products.find(p => p.id === item.id);
    
    if (product.variants?.length > 0) {
      // Deduct variant stock using helper function
      const updatedVariants = decreaseVariantStock(
        product.variants,
        item.selectedColor,
        item.selectedSize,
        item.quantity
      );
      await updateProduct(product.id, { variants: updatedVariants });
    } else {
      // Deduct regular stock
      const newStock = Math.max(0, (product.stock || 0) - item.quantity);
      await updateProduct(product.id, { stock: newStock });
    }
  }
};
```

### Stock Display

Admin panel and product page both show **total variant stock** when variants exist:

```javascript
// In ProductDetails.jsx and DesktopAdminPanel.jsx
const displayStock = product.variants?.length > 0
  ? getTotalVariantStock(product.variants)  // Sum all variant stocks
  : (product.stock || 0);                   // Use regular stock
```

---

## Bonus Points System

### Configuration

```javascript
// Default: 3% of order total
const purchaseBonusPercentage = 3;

// Point value: 1 point = 1 UZS
const pointValue = 1;

// Max usage: 20% of order can be paid with points
const maxBonusUsage = orderTotal * 0.2;
```

### Earning Points

Users earn **3% of the amount they actually pay** (after bonus discount):

```javascript
// Example calculation
Order subtotal: 1000 UZS
Bonus used: 30 points (30 UZS discount)
Total paid: 970 UZS
Bonus earned: 970 × 3% = 29 points

Net result: -30 + 29 = -1 point
```

### Award Bonus Points Logic

**Location:** `api/payme-webhook.js` and `api/click-webhook.js`

```javascript
async function awardBonusPoints(order) {
  const userId = order.user_id || order.userId;
  
  // Fetch bonus configuration (default 3%)
  let purchaseBonusPercentage = 3;
  const { data: settings } = await supabase
    .from('app_settings')
    .select('bonus_config')
    .eq('id', 1)
    .single();
  
  if (settings?.bonus_config?.purchaseBonus) {
    purchaseBonusPercentage = settings.bonus_config.purchaseBonus;
  }
  
  // Calculate bonus on TOTAL (after discount)
  const purchaseBonusPoints = Math.round((order.total * purchaseBonusPercentage) / 100);
  
  // Get current user bonus points
  const { data: user } = await supabase
    .from('users')
    .select('bonus_points')
    .eq('id', userId)
    .single();
  
  const currentBonus = user.bonus_points || 0;
  const newBonusPoints = currentBonus + purchaseBonusPoints;
  
  // Update user bonus points
  await supabase
    .from('users')
    .update({ bonus_points: newBonusPoints })
    .eq('id', userId);
  
  console.log(`✅ Awarded ${purchaseBonusPoints} points (${currentBonus} → ${newBonusPoints})`);
}
```

### Using Bonus Points

**Location:** `src/components/pages/CheckoutPage.jsx`

```javascript
// User selects how many points to use
const bonusPointsToUse = Math.min(
  userBonusPoints,
  calculateMaxBonusUsage(orderTotal)  // Max 20% of order
);

// Calculate discount
const bonusDiscount = bonusPointsToUse * 1;  // 1 point = 1 UZS

// Points are deducted BEFORE payment
await updateBonusPoints(-bonusPointsToUse);

// If payment fails, points are NOT refunded automatically
// Admin must manually refund in case of payment failure
```

### Referral Bonuses

Users also earn commissions on orders placed by their referrals:

```javascript
// Default: 10% commission on referee orders
const referralCommission = refereeOrder.total * 0.10;
```

---

## Webhook Implementation

### Architecture

Both webhooks follow the same pattern:

```
1. Verify authentication/service ID
2. Find order in database
3. Update order status to 'approved'
4. ⚠️ CRITICAL: Deduct stock BEFORE sending response
5. ⚠️ CRITICAL: Award bonus points BEFORE sending response
6. Send success response to payment gateway
```

**Why Before Response?**

Vercel serverless functions **terminate immediately** after sending the response. Any async operations after `res.json()` will NOT execute.

### Payme Webhook

**Endpoint:** `POST /api/payme-webhook`

**Protocol:** JSON-RPC 2.0

**Methods:**
- `CheckPerformTransaction` - Validate order exists and amount matches
- `CreateTransaction` - Create transaction record
- `PerformTransaction` - Complete payment and approve order
- `CancelTransaction` - Cancel/refund payment
- `CheckTransaction` - Check transaction status

**Key Implementation:**

```javascript
// api/payme-webhook.js
async function performTransaction(params, res, requestId) {
  const { id } = params;
  
  // Find order by transaction ID
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('payme_transaction_id', id)
    .single();
  
  // Update order status
  await supabase
    .from('orders')
    .update({
      status: 'approved',
      payme_perform_time: Date.now(),
      payme_state: 2
    })
    .eq('payme_transaction_id', id);
  
  // ⚠️ CRITICAL: Do these BEFORE sending response
  try {
    await deductStock(order);
    console.log('✅ Stock deducted');
  } catch (error) {
    console.error('❌ Stock deduction failed:', error);
  }
  
  try {
    await awardBonusPoints(order);
    console.log('✅ Bonus points awarded');
  } catch (error) {
    console.error('❌ Bonus award failed:', error);
  }
  
  // Send notification (fire-and-forget)
  sendTelegramNotification(order, 'approved').catch(err => {
    console.error('❌ Notification failed:', err);
  });
  
  // Finally, send response to Payme
  return res.json({
    jsonrpc: '2.0',
    id: requestId,
    result: {
      transaction: id,
      perform_time: Date.now(),
      state: 2
    }
  });
}
```

**Authentication:**

```javascript
// Payme sends: Authorization: Basic base64(Paycom:KEY)
const authHeader = req.headers.authorization;
const expectedAuth = `Basic ${Buffer.from(`Paycom:${PAYME_KEY}`).toString('base64')}`;

if (authHeader !== expectedAuth) {
  return res.json({
    jsonrpc: '2.0',
    id: req.body?.id,
    error: { code: -32504, message: 'Insufficient privileges' }
  });
}
```

### Click Webhook

**Endpoint:** `POST /api/click-webhook`

**Protocol:** Two-phase (PREPARE → COMPLETE)

**Methods:**
- `prepare` - Validate order and amount
- `complete` - Finalize payment and approve order

**Key Implementation:**

```javascript
// api/click-webhook.js
async function handleComplete(params, res) {
  const { click_trans_id, merchant_trans_id, merchant_prepare_id, error: click_error } = params;
  
  // Fetch order FIRST (need items for stock deduction)
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('click_order_id', merchant_trans_id)
    .single();
  
  const isApproved = !click_error || click_error >= 0;
  
  // Update order status
  await supabase
    .from('orders')
    .update({
      status: isApproved ? 'approved' : 'rejected',
      click_trans_id,
      click_complete_time: Date.now(),
      click_error: click_error || null
    })
    .eq('click_order_id', merchant_trans_id);
  
  // ⚠️ CRITICAL: Do these BEFORE sending response
  if (isApproved) {
    try {
      await deductStock(order);
      console.log('✅ Stock deducted');
    } catch (error) {
      console.error('❌ Stock deduction failed:', error);
    }
    
    try {
      await awardBonusPoints(order);
      console.log('✅ Bonus points awarded');
    } catch (error) {
      console.error('❌ Bonus award failed:', error);
    }
  }
  
  // Send response to Click (must be fast - 3 second timeout!)
  return res.json({
    click_trans_id,
    merchant_trans_id,
    merchant_confirm_id: Date.now(),
    merchant_prepare_id: merchant_prepare_id || 0,
    error: 0,
    error_note: 'Success'
  });
}
```

**Service ID Verification:**

```javascript
// Click sends service_id in request body
if (service_id.toString() !== CLICK_SERVICE_ID) {
  return res.json({
    error: -5,
    error_note: 'Service ID is invalid'
  });
}
```

### Error Handling

Both webhooks use try-catch blocks for stock and bonus operations:

```javascript
try {
  await deductStock(order);
} catch (error) {
  console.error('❌ Failed:', error);
  // ⚠️ Continue anyway - don't fail the payment
  // Admin can manually adjust stock if needed
}
```

**Philosophy:** Payment success is more important than stock/bonus operations. If those fail, log the error but complete the payment. Admin can fix data issues later.

---

## Testing

### Manual Testing with Scripts

**Check Click Orders:**
```bash
node scripts/check-click-orders.js
```

**Check Specific Order Details:**
```bash
node scripts/check-specific-click-order.js
```

**Test Stock Deduction Logic:**
```bash
node scripts/test-stock-deduction.js
```

**Check Bonus Award (from earlier session):**
```bash
node scripts/check-bonus.js
```

### Test Payment Flow

1. **Add test product to cart**
2. **Proceed to checkout**
3. **Apply bonus points** (if you have any)
4. **Select payment method** (Payme or Click)
5. **Use test card:**
   - Payme: `8600 0000 0000 0000`, exp `03/99`, SMS `666666`
   - Click: `8600 1234 5678 9012`, exp `03/99`, SMS `666666`
6. **Complete payment**
7. **Verify:**
   - Order status changed to 'approved'
   - Stock deducted correctly
   - Bonus points awarded (3% of paid amount)
   - Telegram notification received

### Debugging

**Enable verbose logging in webhooks:**

```javascript
console.log('📥 Webhook received:', req.body);
console.log('🔍 Order found:', order);
console.log('📦 Deducting stock for items:', order.items);
console.log('💰 Awarding bonus:', purchaseBonusPoints);
```

**Check Vercel logs:**
```bash
vercel logs --follow
```

**Common issues:**
- Stock not deducting → Check item field names (`productId` vs `id`)
- Bonus not awarded → Check `user_id` exists in order
- Click showing "processing" → Webhook taking >3 seconds to respond

---

## Troubleshooting

### Stock Not Deducting

**Symptoms:** Order approved but product stock unchanged

**Causes:**
1. Item field names mismatch (`id` vs `productId`)
2. Variant field names mismatch (`color` vs `selectedColor`)
3. Async operations after response (serverless issue)
4. Product ID not found in database

**Solution:**
- ✅ Webhooks now support both field name formats
- ✅ Stock deduction happens BEFORE response
- Run `node scripts/test-stock-deduction.js` to test logic

### Bonus Points Not Awarded

**Symptoms:** Payment successful but no bonus points added

**Causes:**
1. Missing `user_id` in order
2. User not found in database
3. Async operations after response (serverless issue)
4. app_settings table missing bonus_config

**Solution:**
- ✅ Bonus awarding happens BEFORE response
- ✅ Defaults to 3% if settings not found
- Check `order.user_id` exists and matches user UUID

### Click Shows "Processing"

**Symptoms:** Payment successful in database but Click app shows "processing"

**Causes:**
1. Webhook response too slow (>3 seconds)
2. Missing required response fields
3. Service ID mismatch

**Solution:**
- ✅ Stock/bonus now done quickly (~500ms)
- ✅ All required fields included in response
- Verify `CLICK_SERVICE_ID` environment variable

### Payme Returns Error -32504

**Symptoms:** Payme rejects webhook requests

**Cause:** Authentication failure

**Solution:**
```javascript
// Check environment variables
PAYME_KEY=your_key_here

// Verify auth header format
Authorization: Basic base64(Paycom:KEY)
```

---

## Configuration

### Environment Variables

**Required for Production:**

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Telegram Bot
VITE_TELEGRAM_BOT_TOKEN=your_bot_token

# Payme (Primary Payment)
VITE_PAYME_MERCHANT_ID=your_merchant_id
VITE_PAYME_TEST_MODE=false  # Set to false for production
PAYME_KEY=your_production_key

# Click (Alternative Payment)
VITE_CLICK_MERCHANT_ID=your_merchant_id
VITE_CLICK_SERVICE_ID=your_service_id
VITE_CLICK_TEST_MODE=false
CLICK_SERVICE_ID=your_service_id  # Backend only
CLICK_SECRET_KEY=your_secret_key  # Backend only

# App URL
VITE_APP_URL=https://www.ailem.uz
```

### Payment Gateway Configuration

**Payme Merchant Cabinet:**
1. Login to `test.paycom.uz` (test) or `paycom.uz` (production)
2. Set webhook URL: `https://www.ailem.uz/api/payme-webhook`
3. Generate merchant key
4. Test with provided test cards

**Click Merchant Cabinet:**
1. Login to Click merchant portal
2. Set webhook URL: `https://www.ailem.uz/api/click-webhook`
3. Configure service ID
4. Test with provided test cards

### Bonus Configuration

**Location:** Supabase `app_settings` table

```sql
-- Create settings if not exists
INSERT INTO app_settings (id, bonus_config) VALUES (
  1,
  '{"purchaseBonus": 3, "pointValue": 1, "maxUsagePercent": 20}'::jsonb
);

-- Update bonus percentage
UPDATE app_settings 
SET bonus_config = jsonb_set(
  bonus_config, 
  '{purchaseBonus}', 
  '5'  -- Change to 5%
)
WHERE id = 1;
```

**Fields:**
- `purchaseBonus`: Percentage of purchase amount awarded as points (default: 3)
- `pointValue`: Value of each point in UZS (default: 1)
- `maxUsagePercent`: Max percentage of order that can be paid with points (default: 20)

---

## Deployment Checklist

Before going to production:

- [ ] Set `VITE_PAYME_TEST_MODE=false`
- [ ] Set `VITE_CLICK_TEST_MODE=false`
- [ ] Update `PAYME_KEY` to production key
- [ ] Update `CLICK_SECRET_KEY` to production key
- [ ] Configure Payme webhook URL in merchant cabinet
- [ ] Configure Click webhook URL in merchant cabinet
- [ ] Test end-to-end payment flow
- [ ] Verify stock deduction works
- [ ] Verify bonus points are awarded
- [ ] Test bonus points usage
- [ ] Verify Telegram notifications work
- [ ] Monitor Vercel logs for errors

---

## Maintenance

### Regular Checks

**Daily:**
- Monitor failed payments (orders stuck in 'pending')
- Check for stock discrepancies
- Review bonus point balances

**Weekly:**
- Reconcile payment gateway transactions
- Verify stock accuracy vs database
- Check for orphaned orders

**Monthly:**
- Review bonus point economy
- Analyze payment success rates
- Update test cards if expired

### Database Queries

**Find pending orders older than 1 hour:**
```sql
SELECT * FROM orders 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '1 hour';
```

**Check total bonus points issued:**
```sql
SELECT SUM(bonus_points) as total_points FROM users;
```

**Find stock discrepancies:**
```sql
SELECT p.name, p.stock, 
  (SELECT SUM((v->>'stock')::int) 
   FROM jsonb_array_elements(p.variants) v) as variant_total
FROM products p
WHERE variants IS NOT NULL;
```

---

## API Reference

### Payme Webhook

**Endpoint:** `POST /api/payme-webhook`

**Request Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 123,
  "method": "PerformTransaction",
  "params": {
    "id": "transaction_id",
    "time": 1234567890
  }
}
```

**Response Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 123,
  "result": {
    "transaction": "transaction_id",
    "perform_time": 1234567890,
    "state": 2
  }
}
```

### Click Webhook

**Endpoint:** `POST /api/click-webhook`

**Request Format (COMPLETE):**
```json
{
  "method": "complete",
  "click_trans_id": "1234567890",
  "service_id": "your_service_id",
  "merchant_trans_id": "order_id",
  "amount": 1000,
  "error": 0
}
```

**Response Format:**
```json
{
  "click_trans_id": "1234567890",
  "merchant_trans_id": "order_id",
  "merchant_confirm_id": 1234567890,
  "error": 0,
  "error_note": "Success"
}
```

---

## Change Log

### January 2, 2025
- ✅ Fixed stock deduction not working (field name mismatch)
- ✅ Fixed bonus points not awarded (async timing issue)
- ✅ Moved operations BEFORE webhook response (Vercel serverless fix)
- ✅ Added support for both item field name formats
- ✅ Improved Click webhook response time (<500ms)
- ✅ Added diagnostic scripts for testing
- ✅ Verified bonus points work with discount usage

### October 24, 2024
- Initial Payme integration
- Initial Click integration
- Basic webhook implementation

---

## Support

For issues or questions:

1. Check [WARP.md](./WARP.md) for general development guidelines
2. Check Vercel logs for webhook errors
3. Use diagnostic scripts in `scripts/` folder
4. Review this documentation

**Diagnostic Scripts:**
- `scripts/check-click-orders.js` - List recent Click orders
- `scripts/check-specific-click-order.js` - Detailed order inspection
- `scripts/test-stock-deduction.js` - Test stock deduction logic
- `scripts/check-bonus.js` - Check and manually award bonus points

---

**End of Documentation**
