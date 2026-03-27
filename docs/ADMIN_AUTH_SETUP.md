# Admin Authentication Setup Guide

Complete guide to set up secure Supabase-based admin authentication for your Ailem Telegram Mini App.

---

## 🔒 What Changed?

### Before (Insecure ❌)
- Hardcoded password in source code: `MASTER_ADMIN_PASSWORD = 'ailem2024!'`
- Authentication stored in `localStorage` (easily faked)
- No server-side validation
- Anyone could fake admin access via browser console

### After (Secure ✅)
- **Supabase Auth**: Industry-standard JWT authentication
- **Server-side validation**: Every request verified by Supabase
- **Encrypted sessions**: JWT tokens cryptographically signed
- **Cannot be faked**: Tokens require server secret key
- **Auto-logout**: Sessions expire automatically
- **Email/password login**: Professional authentication flow

---

## 🚀 Setup Instructions (10 minutes)

### Step 1: Run Database Migration

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Click **New query**
5. Copy and paste the contents of `add-admin-auth.sql`
6. Click **Run** (or press F5)

You should see:
```
Success. No rows returned.
```

This creates the `admin_users` table that tracks who has admin access.

---

### Step 2: Create Your Admin User Account

#### Option A: Via Supabase Dashboard (Recommended)

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Fill in:
   - **Email**: `your-email@domain.com` (use your real email)
   - **Password**: Create a strong password (min 6 characters)
   - **Auto Confirm User**: ✅ Check this box
4. Click **Create user**
5. **Copy the User ID** that appears (you'll need it in the next step)

#### Option B: Via Email Signup (Alternative)

If you prefer, you can enable email signups in Supabase:
1. Go to **Authentication** → **Providers** → **Email**
2. Enable **Confirm email** (recommended)
3. Use the app's signup flow to create your account

---

### Step 3: Grant Admin Access

Now you need to add your user to the `admin_users` table:

#### Option A: Via SQL Editor (Easiest)

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this query (replace `YOUR-USER-ID` with the ID from Step 2):

```sql
INSERT INTO admin_users (user_id, role)
VALUES ('YOUR-USER-ID', 'admin');
```

Example:
```sql
INSERT INTO admin_users (user_id, role)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin');
```

3. Click **Run**
4. You should see: `Success. 1 rows affected.`

#### Option B: Via Table Editor (Alternative)

1. Go to **Table Editor** in Supabase Dashboard
2. Select `admin_users` table
3. Click **Insert** → **Insert row**
4. Fill in:
   - **user_id**: Paste your user ID from Step 2
   - **role**: Enter `admin`
5. Click **Save**

---

### Step 4: Test Login

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to admin panel:
   - Open: `http://localhost:3000?admin=true`
   - Or click the admin button in your app

3. Login with your credentials:
   - **Email**: The email you used in Step 2
   - **Password**: The password you created

4. You should see the admin panel! 🎉

---

## 🔐 Security Features

### What's Protected Now:

✅ **JWT Tokens**: Cryptographically signed, cannot be forged
✅ **Server Validation**: Supabase verifies every request
✅ **HTTP-Only Cookies**: Stored securely (not accessible via JavaScript)
✅ **Auto-Expiration**: Sessions expire after inactivity
✅ **Role-Based Access**: Only users in `admin_users` table can access admin panel
✅ **Secure Password Storage**: Passwords hashed with bcrypt

### How It Works:

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Login (email + password)
       ▼
┌─────────────┐
│  Supabase   │ 2. Validates credentials
│    Auth     │ 3. Checks admin_users table
└──────┬──────┘ 4. Issues JWT token
       │
       ▼
┌─────────────┐
│ Admin Panel │ Token sent with every request
│  (Your App) │ Server validates token
└─────────────┘
```

---

## 👥 Adding More Admins

To give admin access to additional users:

1. They need to create a Supabase account (Step 2 above)
2. You add their `user_id` to the `admin_users` table (Step 3 above)

**Quick SQL to add an admin:**
```sql
-- Replace with their email
SELECT id FROM auth.users WHERE email = 'newadmin@example.com';

-- Then insert into admin_users
INSERT INTO admin_users (user_id, role)
VALUES ('their-user-id-here', 'admin');
```

---

## 🚪 Logging Out

Users can logout by:
1. Clicking the **🚪 Logout** button in the admin panel
2. Sessions also auto-expire after 24 hours of inactivity

When logged out:
- JWT token is revoked
- User must re-authenticate
- Session cannot be reused

---

## 🔧 Troubleshooting

### "User is not authorized as an admin"

**Cause**: User account exists in Supabase Auth, but not in `admin_users` table.

**Solution**:
1. Check if user exists:
   ```sql
   SELECT * FROM auth.users WHERE email = 'your-email@example.com';
   ```
2. Add them to admin_users:
   ```sql
   INSERT INTO admin_users (user_id, role)
   VALUES ('user-id-from-above', 'admin');
   ```

---

### "Invalid email or password"

**Causes**:
1. Wrong password
2. Email not confirmed (if email confirmation is enabled)
3. User doesn't exist

**Solutions**:
1. Reset password in Supabase Dashboard:
   - Authentication → Users → Find user → Reset password
2. Verify email is confirmed:
   - Authentication → Users → Check "Email Confirmed" column
3. Create new user (see Step 2 above)

---

### "Cannot read properties of null (reading 'id')"

**Cause**: Trying to access admin panel before authentication loads.

**Solution**: This should be fixed automatically - the app shows a loading spinner while checking auth status.

---

### RLS Policy Error

**Error**: `"new row violates row-level security policy"`

**Cause**: Trying to insert into `admin_users` table via client code.

**Solution**: Admin user creation MUST be done via:
- Supabase Dashboard (Table Editor or SQL Editor)
- Backend API with service role key (not anon key)

---

## 📋 Verification Checklist

Before going to production:

- [ ] `add-admin-auth.sql` migration executed successfully
- [ ] At least one admin user created in Supabase Auth
- [ ] Admin user added to `admin_users` table
- [ ] Successfully logged in to admin panel with email/password
- [ ] Logout works correctly
- [ ] Refresh page keeps you logged in (session persists)
- [ ] Non-admin users cannot access admin panel
- [ ] Old localStorage-based auth removed (automatic)

---

## 🎯 Production Deployment

When deploying to production (Vercel):

1. **No additional environment variables needed** - Supabase credentials already configured
2. **Enable email confirmation** (recommended):
   - Supabase Dashboard → Authentication → Email Templates
   - Configure confirmation email template
3. **Set up password reset**:
   - Supabase Dashboard → Authentication → URL Configuration
   - Set "Site URL" to: `https://www.ailem.uz`
4. **Consider adding 2FA** (optional):
   - Supabase supports TOTP 2FA for extra security
   - Enable in: Authentication → Settings → MFA

---

## 🆘 Support

If you encounter issues:

1. Check Supabase logs:
   - Dashboard → Logs → Auth logs
2. Check browser console for errors
3. Verify database tables exist:
   ```sql
   SELECT * FROM admin_users LIMIT 1;
   ```

---

## 📚 Additional Resources

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **JWT Explained**: https://jwt.io/introduction
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security

---

**You're all set! 🎉**

Your admin panel now has enterprise-grade authentication powered by Supabase.
