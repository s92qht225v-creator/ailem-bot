# Click.uz Payment Gateway Integration Guide

Complete guide to integrate Click payment gateway into your Telegram Mini App.

## ✅ Current Status

- ✅ Proxy server running at `159.65.128.207:3000`
- ✅ IP whitelisted by Click
- ✅ Prepare URL: `http://159.65.128.207:3000/click/prepare`
- ✅ Complete URL: `http://159.65.128.207:3000/click/complete`

## 🚀 Quick Setup

### Step 1: Add Click Fields to Database

Run this SQL in your Supabase SQL Editor:

```bash
# The SQL file has been created at:
./add-click-fields.sql
```

Or run directly:
```sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS click_order_id TEXT,
ADD COLUMN IF NOT EXISTS click_trans_id TEXT,
ADD COLUMN IF NOT EXISTS click_prepare_time BIGINT,
ADD COLUMN IF NOT EXISTS click_complete_time BIGINT,
ADD COLUMN IF NOT EXISTS click_error INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_click_order_id ON orders(click_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_click_trans_id ON orders(click_trans_id);
```

### Step 2: Get Click Credentials

Contact Click support or check your merchant cabinet:
- **Merchant ID**: Your Click merchant ID
- **Service ID**: Your Click service ID
- **Secret Key**: Your API secret key

### Step 3: Configure Environment Variables

**Local Development** (`.env`):
```bash
# Click Configuration
VITE_CLICK_MERCHANT_ID=your_merchant_id
VITE_CLICK_SERVICE_ID=your_service_id
VITE_CLICK_TEST_MODE=false  # true for test, false for production

# Backend only (for webhook)
CLICK_SERVICE_ID=your_service_id
CLICK_SECRET_KEY=your_secret_key
```

**Vercel Production**:
```bash
# Add environment variables
vercel env add VITE_CLICK_MERCHANT_ID production
# Enter your merchant ID

vercel env add VITE_CLICK_SERVICE_ID production
# Enter your service ID

vercel env add CLICK_SERVICE_ID production
# Enter your service ID

vercel env add CLICK_SECRET_KEY production
# Enter your secret key

# Deploy
vercel --prod
```

**Proxy Server** (on VPS `159.65.128.207`):
```bash
# SSH to your server
ssh root@159.65.128.207

# Edit environment
nano /var/www/click-proxy/.env
```

Add:
```env
CLICK_SERVICE_ID=your_service_id
CLICK_SECRET_KEY=your_secret_key
VERCEL_API_URL=https://www.ailem.uz/api/click-webhook
PORT=3000
```

Save and restart:
```bash
pm2 restart click-proxy
pm2 logs click-proxy  # Check logs
```

### Step 4: Configure Click Merchant Cabinet

1. Login to Click merchant cabinet: https://my.click.uz/
2. Go to **Settings** → **API Settings**
3. Configure webhook URLs:
   - **Prepare URL**: `http://159.65.128.207:3000/click/prepare`
   - **Complete URL**: `http://159.65.128.207:3000/click/complete`
4. Whitelist IP: `159.65.128.207` ✅ (Already done!)
5. Save settings

### Step 5: Test the Integration

1. Open your Telegram Mini App
2. Add items to cart
3. Go to checkout
4. Select "Pay with Click"
5. Complete payment with test card (if in test mode)

Test cards (if using test mode):
```
Card: 8600 1234 5678 9012
Expiry: 03/99
SMS Code: 666666
```

## 📊 How It Works

```
User Payment Flow:
1. User clicks "Pay with Click"
2. Frontend creates order in Supabase with click_order_id
3. Frontend redirects to Click.uz payment page
4. User enters card details and confirms
5. Click calls PREPARE webhook → Proxy → Vercel → Vercel responds
6. Click processes payment
7. Click calls COMPLETE webhook → Proxy → Vercel → Order approved
8. User redirected back to app
```

## 🔧 Architecture

