# Referral System Setup Instructions

## ✅ What's Been Implemented

### 1. Database Schema (`add-referral-system.sql`)
- **referrals table** - Tracks who referred whom and reward status
- **orders.referral_id** - Links orders to referrals
- **orders.is_first_order** - Flags first approved orders
- **Automatic reward trigger** - Awards 50,000 UZS bonus on first purchase

### 2. Backend API (`src/services/api.js`)
- `referralsAPI.createReferral()` - Create referral relationship
- `referralsAPI.getUserReferrals()` - Get user's referrals
- `referralsAPI.getReferralStats()` - Get referral statistics
- `referralsAPI.getUserReferralInfo()` - Check if user was referred
- `referralsAPI.generateShareLink()` - Generate referral links

### 3. Frontend UI
- **Share button on ProductPage** - Beautiful gradient button with icon
- **Telegram native sharing** - Uses Telegram's share functionality
- **Fallback to clipboard** - If Telegram share unavailable

### 4. Translations
- Added Uzbek translations for share feature:
  - `shareAndEarn`: "Ulashing va bonus oling 🎁"
  - `checkItOut`: "Bu mahsulotni ko\'ring!"
  - `linkCopied`: "Havola nusxalandi!"

---

## 🚀 Setup Steps

### Step 1: Run SQL Migration

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `add-referral-system.sql`
4. Click "Run" to execute the migration

This will:
- Create `referrals` table
- Add `referral_id` and `is_first_order` columns to `orders` table
- Create automatic reward trigger function

### Step 2: Add Bot Username to Environment

Add your bot username to `.env`:

```bash
VITE_BOT_USERNAME=your_bot_username
```

Replace `your_bot_username` with your actual Telegram bot username (without @)

### Step 3: Build and Deploy

```bash
npm run build
npx vercel --prod --yes
git add .
git commit -m "Add referral system with product sharing"
git push
```

---

## 📱 How It Works

### User Journey:

1. **User shares product** → Clicks "Ulashing va bonus oling 🎁" button
2. **Share link generated** → Format: `https://t.me/botname?start=ref_USERID_prod_PRODUCTID`
3. **Friend opens link** → New user signs up through referral link
4. **Bot creates referral** → Calls `referralsAPI.createReferral()` with referrer ID
5. **Friend makes first purchase** → Order is marked with `is_first_order=true` and `referral_id`
6. **Order gets approved** → Trigger automatically awards 50,000 UZS to referrer
7. **Bonus points credited** → Referrer can use for future purchases

### Referral Link Format:

- General referral: `https://t.me/botname?start=ref_USERID`
- Product referral: `https://t.me/botname?start=ref_USERID_prod_PRODUCTID`

---

## 🎁 Reward Configuration

Current reward: **50,000 UZS** per successful referral

To change reward amount, edit in `add-referral-system.sql`:

```sql
DECLARE
  reward_amount INTEGER := 50000; -- Change this value
```

Then re-run the migration's trigger function part only.

---

## 📊 Referral Statuses

- **pending** - User signed up, hasn't purchased yet
- **completed** - User made first purchase, order not approved yet
- **rewarded** - Order approved, bonus awarded to referrer

---

## 🔍 Testing Checklist

### Manual Testing:

1. ✅ Share button appears on product page
2. ✅ Clicking share opens Telegram share dialog
3. ✅ Share link format is correct
4. ✅ New user can open shared link
5. ✅ Referral relationship created in database
6. ✅ First order flagged correctly
7. ✅ Bonus awarded when order approved
8. ✅ ReferralsPage shows correct stats

### SQL Testing Queries:

```sql
-- Check referrals table
SELECT * FROM referrals ORDER BY created_at DESC LIMIT 5;

-- Check orders with referral tracking
SELECT id, user_id, referral_id, is_first_order, status
FROM orders
WHERE referral_id IS NOT NULL
ORDER BY created_at DESC;

-- Check user bonus points
SELECT id, name, bonus_points
FROM users
WHERE bonus_points > 0
ORDER BY bonus_points DESC;
```

---

## 🐛 Troubleshooting

### Share button doesn't work
- Check if `VITE_BOT_USERNAME` is set in `.env`
- Verify Telegram WebApp context is available
- Test clipboard fallback in browser

### Bonus not awarded
- Check order status is 'approved'
- Verify `is_first_order` is `true`
- Check `referral_id` is set on order
- Review trigger logs in Supabase

### Referral not created
- Verify both users exist in database
- Check no duplicate referral (unique constraint)
- Ensure `referral_code` matches user's code

---

## 📝 Next Steps

1. Run SQL migration in Supabase ✅
2. Add `VITE_BOT_USERNAME` to environment ✅
3. Update bot start command handler to parse referral codes
4. Update UserContext to track referred_by on signup
5. Update order creation to set `is_first_order` flag
6. Test complete flow end-to-end
7. Monitor referral dashboard in admin panel

---

## 🎨 Customization Ideas

- Change reward amount based on product price (percentage)
- Add tiered rewards (more referrals = higher rewards)
- Add expiration to referral links
- Track which products get shared most
- Leaderboard for top referrers
- Social proof: "X people bought this through referrals"

---

## 📚 Related Files

- `add-referral-system.sql` - Database migration
- `src/services/api.js` - Referrals API
- `src/components/product/ProductDetails.jsx` - Share button UI
- `src/locales/uz.js` - Translations
- `src/components/pages/ReferralsPage.jsx` - User referral dashboard

---

Created: 2025-01-06
Status: Ready for deployment after SQL migration
