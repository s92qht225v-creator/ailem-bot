# Payme Payment Gateway Integration Guide

Complete guide to integrate Payme payment gateway into your Telegram Mini App.

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Registration](#registration)
3. [Configuration](#configuration)
4. [Integration Methods](#integration-methods)
5. [Testing](#testing)
6. [Production Setup](#production-setup)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### What is Payme?

Payme is Uzbekistan's leading payment gateway that supports:
- 💳 Uzcard, Humo cards
- 📱 Payme mobile app
- 🌐 Online payments
- 🔒 PCI DSS compliant

### Prerequisites

- [ ] Active business in Uzbekistan
- [ ] Legal entity (LLC, IP) or individual entrepreneur
- [ ] Tax identification number (INN/STIR)
- [ ] Bank account

---

## 📝 Registration

### Step 1: Register with Payme

1. **Visit Payme Business Portal**
   - Go to: https://business.paycom.uz
   - Or contact: support@paycom.uz

2. **Submit Required Documents**
   - Business registration certificate
   - Tax ID (STIR)
   - Bank account details
   - Director's passport copy
   - Application form

3. **Wait for Approval**
   - Review time: 1-3 business days
   - You'll receive:
     - Merchant ID
     - API credentials
     - Access to merchant dashboard

### Step 2: Get Your Credentials

After approval, you'll receive:

```
Merchant ID: 5f3e1234567890abcdef1234
Test Merchant ID: 5f3e1234567890abcdef5678
API Key: Your_Secret_API_Key
```

⚠️ **IMPORTANT**: Never expose API keys in frontend code!

---

## ⚙️ Configuration

### Add Environment Variables

**For Local Development** (`.env`):

```bash
# Payme Configuration
VITE_PAYME_MERCHANT_ID=5f3e1234567890abcdef1234
VITE_PAYME_TEST_MODE=true
VITE_APP_URL=http://localhost:3000

# DO NOT add API key here - use backend only
# PAYME_API_KEY=your_api_key (Backend only)
```

**For Production** (Vercel):

```bash
# Add to Vercel environment variables
vercel env add VITE_PAYME_MERCHANT_ID production
# Enter your merchant ID when prompted

vercel env add VITE_PAYME_TEST_MODE production
# Enter: false

# Redeploy
vercel --prod
```

---

## 🔧 Integration Methods

We've implemented 3 integration methods. Choose based on your needs:

### Method 1: Payment Link (Recommended for Telegram)

✅ **Best for Telegram Mini Apps**
✅ Simple, no backend required
✅ Keeps user in Telegram

**How it works:**
1. Generate payment link
2. Open in Telegram's in-app browser
3. User completes payment in Payme
4. Verify payment via webhook

**Example Usage:**

```javascript
import { openPaymeInTelegram } from './services/payme';

// In your PaymentPage component
const handlePayWithPayme = () => {
  openPaymeInTelegram({
    orderId: 'ORD-12345',
    amount: 100000, // 100,000 UZS
    description: 'Order #12345 - Home Textiles',
    onSuccess: (transaction) => {
      console.log('Payment successful!', transaction);
      // Update order status
    },
    onCancel: () => {
      console.log('Payment cancelled');
    }
  });
};
```

### Method 2: Payment Button Widget

✅ Embedded checkout
✅ Better UX
⚠️ Requires page reload to verify

**Example Usage:**

```javascript
import { initPaymeButton } from './services/payme';

useEffect(() => {
  initPaymeButton('payme-container', {
    orderId: 'ORD-12345',
    amount: 100000,
    account: {
      user_id: user.id
    },
    onSuccess: (transaction) => {
      // Payment completed
    }
  });
}, []);

// In JSX:
<div id="payme-container"></div>
```

### Method 3: Merchant API

✅ Full control
✅ Server-side verification
⚠️ Requires backend implementation

This method requires a backend server. See [Backend Setup](#backend-setup) below.

---

## 🧪 Testing

### Test Mode Setup

1. **Enable Test Mode**
   ```bash
   VITE_PAYME_TEST_MODE=true
   ```

2. **Use Test Cards**

   **Successful Payment:**
   ```
   Card: 8600 0000 0000 0000
   Expiry: 03/99
   SMS Code: 666666
   ```

   **Insufficient Funds:**
   ```
   Card: 8600 0000 0000 0001
   Expiry: 03/99
   SMS Code: 666666
   ```

3. **Test Payment Flow**
   ```bash
   npm run dev
   # Go to checkout
   # Click "Pay with Payme"
   # Use test card
   ```

### Verify Test Payments

Check payments in:
- Merchant dashboard: https://business.paycom.uz
- Or your admin panel after webhook setup

---

## 🏭 Production Setup

### Backend Implementation (REQUIRED)

For production, you MUST implement a backend to:
1. Handle Payme webhooks
2. Verify payments securely
3. Store API keys safely

**Simple Node.js Backend Example:**

```javascript
// backend/payme-webhook.js
const express = require('express');
const app = express();

// Payme webhook endpoint
app.post('/api/payme/webhook', async (req, res) => {
  const { method, params } = req.body;

  switch (method) {
    case 'CheckPerformTransaction':
      // Check if order exists
      const order = await getOrder(params.account.order_id);
      if (!order) {
        return res.json({
          error: { code: -31050, message: 'Order not found' }
        });
      }
      res.json({ result: { allow: true } });
      break;

    case 'CreateTransaction':
      // Create transaction record
      await createTransaction(params);
      res.json({
        result: {
          create_time: Date.now(),
          transaction: params.id,
          state: 1
        }
      });
      break;

    case 'PerformTransaction':
      // Complete payment
      await completeOrder(params.account.order_id);
      await updateTransaction(params.id, 'completed');
      res.json({
        result: {
          perform_time: Date.now(),
          transaction: params.id,
          state: 2
        }
      });
      break;

    case 'CancelTransaction':
      // Cancel transaction
      await cancelOrder(params.account.order_id);
      res.json({
        result: {
          cancel_time: Date.now(),
          transaction: params.id,
          state: -1
        }
      });
      break;

    default:
      res.json({
        error: { code: -32601, message: 'Method not found' }
      });
  }
});

app.listen(3001);
```

### Configure Webhook URL

1. **Contact Payme Support**
   - Email: support@paycom.uz
   - Phone: +998 71 200 7777

2. **Provide Webhook URL**
   ```
   https://your-domain.com/api/payme/webhook
   ```

3. **Verify Webhook**
   - Payme will send test requests
   - Make sure your server responds correctly

---

## 🔄 Payment Flow

### Complete Integration Flow:

```
1. Customer selects items → Checkout
                ↓
2. Click "Pay with Payme" button
                ↓
3. Generate payment link with order details
                ↓
4. Open Payme in Telegram browser
                ↓
5. Customer enters card details
                ↓
6. Payme processes payment
                ↓
7. Payme sends webhook to your backend
                ↓
8. Backend verifies and updates order
                ↓
9. Customer receives confirmation
                ↓
10. Admin receives notification
```

---

## 📱 Update Your PaymentPage

Replace screenshot upload with Payme:

```javascript
// In PaymentPage.jsx
import { openPaymeInTelegram } from '../services/payme';

const handlePayWithPayme = () => {
  openPaymeInTelegram({
    orderId: generateOrderNumber(),
    amount: checkoutData.total,
    description: `Order - ${cartItems.length} items`,
    account: {
      user_id: user.id,
      order_id: orderId
    },
    onSuccess: async (transaction) => {
      // Save order
      await addOrder(orderData);
      // Send notifications
      await notifyAdminNewOrder(orderData);
      // Navigate to success page
      onNavigate('orderConfirmation', { orderId });
    }
  });
};
```

---

## 🛠️ Troubleshooting

### Common Issues

**1. "Merchant ID not configured"**
```bash
# Add to .env
VITE_PAYME_MERCHANT_ID=your_merchant_id

# Restart dev server
npm run dev
```

**2. Payment not opening in Telegram**
```javascript
// Make sure Telegram WebApp is initialized
import { initTelegramWebApp } from './utils/telegram';

useEffect(() => {
  initTelegramWebApp();
}, []);
```

**3. Webhook not receiving events**
- Check webhook URL is publicly accessible
- Verify URL with Payme support
- Check server logs for errors
- Test with Payme's test environment

**4. Payment verification failing**
- Implement proper webhook handlers
- Return correct response format
- Check transaction status in dashboard

---

## 📊 Transaction States

| State | Code | Description |
|-------|------|-------------|
| Pending | 1 | Transaction created, waiting for completion |
| Completed | 2 | Payment successful |
| Cancelled | -1 | Transaction cancelled |
| Cancelled after success | -2 | Completed but later cancelled (refund) |

---

## 💰 Fees

Payme charges:
- **2.5%** per transaction
- No monthly fees
- No setup fees

Example:
```
Sale: 100,000 UZS
Payme fee: 2,500 UZS (2.5%)
You receive: 97,500 UZS
```

---

## 📞 Support

### Payme Support

- **Email**: support@paycom.uz
- **Phone**: +998 71 200 7777
- **Telegram**: @paycomsupport
- **Dashboard**: https://business.paycom.uz

### Business Hours

- Monday - Friday: 9:00 - 18:00
- Saturday: 9:00 - 13:00
- Sunday: Closed

---

## 📚 Additional Resources

- **Payme Documentation**: https://developer.help.paycom.uz
- **Merchant API**: https://developer.help.paycom.uz/protokol-merchant-api
- **Test Environment**: https://checkout.test.paycom.uz
- **Business Portal**: https://business.paycom.uz

---

## ✅ Production Checklist

Before going live:

- [ ] Received Merchant ID from Payme
- [ ] Tested payment flow with test cards
- [ ] Implemented backend webhook handler
- [ ] Configured webhook URL with Payme
- [ ] Verified webhook is working
- [ ] Tested with small real payment
- [ ] Set `VITE_PAYME_TEST_MODE=false`
- [ ] Updated environment variables on Vercel
- [ ] Tested live payment end-to-end
- [ ] Set up payment notifications
- [ ] Trained staff on handling payments
- [ ] Added refund process documentation

---

## 🚀 Quick Start Summary

**For immediate testing without backend:**

1. **Get Test Merchant ID** from Payme
2. **Add to .env**:
   ```bash
   VITE_PAYME_MERCHANT_ID=your_test_merchant_id
   VITE_PAYME_TEST_MODE=true
   ```
3. **Update PaymentPage** to use Payme
4. **Test with test card**: 8600 0000 0000 0000
5. **For production**: Implement backend webhook handler

---

## 🎯 Next Steps

After Payme integration:

1. **Click Integration** - Add Click payment option
2. **Uzum Integration** - Add Uzum Nasiya (installments)
3. **Multi-payment** - Allow customers to choose payment method
4. **Refunds** - Implement refund process
5. **Analytics** - Track payment success rates

---

**Need help with integration? Contact me or Payme support!** 🚀
