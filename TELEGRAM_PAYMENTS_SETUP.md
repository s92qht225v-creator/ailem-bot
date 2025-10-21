# Telegram Payments Setup Guide (via BotFather)

Complete guide to set up payments in your Telegram Mini App using Telegram's built-in payment system with Payme (Paycom.Uz).

## 🎯 Why Use Telegram Payments?

✅ **Stays in Telegram** - Users never leave the app
✅ **Secure** - Telegram handles payment security
✅ **Simple** - No complex backend needed
✅ **Native UI** - Beautiful Telegram payment form
✅ **PCI Compliant** - Telegram is certified

---

## 📋 Step-by-Step Setup

### Step 1: Open BotFather

You've already done this! You're on the payment providers screen.

### Step 2: Select Paycom.Uz (Payme)

Click on **"🇺🇿 Paycom.Uz »"**

### Step 3: BotFather Will Ask for Credentials

You'll need to provide:

```
1. Merchant ID
2. Login (from Payme)
3. Test mode credentials (optional, for testing)
```

---

## 🔑 Getting Payme Credentials

### Option A: Test Mode (Quick Start)

For testing, you can use Payme's test environment:

1. **Contact Payme** and request test credentials:
   - Email: support@paycom.uz
   - Phone: +998 71 200 7777

2. **They'll provide**:
   - Test Merchant ID
   - Test Login credentials
   - Test password/token

3. **Enter in BotFather** when prompted

### Option B: Production Mode

For real payments:

1. **Register Your Business**
   - Visit: https://business.paycom.uz
   - Or call: +998 71 200 7777
   - Email: support@paycom.uz

2. **Required Documents**:
   - Business registration certificate
   - Tax ID (STIR/INN)
   - Bank details
   - Director's passport
   - Application form

3. **Receive Credentials** (1-3 days):
   - Merchant ID
   - Login credentials
   - API access

4. **Enter in BotFather**

---

## 💳 After Connecting in BotFather

Once you've connected Payme in BotFather, you'll receive:

```
✅ Payment provider connected!

Your bot can now accept payments via Payme.
```

---

## 🛠️ Update Your App Code

Now let's update your PaymentPage to use Telegram Payments:

### Replace Screenshot Upload with Telegram Payment

**File**: `src/components/pages/PaymentPage.jsx`

```javascript
import { payWithTelegram } from '../../services/telegramPayments';

// Replace the screenshot upload section with:
const handlePayWithTelegram = async () => {
  try {
    setUploading(true);

    // Create order data
    const orderData = {
      orderId: generateOrderNumber(),
      userId: user.id,
      items: cartItems,
      total: checkoutData.total,
      deliveryFee: checkoutData.deliveryFee || 0,
      bonusDiscount: checkoutData.bonusDiscount || 0,
      customerName: checkoutData.fullName,
      customerPhone: checkoutData.phone,
    };

    // Open Telegram payment
    const paymentResult = await payWithTelegram(orderData);

    if (paymentResult.success) {
      // Payment successful - create order
      await saveOrder(orderData);

      // Send notifications
      await notifyAdminNewOrder(orderData);
      await notifyUserNewOrder(orderData);

      // Navigate to success page
      onNavigate('orderConfirmation', { orderId: orderData.orderId });
    }
  } catch (error) {
    console.error('Payment failed:', error);
    alert(error.message || 'Payment failed. Please try again.');
  } finally {
    setUploading(false);
  }
};
```

### Update the Payment Button

```jsx
<button
  onClick={handlePayWithTelegram}
  disabled={uploading}
  className="w-full bg-accent text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
>
  {uploading ? (
    <div className="flex items-center justify-center gap-2">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
      Processing...
    </div>
  ) : (
    <div className="flex items-center justify-center gap-2">
      💳 Pay {formatPrice(checkoutData.total)} UZS
    </div>
  )}
</button>
```

---

## 📱 How It Works

### User Flow:

```
1. User completes checkout
          ↓
2. Clicks "Pay" button
          ↓
3. Telegram payment form opens IN Telegram
          ↓
4. User enters card details (handled by Telegram/Payme)
          ↓
5. Payment processed securely
          ↓
6. Success → Order confirmed
          ↓
7. User receives notification
          ↓
8. Admin receives notification
```

### What Telegram Handles:

✅ Card number collection
✅ CVV/Security code
✅ Payment processing
✅ PCI compliance
✅ 3D Secure authentication
✅ Receipt generation

### What You Handle:

✅ Order creation
✅ Inventory management
✅ Order fulfillment
✅ Customer notifications

---

## 🧪 Testing

### Test the Payment Flow

1. **Open your bot in Telegram**
2. **Go to checkout**
3. **Click Pay button**
4. **Telegram payment form will open**
5. **Use test card** (Payme will provide):
   ```
   Card: 8600 0000 0000 0000
   Expiry: 03/99
   CVV: 123
   SMS Code: 666666
   ```
6. **Complete payment**
7. **Check order was created**

### Verify in Payme Dashboard