```
┌─────────────┐
│   Customer  │
└──────┬──────┘
       │ 1. Initiate payment
       ▼
┌─────────────┐
│ Mini App    │
│ (Frontend)  │
└──────┬──────┘
       │ 2. Create order
       ▼
┌─────────────┐
│  Supabase   │
│  (Database) │
└─────────────┘
       │
       │ 3. Redirect to Click
       ▼
┌─────────────┐
│  Click.uz   │
│  (Gateway)  │
└──────┬──────┘
       │ 4. PREPARE webhook
       ▼
┌─────────────┐
│ VPS Proxy   │───► 5. Forward to Vercel
│ Static IP   │◄─── 6. Response
└──────┬──────┘
       │ 7. COMPLETE webhook
       ▼
┌─────────────┐
│   Vercel    │
│  (Webhook)  │───► 8. Update order
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Supabase   │
│  (Approved) │
└─────────────┘
```

## 📝 Files Created

- ✅ `/src/services/click.js` - Click service (payment link generation)
- ✅ `/api/click-webhook.js` - Vercel webhook handler
- ✅ `/add-click-fields.sql` - Database migration
- ✅ `/click-proxy/server.js` - Proxy server (already exists)
- ✅ `/click-proxy/README.md` - Proxy setup guide

## 🧪 Testing

### Test Proxy Server

```bash
# Check health
curl http://159.65.128.207:3000/health

# Should return:
{
  "status": "ok",
  "timestamp": "2024-...",
  "config": {
    "service_id": "12345",
    "vercel_url": "https://www.ailem.uz/api/click-webhook"
  }
}
```

### Test Payment Flow

1. Create a test order
2. Note the `click_order_id`
3. Make a test payment
4. Check Supabase:
   - Order status should change to `approved`
   - `click_trans_id` should be set
   - `click_complete_time` should be populated

### View Logs

**Proxy Server:**
```bash
ssh root@159.65.128.207
pm2 logs click-proxy
```

**Vercel:**
```bash
vercel logs --follow
```

## 🔒 Security

- ✅ Signature verification implemented (MD5 hash)
- ✅ Service ID validation
- ✅ Amount validation
- ✅ Double payment prevention
- ✅ Firewall configured on VPS

## 💰 Fees

Click.uz charges:
- **~2-3%** per transaction (varies by card type)
- No monthly fees
- No setup fees

Example:
```
Sale: 100,000 UZS
Click fee: ~2,500 UZS (2.5%)
You receive: ~97,500 UZS
```

## 🆘 Troubleshooting

### Payment not working

1. **Check proxy server is running:**
   ```bash
   ssh root@159.65.128.207
   pm2 status
   pm2 logs click-proxy
   ```

2. **Check Vercel webhook:**
   ```bash
   vercel logs
   # Look for Click webhook calls
   ```

3. **Verify environment variables:**
   ```bash
   # On Vercel
   vercel env ls production

   # On proxy
   ssh root@159.65.128.207
   cat /var/www/click-proxy/.env
   ```

### Proxy server not responding

```bash
ssh root@159.65.128.207
pm2 restart click-proxy
pm2 logs click-proxy
```

### Click webhook failing

Check these:
1. Proxy URL is correct in Click cabinet
2. IP `159.65.128.207` is whitelisted
3. Secret key matches in both proxy and Vercel
4. Service ID matches

### Order not found error

- Make sure `click_order_id` is saved when creating order
- Check Supabase logs for errors
- Verify order exists in database

## 📞 Support

### Click Support
- **Website**: https://click.uz
- **Email**: support@click.uz
- **Phone**: +998 78 150 01 02
- **Telegram**: @clickuz

### Proxy Server Issues
- Check VPS is running
- Restart with `pm2 restart click-proxy`
- View logs with `pm2 logs click-proxy`

## 📚 Official Documentation

- **Click API**: https://docs.click.uz/
- **Merchant Cabinet**: https://my.click.uz/
- **Integration Guide**: https://docs.click.uz/integration/

## ✅ Pre-Launch Checklist

Before going live:

- [ ] SQL migration run in Supabase
- [ ] Environment variables configured on Vercel
- [ ] Proxy server running and healthy
- [ ] Click merchant cabinet configured
- [ ] IP whitelisted (✅ Done!)
- [ ] Tested with small real payment
- [ ] Webhook URLs verified
- [ ] PaymentPage updated with Click option
- [ ] Tested full payment flow

## 🎯 Next Steps

1. Run the SQL migration (add-click-fields.sql)
2. Configure environment variables
3. Update PaymentPage to show Click option
4. Deploy to Vercel
5. Test with a small payment

---

**Your proxy is already set up! Just need to:**
1. Add database fields
2. Configure credentials
3. Deploy frontend code

🚀 Ready to go!
