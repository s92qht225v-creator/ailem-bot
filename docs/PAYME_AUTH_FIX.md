# Payme Authentication Error Fix

## Problem
You're getting this error from test.paycom.uz:
```json
{
    "jsonrpc": "2.0",
    "id": 207902,
    "error": {
        "code": -32504,
        "message": "Insufficient privileges to perform the operation"
    }
}
```

## Root Cause
Your `.env` is set to `VITE_PAYME_TEST_MODE=true` but you only have `PAYME_KEY` (production key) configured. The test environment requires a separate `PAYME_TEST_KEY`.

## Solution Options

### Option 1: Get Test Key from Payme (Recommended)

1. **Contact Payme Support:**
   - Email: support@paycom.uz
   - Phone: +998 71 200 7777
   - Request: "Test environment API key for test.paycom.uz"

2. **Add to your `.env` file:**
   ```bash
   VITE_PAYME_TEST_MODE=true
   PAYME_TEST_KEY=your_test_key_here  # ← Add this
   PAYME_KEY=ojWN@Ua290xxu%u0cdGP5U9JA?rMr&2b#oN3  # Keep existing
   ```

3. **Redeploy** (if using Vercel):
   ```bash
   vercel env add PAYME_TEST_KEY production
   # Enter your test key when prompted
   vercel --prod
   ```

### Option 2: Use Production Environment (Quick Test)

If you want to test immediately with your current key:

1. **Update `.env`:**
   ```bash
   VITE_PAYME_TEST_MODE=false  # ← Change to false
   PAYME_KEY=ojWN@Ua290xxu%u0cdGP5U9JA?rMr&2b#oN3
   ```

2. **Test on production Payme** (not test.paycom.uz)
   - Use small amounts for testing
   - Real money will be charged

## Verify Your Configuration

Run this command to check your setup:
```bash
node test-payme-webhook.js
```

It will show:
- ✅ Which keys are configured
- 🔐 The expected Authorization header format
- 📝 A test curl command you can use

## Expected Authorization Header Format

Payme sends authentication as:
```
Authorization: Basic <base64("Paycom:YOUR_KEY")>
```

For example, with key `ojWN@Ua290xxu%u0cdGP5U9JA?rMr&2b#oN3`:
```
Authorization: Basic UGF5Y29tOm9qV05AVWEyOTB4eHUldTBjZEdQNVU5SkE/ck1yJjJi
```

## How the Webhook Works

The webhook ([api/payme-webhook.js](api/payme-webhook.js#L17-L34)) checks keys in this order:

1. `PAYME_KEY` (always checked)
2. `PAYME_TEST_KEY` (if `VITE_PAYME_TEST_MODE=true`)
3. `PAYME_ADDITIONAL_KEYS` (comma-separated list)

It accepts the request if the Authorization header matches ANY of these keys.

## Testing Locally

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **In another terminal, test the webhook:**
   ```bash
   curl -X POST http://localhost:3000/api/payme-webhook \
     -H "Content-Type: application/json" \
     -H "Authorization: Basic UGF5Y29tOm9qV05AVWEyOTB4eHUldTBjZEdQNVU5SkE/ck1yJjJi" \
     -d '{
       "jsonrpc": "2.0",
       "id": 123,
       "method": "CheckPerformTransaction",
       "params": {
         "amount": 10000,
         "account": { "order_id": "test-123" }
       }
     }'
   ```

3. **Check the response:**
   - ✅ Success: Will return order details
   - ❌ Error -32504: Wrong Authorization header
   - ❌ Error -31050: Order not found (but auth worked!)

## Production Deployment

Before deploying to production:

1. **Set Vercel environment variables:**
   ```bash
   vercel env add PAYME_KEY production
   # Enter your PRODUCTION key

   vercel env add PAYME_TEST_KEY production
   # Enter your TEST key

   vercel env add VITE_PAYME_TEST_MODE production
   # Enter: false (for production) or true (for testing)
   ```

2. **Redeploy:**
   ```bash
   vercel --prod
   ```

3. **Configure webhook URL with Payme:**
   - Contact Payme support
   - Provide: `https://your-domain.com/api/payme-webhook`
   - They will whitelist your URL

## Improvements Made

I've updated the code with better diagnostics:

1. **Enhanced logging** in [api/payme-webhook.js](api/payme-webhook.js#L37-L62)
   - Shows which environment variables are set
   - Logs authentication failures with details
   - Helps debug configuration issues

2. **Test script** [test-payme-webhook.js](test-payme-webhook.js)
   - Verifies your configuration
   - Shows expected auth headers
   - Provides test commands

3. **Updated .env.example** with clear documentation

## Next Steps

1. ✅ Get test key from Payme support
2. ✅ Add `PAYME_TEST_KEY` to your `.env`
3. ✅ Run `node test-payme-webhook.js` to verify
4. ✅ Test a payment on test.paycom.uz
5. ✅ Deploy to production when ready

## Support

If you still have issues:
- Check Vercel function logs: `vercel logs`
- Contact Payme: support@paycom.uz
- Run the test script: `node test-payme-webhook.js`
