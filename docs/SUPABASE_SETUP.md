# 🚀 Supabase Setup Guide

## ✅ What's Already Done

1. ✅ Created `.env` file with your Supabase credentials
2. ✅ Installed `@supabase/supabase-js` package
3. ✅ Created Supabase client configuration (`src/lib/supabase.js`)
4. ✅ Created database schema SQL file (`supabase-schema.sql`)

---

## 📋 Next Steps (YOU Need to Do This Now)

### Step 1: Run Database Schema in Supabase (5 minutes)

1. **Open your Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Select your project: `ailem-store`

2. **Open SQL Editor:**
   - Click **"SQL Editor"** in the left sidebar (icon looks like `</>`)
   - Click **"New query"** button

3. **Copy & Paste Schema:**
   - Open the file: `supabase-schema.sql`
   - Copy ALL the contents
   - Paste into the SQL editor

4. **Run the Script:**
   - Click **"Run"** button (or press Ctrl+Enter)
   - Wait ~10 seconds
   - You should see: ✅ Success message

5. **Verify Tables Created:**
   - Click **"Table Editor"** in left sidebar
   - You should see these tables:
     - ✅ categories (with 4 rows: Bedsheets, Pillows, Curtains, Towels)
     - ✅ products (empty for now)
     - ✅ orders (empty)
     - ✅ users (empty)
     - ✅ reviews (empty)

---

## 🎯 What Happens Next

### After you run the schema, I will:

1. **Migrate existing products** from `src/data/products.js` to Supabase
2. **Update all contexts** to use Supabase instead of localStorage
3. **Test all CRUD operations**
4. **Update the frontend** to load data from database

---

## 🔍 Troubleshooting

### If SQL script fails:

**Error: "extension uuid-ossp does not exist"**
- Solution: Supabase should have this by default. Try running just the first line:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  ```
- Then run the rest of the script

**Error: "permission denied"**
- Solution: Make sure you're logged in as the project owner
- Check you're in the correct project

### If tables don't appear:

1. Refresh the page
2. Check the SQL editor output for error messages
3. Try running the script again

---

## 📊 Database Structure

### Tables Created:

**1. categories**
- Stores product categories
- Already has 4 categories pre-loaded

**2. products**
- Stores all products with prices, images, stock, tags, etc.
- Linked to categories

**3. users**
- Stores customer data
- Telegram ID, bonus points, referral codes

**4. orders**
- Stores all orders
- Linked to users
- Contains order items as JSONB

**5. reviews**
- Stores product reviews
- Linked to products and orders
- Has approval system

---

## 🔐 Security (Already Configured)

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Public read access for products, categories
- ✅ Secure write operations
- ✅ Users can only edit their own data

---

## ✅ Once Schema is Loaded

**Reply here with:** "Schema loaded successfully"

**I will then:**
1. Migrate your 10 demo products to Supabase
2. Update frontend to use database
3. You'll have a fully working backend!

---

## 🎉 Benefits After This Setup

✅ **Data persists across devices**
✅ **You can see all orders in Supabase dashboard**
✅ **Admin panel works from any device**
✅ **Real-time sync (optional)**
✅ **Ready for production**
✅ **No more localStorage limitations**

---

## 📞 Need Help?

If you encounter any issues:
1. Take a screenshot of the error
2. Share it here
3. I'll help you resolve it immediately

---

**Go ahead and run that SQL script now!** 🚀
