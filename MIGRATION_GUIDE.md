# 📦 Migration Guide: LocalStorage → Supabase

## Overview

This guide will help you migrate your 10 demo products and reviews from localStorage to your Supabase PostgreSQL database.

## Prerequisites

✅ Supabase project created
✅ Database schema executed (all 5 tables created)
✅ Environment variables configured in `.env`

## Migration Steps

### Step 1: Verify Database Tables

1. Go to your Supabase project dashboard
2. Click on "Table Editor" in the left sidebar
3. Verify you see these 5 tables:
   - `categories` (should have 4 rows already)
   - `products` (empty)
   - `users` (empty)
   - `orders` (empty)
   - `reviews` (empty)

### Step 2: Run the Migration

**Option A: Using the Browser Tool (Easiest)**

1. Make sure your development server is running:
   ```bash
   npm run dev
   ```

2. Open `migrate.html` in your browser:
   ```
   http://localhost:5173/migrate.html
   ```
   Or double-click the `migrate.html` file to open it directly.

3. Click the **"Start Migration"** button

4. Watch the logs to see the migration progress

5. When complete, you should see:
   ```
   ✅ Migration completed successfully!
   📦 Products migrated: 10
   💬 Reviews migrated: 6
   ```

**Option B: Using Node.js (Advanced)**

```bash
node src/scripts/migrateToSupabase.js
```

### Step 3: Verify Migration

1. Go back to Supabase Table Editor
2. Click on the `products` table
3. You should see 10 products with all their data
4. Click on the `reviews` table
5. You should see 6 reviews linked to products

### Step 4: Test the Application

1. Refresh your app at `http://localhost:5173`
2. The app will now load data from Supabase instead of localStorage
3. Test these features:
   - **Shop page**: All 10 products should display
   - **Search**: Try searching for tags like "towel", "pillow", "luxury"
   - **Product details**: Open a product and check reviews section
   - **Admin panel**:
     - Add a new product
     - Edit an existing product
     - Delete a product
     - Manage categories
     - Approve/reject reviews

## What Changed?

### Before Migration
- Data stored in browser localStorage
- Data lost when clearing browser cache
- No multi-device sync
- Limited to single browser

### After Migration
- Data stored in Supabase PostgreSQL
- Persistent across all devices
- Real-time multi-device sync
- Scalable to millions of records
- Professional production-ready backend

## Database Schema Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `categories` | Product categories | name, image |
| `products` | All products | name, price, images, tags, stock |
| `users` | Telegram users | telegram_id, bonus_points, referrals |
| `orders` | Customer orders | items (JSON), total, status, payment_screenshot |
| `reviews` | Product reviews | rating, comment, approved |

## Updated Context Files

The following context files now use Supabase:

- ✅ **AdminContext**: All product, category, order, review, user operations
- ⏳ **UserContext**: User profile, favorites, orders (next step)
- ⏳ **CartContext**: Will remain localStorage for now (cart is session-based)

## Troubleshooting

### Error: "Failed to fetch categories"
- Check your `.env` file has correct Supabase credentials
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart your dev server after changing `.env`

### Error: "Network request failed"
- Check your internet connection
- Verify Supabase project is active (not paused)
- Check Supabase dashboard for service status

### Products not showing after migration
- Clear browser cache and reload
- Check browser console for errors
- Verify products exist in Supabase Table Editor

### Migration button does nothing
- Open browser console (F12) to see error messages
- Verify your dev server is running
- Check network tab for failed requests

## Next Steps

After successful migration:

1. ✅ Products and reviews are in Supabase
2. ⏳ Update UserContext to use Supabase API
3. ⏳ Connect Telegram user authentication
4. ⏳ Test complete order flow with payment
5. ⏳ Deploy to production (Vercel + Supabase)

## Rollback (If Needed)

If something goes wrong, you can:

1. Delete all data from Supabase tables:
   ```sql
   DELETE FROM reviews;
   DELETE FROM orders;
   DELETE FROM products;
   -- Keep categories, they're needed
   ```

2. Re-run the migration

## Support

If you encounter any issues:
- Check the browser console for errors
- Check Supabase logs in the dashboard
- Verify all environment variables are correct
- Ensure database schema was executed successfully
