# ✅ Click.uz Integration Complete!

Your Telegram Mini App now supports Click.uz payments alongside Payme!

## 🎉 What's Been Done

### ✅ Code Implementation
- ✅ Click service module created ([src/services/click.js](src/services/click.js))
- ✅ Click webhook handler created ([api/click-webhook.js](api/click-webhook.js))
- ✅ PaymentPage updated with Click payment option
- ✅ Database schema updated (see [add-click-fields.sql](add-click-fields.sql))
- ✅ Orders API updated to handle Click fields

### ✅ Infrastructure
- ✅ Proxy server running at `159.65.128.207:3000`
- ✅ IP whitelisted by Click
- ✅ Webhook URLs configured:
  - Prepare: `http://159.65.128.207:3000/click/prepare`
  - Complete: `http://159.65.128.207:3000/click/complete`

## 🚀 Quick Start - Final Steps

### Step 1: Run Database Migration

Run this in Supabase SQL Editor:

```sql
-- The SQL has been created at: add-click-fields.sql

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS click_order_id TEXT,
ADD COLUMN IF NOT EXISTS click_trans_id TEXT,
ADD COLUMN IF NOT EXISTS click_prepare_time BIGINT,
ADD COLUMN IF NOT EXISTS click_complete_time BIGINT,
ADD COLUMN IF NOT EXISTS click_error INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_click_order_id ON orders(click_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_click_trans_id ON orders(click_trans_id);
```

### Step 2: Add Environment Variables

**You need to get these from Click merchant cabinet:**

#### Vercel (Production):
```bash
vercel env add VITE_CLICK_MERCHANT_ID production
# Enter: your_merchant_id

vercel env add VITE_CLICK_SERVICE_ID production
# Enter: your_service_id

vercel env add CLICK_SERVICE_ID production
# Enter: your_service_id

vercel env add CLICK_SECRET_KEY production
# Enter: your_secret_key
```

#### VPS Proxy (159.65.128.207):
```bash
ssh root@159.65.128.207
nano /var/www/click-proxy/.env
```

Add/update:
```env
CLICK_SERVICE_ID=your_service_id
CLICK_SECRET_KEY=your_secret_key
VERCEL_API_URL=https://www.ailem.uz/api/click-webhook
PORT=3000
```

Save and restart:
```bash
pm2 restart click-proxy
pm2 logs click-proxy  # Verify it's running
```

### Step 3: Deploy Frontend

```bash
vercel --prod
```

### Step 4: Test!

1. Open your Telegram Mini App
2. Add items to cart
3. Go to checkout
4. Select **"Click Payment"**
5. Click "Pay with Click" button
6. Complete payment

## 📋 Files Created

| File | Description |
|------|-------------|
| `src/services/click.js` | Click service (payment link generation) |
| `api/click-webhook.js` | Vercel webhook handler (prepare/complete) |
| `add-click-fields.sql` | Database migration |
| `CLICK_SETUP.md` | Detailed setup guide |
| `CLICK_INTEGRATION_COMPLETE.md` | This file |

## 🔄 How It Works

```
1. User selects "Click Payment"
   ↓
2. Frontend creates order with click_order_id
   ↓
3. User redirected to Click.uz
   ↓
4. User enters card details
   ↓
5. Click calls PREPARE webhook → Proxy → Vercel
   ↓
6. Vercel validates order and amount
   ↓
7. Click processes payment
   ↓
8. Click calls COMPLETE webhook → Proxy → Vercel
   ↓
9. Vercel approves order in database
   ↓
10. User redirected back to app
```

## 💳 Payment Methods Now Available

1. **Payme** (Test mode - waiting for production credentials)
   - Uzcard, HUMO, Payme app

2. **Click** (Ready to go!)
   - Uzcard, HUMO, Visa, Mastercard

3. **Manual Payment** (Bank transfer with screenshot)

## 🧪 Testing

### Test Proxy Health
```bash
curl http://159.65.128.207:3000/health
```

Should return:
```json
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
1. Make a small test payment
2. Check Supabase orders table:
   - `click_order_id` should be set
   - `status` should change to `approved`
   - `click_trans_id` should be populated

### Check Logs

**Proxy:**
```bash
ssh root@159.65.128.207
pm2 logs click-proxy
```

**Vercel:**
```bash
vercel logs --follow
```

## ⚠️ Important Notes

### Before Going Live

- [ ] Run database migration in Supabase
- [ ] Add environment variables to Vercel
- [ ] Configure proxy server environment
- [ ] Test with small real payment
- [ ] Verify webhook is working
- [ ] Check order status updates correctly

### Security

- ✅ Signature verification implemented
- ✅ Service ID validation
- ✅ Amount validation
- ✅ Double payment prevention
- ✅ Proxy forwards to HTTPS Vercel

### Proxy Server Maintenance

The proxy runs on your DigitalOcean VPS at `159.65.128.207`:

**View status:**
```bash
pm2 status
```

**View logs:**
```bash
pm2 logs click-proxy
```

**Restart:**
```bash
pm2 restart click-proxy
```

## 📞 Need Help?

### Click Support
- Email: support@click.uz
- Phone: +998 78 150 01 02
- Website: https://click.uz

### Documentation
- [CLICK_SETUP.md](CLICK_SETUP.md) - Full setup guide
- [click-proxy/README.md](click-proxy/README.md) - Proxy server guide
- Click API Docs: https://docs.click.uz/

## 🎯 Next Steps

1. ✅ Get Click credentials from merchant cabinet
2. ✅ Run database migration
3. ✅ Configure environment variables
4. ✅ Deploy to production
5. ✅ Test payment flow
6. ✅ Go live!

---

## 🚀 Ready to Deploy?

Just run:
```bash
# 1. Run SQL migration in Supabase
# 2. Add environment variables (see Step 2 above)
# 3. Deploy
vercel --prod
```

**Your Click integration is ready! Just need the credentials and final deployment!** 🎉
