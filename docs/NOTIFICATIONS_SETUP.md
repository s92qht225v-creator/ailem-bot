# Telegram Notifications Setup Guide

Your app already has Telegram notification support built-in! Follow these steps to enable notifications for new orders and order status updates.

## Features

### Admin Notifications
- 🔔 Get notified when a new order is placed
- 📦 See order details (items, total, customer info)
- ⚡ Instant notifications via your Telegram bot

### Customer Notifications
- ✅ Order received confirmation
- 🎉 Order approved notification
- 📦 Order shipped notification
- ✅ Order delivered notification
- ❌ Order rejected notification

## Setup Instructions

### Step 1: Get Your Telegram Chat ID

You need your Telegram Chat ID to receive admin notifications.

**Option A: Using @userinfobot (Recommended)**
1. Open Telegram
2. Search for `@userinfobot`
3. Start a conversation with the bot
4. It will instantly show your Chat ID
5. Copy the numeric ID (e.g., `123456789`)

**Option B: Using @get_id_bot**
1. Open Telegram
2. Search for `@get_id_bot`
3. Send `/start`
4. Copy your ID

### Step 2: Add Chat ID to Environment Variables

**For Local Development:**

1. Open `.env` file
2. Replace `YOUR_TELEGRAM_CHAT_ID_HERE` with your actual Chat ID:
   ```
   VITE_ADMIN_CHAT_ID=123456789
   ```
3. Save the file
4. Restart your dev server (`npm run dev`)

**For Production (Vercel):**

Run these commands:

```bash
# Add admin chat ID
vercel env add VITE_ADMIN_CHAT_ID production
# When prompted, enter your Telegram Chat ID
```

Then redeploy:
```bash
vercel --prod
```

### Step 3: Test Notifications

1. Place a test order in your app
2. You should receive a Telegram message from your bot with order details
3. The customer should also receive a confirmation message

## How It Works

### When a New Order is Placed:

1. **Customer** receives:
   ```
   ✅ Order Received!

   Thank you for your order! 🎉

   Order ID: #abc123

   📦 Items:
     • Product Name (x1)

   💰 Total: 100000 UZS
   🚚 Courier: Yandex

   ⏰ Your order is pending approval.
   ```

2. **Admin** receives:
   ```
   🔔 New Order Received!

   Order ID: #abc123
   Customer: Ali
   Phone: +998901234567

   📦 Items:
     • Product Name (x1) - 100000 UZS

   💰 Total: 100000 UZS
   🚚 Courier: Yandex

   ⏰ Please review and approve the order.
   ```

### When Order Status Changes:

**Order Approved:**
```
🎉 Order Approved!

Your order #abc123 has been approved!

📦 Items: 1 item(s)
💰 Total: 100000 UZS
🚚 Courier: Yandex

Your order will be shipped soon. Thank you for shopping with us! 🛍️
```

**Order Rejected:**
```
❌ Order Rejected

Sorry, your order #abc123 could not be processed.

💰 Amount: 100000 UZS

Your bonus points have been refunded. Please contact support if you have questions.
```

## Troubleshooting

### Not Receiving Notifications?

1. **Check Bot Token**
   - Make sure `VITE_TELEGRAM_BOT_TOKEN` is set correctly in `.env`
   - The bot token is already configured: `7721843664:AAEDBUydg2j3sxCRTBApCOkMYIg8ZT_eMyw`

2. **Check Admin Chat ID**
   - Make sure you've set `VITE_ADMIN_CHAT_ID` in `.env`
   - Chat ID should be a number (e.g., `123456789`), not text

3. **Verify Bot is Active**
   - Open your bot in Telegram (search for your bot username)
   - Send `/start` to activate the bot
   - The bot must be active to send messages

4. **Check Browser Console**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for notification logs:
     - `📤 Sending Telegram notification to: [your-chat-id]`
     - `✅ Telegram notification sent successfully`
   - If you see errors, check the error messages

5. **Environment Variables Not Loading?**
   - Restart your dev server after changing `.env`
   - For production, make sure you added the env vars to Vercel and redeployed

### Customer Not Receiving Notifications?

Customers will only receive notifications if:
1. They opened the app through Telegram (not a web browser)
2. Their Telegram ID was captured when they placed the order
3. The bot is active and has permission to send messages

**Note:** Guest users and browser users won't receive notifications since they don't have a Telegram ID.

## Testing Tips

1. **Test with yourself first**
   - Place an order through your Telegram bot
   - You should receive two notifications (one as customer, one as admin)

2. **Test order status changes**
   - Go to Admin Panel
   - Approve or reject a test order
   - Check if you receive status update notifications

3. **Check notification logs**
   - All notification attempts are logged in the browser console
   - Look for success/error messages

## Advanced Configuration

### Customize Notification Messages

Edit `/src/services/telegram.js` to customize notification messages:

- `notifyAdminNewOrder` - Admin notification for new orders
- `notifyUserOrderStatus` - Customer notifications for status changes
- `notifyUserNewOrder` - Customer order confirmation

### Add More Notification Types

The service already includes these ready-to-use functions:

- `notifyReferrerReward` - Notify when someone earns referral points
- `notifyAdminLowStock` - Notify admin about low stock
- `sendTestNotification` - Test if notifications work

## Environment Variables Summary

```bash
# Required for notifications
VITE_TELEGRAM_BOT_TOKEN=7721843664:AAEDBUydg2j3sxCRTBApCOkMYIg8ZT_eMyw
VITE_ADMIN_CHAT_ID=YOUR_TELEGRAM_CHAT_ID_HERE

# Other env vars (already configured)
VITE_SUPABASE_URL=https://cjicnsltjuatduzuwgoo.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
VITE_ADMIN_CARD_NUMBER=4532123456789012
VITE_APP_URL=https://ailem.uz
```

## Support

If you're still having issues:

1. Check the browser console for error messages
2. Verify your bot token is correct
3. Make sure your Chat ID is a number, not text
4. Ensure the bot is started in Telegram
5. Check Vercel deployment logs for any errors

---

**That's it! Once you add your Chat ID, notifications will work automatically.** 🎉