- Login to https://business.paycom.uz
- Check "Transactions" section
- You should see your test payment

---

## 🔔 Handling Payment Notifications

### Telegram sends payment updates to your bot

You need to handle these in your bot code (not the Mini App):

```python
# Example bot handler (Python)
from telegram import Update
from telegram.ext import MessageHandler, filters

async def successful_payment(update: Update, context):
    payment = update.message.successful_payment

    # Extract order data
    payload = json.loads(payment.invoice_payload)
    order_id = payload['orderId']

    # Update order status in database
    await update_order_status(order_id, 'paid')

    # Send confirmation
    await update.message.reply_text(
        f"✅ Payment received!\n"
        f"Order #{order_id}\n"
        f"Amount: {payment.total_amount / 100} UZS"
    )

# Add handler
application.add_handler(
    MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment)
)
```

---

## 🛡️ Security

### Payment Security Features:

✅ **Card data never touches your servers**
✅ **Telegram handles all PCI compliance**
✅ **3D Secure authentication**
✅ **Encrypted communication**
✅ **Payme fraud detection**

### Best Practices:

1. **Verify payment on backend**
   - Don't trust client-side confirmation alone
   - Always verify via webhook/bot handler

2. **Use invoice payload wisely**
   - Store order ID and verification data
   - Keep it under 128 bytes

3. **Handle refunds properly**
   - Contact Payme for refund process
   - Update order status accordingly

---

## 💰 Fees

### Payme Transaction Fees:

- **2.5%** per transaction
- No setup fees
- No monthly fees
- No minimum transaction

**Example**:
```
Sale: 100,000 UZS
Payme fee: 2,500 UZS (2.5%)
You receive: 97,500 UZS
```

### Settlement:

- Payments settled to your bank account
- Usually within 1-2 business days
- Check Payme dashboard for details

---

## 🔧 Troubleshooting

### "Payment provider not connected"

**Solution**:
1. Go back to @BotFather
2. `/mybots` → Your bot → Payments
3. Make sure Paycom.Uz is connected
4. Restart your bot

### "Invoice opening failed"

**Solution**:
1. Check if you're in Telegram (not browser)
2. Make sure bot is started (`/start`)
3. Verify payment provider is active
4. Check console for errors

### "Payment declined"

**Solution**:
1. For test mode: Use correct test card
2. For production: Check with customer's bank
3. Verify sufficient funds
4. Check Payme dashboard for details

### "Webhook not receiving payments"

**Solution**:
1. Make sure bot handlers are set up
2. Check bot is running
3. Verify webhook URL in bot settings
4. Test with @userinfobot first

---

## 📊 Payment States

| State | Description | Action |
|-------|-------------|--------|
| `pending` | Payment initiated | Wait for completion |
| `paid` | Payment successful | Fulfill order |
| `cancelled` | User cancelled | Release inventory |
| `failed` | Payment failed | Notify customer |
| `refunded` | Payment refunded | Update order status |

---

## 🎯 Quick Setup Checklist

- [ ] Click "Paycom.Uz" in BotFather
- [ ] Enter Payme credentials
- [ ] Verify connection successful
- [ ] Update PaymentPage.jsx code
- [ ] Test with test card
- [ ] Verify order creation
- [ ] Test notifications
- [ ] Set up payment webhook handler
- [ ] Test full flow end-to-end
- [ ] Switch to production mode
- [ ] Test with real small payment
- [ ] Monitor Payme dashboard
- [ ] Ready for customers! 🎉

---

## 📞 Support

### Telegram Support

- **Bot issues**: @BotSupport
- **Payment issues**: Check BotFather docs

### Payme Support

- **Email**: support@paycom.uz
- **Phone**: +998 71 200 7777
- **Telegram**: @paycomsupport
- **Business hours**: Mon-Fri 9:00-18:00

---

## 🚀 Next Steps After Setup

1. **Test thoroughly** with test cards
2. **Switch to production** when ready
3. **Monitor first transactions**
4. **Add other payment methods** (Click, etc.)
5. **Implement refund process**
6. **Set up payment analytics**

---

## 💡 Pro Tips

1. **Always test in test mode first**
2. **Keep payment amounts in UZS** (no decimals)
3. **Use clear product descriptions** in invoice
4. **Handle all payment states** properly
5. **Set up proper error handling**
6. **Monitor Payme dashboard** regularly
7. **Respond to payment issues** quickly

---

## ✅ What You Get

After setup, your customers will:

- ✅ See a native Telegram payment form
- ✅ Enter card details securely in Telegram
- ✅ Complete payment without leaving Telegram
- ✅ Receive instant payment confirmation
- ✅ Get order confirmation notification
- ✅ Have payment protected by Telegram

**You'll have:**

- ✅ Secure payment processing
- ✅ No PCI compliance worries
- ✅ Simple integration
- ✅ Professional payment experience
- ✅ Direct settlement to bank account

---

**Ready to connect Payme? Follow the steps above and your payment system will be live!** 🚀

**Questions? Contact me or Payme support for help!**
