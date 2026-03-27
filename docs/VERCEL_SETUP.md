# Vercel Deployment Setup

## Step-by-Step Instructions

### 1. Go to Vercel
Visit: https://vercel.com

### 2. Sign In with GitHub
Click "Continue with GitHub"

### 3. Import Your Repository
- Click "Add New Project"
- Find "ailem-bot" repository
- Click "Import"

### 4. Configure Project Settings

**Framework Preset:** Vite  
**Root Directory:** ./  
**Build Command:** `npm run build`  
**Output Directory:** `dist`  
**Install Command:** `npm install`  

### 5. Add Environment Variables

Click "Environment Variables" and add these 4 variables:

| Name | Value | Where to Get It |
|------|-------|-----------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | https://app.supabase.com → Your Project → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | Same place as above |
| `VITE_TELEGRAM_BOT_TOKEN` | Your bot token | Message @BotFather on Telegram |
| `VITE_ADMIN_TELEGRAM_ID` | Your Telegram user ID | Message @userinfobot on Telegram |

**Example values (replace with yours):**
```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_TELEGRAM_BOT_TOKEN = 1234567890:ABCdefGHI...
VITE_ADMIN_TELEGRAM_ID = 123456789
```

### 6. Deploy!

Click "Deploy" button and wait 1-2 minutes.

### 7. Get Your Production URL

After deployment completes, you'll see:
```
https://ailem-bot.vercel.app
```
or
```
https://ailem-bot-xxxx.vercel.app
```

Copy this URL - you'll need it for Telegram!

---

## After Deployment: Update Telegram Bot

### 1. Open Telegram
Message @BotFather

### 2. Update Web App URL
```
/mybots
→ Select your bot
→ Bot Settings
→ Menu Button
→ Edit menu button URL
→ Paste your Vercel URL
```

### 3. Test Your App
1. Open your bot in Telegram
2. Click the menu/web app button
3. Your store should open!

---

## Troubleshooting

### Build fails?
- Check that all environment variables are set
- Verify the build command is `npm run build`
- Check build logs for errors

### App opens but shows errors?
- Verify environment variables are correct
- Check browser console (F12) for error messages
- Make sure Supabase database migration was run

### Can't access admin panel?
- Verify `VITE_ADMIN_TELEGRAM_ID` matches your Telegram user ID
- Message @userinfobot to confirm your ID

---

## Need Help?

Check the detailed guide: DEPLOYMENT.md
