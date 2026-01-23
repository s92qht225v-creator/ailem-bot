# Troubleshooting Admin Image Uploads

## Problem
Cannot upload images through the desktop admin panel. Upload button doesn't work or shows errors.

## Root Causes

There are **3 possible issues**:

1. **Storage bucket doesn't exist or has wrong configuration**
2. **Row Level Security (RLS) policies are missing or too restrictive**
3. **Admin user is not authenticated with Supabase Auth**

## Solution Steps

### Step 1: Verify Admin Authentication

**Check browser console** (press F12 → Console tab):
- Look for "Admin authenticated" message
- If you see "No active session" → You need to log in first

**How to log in as admin:**
1. Open admin panel at: http://localhost:3000/?admin=true
2. Enter your admin email and password
3. You should be redirected to the admin dashboard

**Note:** The anon key (used for unauthenticated users) does NOT have permission to upload. You MUST be logged in as an authenticated admin user.

### Step 2: Fix Supabase Storage Configuration

Run the SQL script to configure storage bucket and policies:

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project: `cjicnsltjuatduzuwgoo`

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the fix script:**
   - Copy all contents from `fix-admin-storage-upload.sql`
   - Paste into SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify the results:**
   - You should see the bucket configuration
   - You should see 4 policies created

### Step 3: Test Upload

1. Go to admin panel: http://localhost:3000/?admin=true
2. Navigate to Products → Add Product
3. Click "Rasmlarni yuklash" (Upload images)
4. Select an image file
5. Check browser console for upload progress:
   - `📤 Uploading to Supabase Storage...`
   - `✅ Image uploaded: [URL]`

### Step 4: Common Error Messages

**Error: "mime type image/jpeg is not supported"**
- **Cause:** Bucket `allowed_mime_types` not configured
- **Fix:** Run `fix-admin-storage-upload.sql` (Step 2 above)

**Error: "new row violates row-level security policy"**
- **Cause:** You're not authenticated or RLS policies are missing
- **Fix:** 
  1. Make sure you're logged in as admin
  2. Run `fix-admin-storage-upload.sql` to create policies

**Error: "Upload timeout"**
- **Cause:** Network issue or Supabase connection problem
- **Fix:** Check internet connection and try again

**Error: "File too large"**
- **Cause:** File exceeds 10MB limit
- **Fix:** Resize/compress the image or increase limit in SQL:
  ```sql
  UPDATE storage.buckets
  SET file_size_limit = 20971520  -- 20 MB
  WHERE id = 'product-images';
  ```

**No error but button does nothing:**
- **Cause:** JavaScript error preventing upload
- **Fix:** Check browser console for errors

## Debugging Checklist

Use this checklist to diagnose the issue:

- [ ] Admin user is logged in (check console for "Admin authenticated")
- [ ] Supabase environment variables are set in `.env`
- [ ] Storage bucket `product-images` exists in Supabase
- [ ] Bucket has `allowed_mime_types` configured
- [ ] Bucket has `public = true` set
- [ ] RLS policies exist for INSERT/UPDATE/DELETE for authenticated users
- [ ] Browser console shows no JavaScript errors
- [ ] Network tab shows upload request being sent

## Manual Bucket Creation (Alternative)

If SQL script doesn't work, create bucket manually:

1. Go to Supabase Dashboard → Storage
2. Click "New Bucket"
3. Configure:
   - **Name:** `product-images`
   - **Public:** ✅ Yes
   - **File size limit:** 10 MB
   - **Allowed MIME types:** 
     - image/jpeg
     - image/jpg
     - image/png
     - image/gif
     - image/webp
     - image/svg+xml
4. Click "Create"
5. Then run ONLY the policy section of `fix-admin-storage-upload.sql` (lines 37-71)

## Still Not Working?

If uploads still fail after following all steps:

1. **Check Supabase logs:**
   - Supabase Dashboard → Logs → Storage
   - Look for errors during upload attempt

2. **Verify admin_users table:**
   ```sql
   SELECT * FROM admin_users WHERE email = 'your-admin-email@example.com';
   ```
   - Make sure your user exists in this table

3. **Test with service role key (temporary debug only):**
   - In `.env`, temporarily add:
     ```
     VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```
   - Modify `src/lib/supabase.js` to use service role
   - **IMPORTANT:** Never deploy with service role key in frontend!
   - This is ONLY for testing to confirm the issue is authentication

## Technical Details

### How Image Upload Works

1. Admin logs in → Gets Supabase auth token
2. Admin clicks upload → File selected
3. `handleMultiImageUpload()` called in `DesktopAdminPanel.jsx`
4. Calls `storageAPI.uploadProductImage(file)` in `src/services/api.js`
5. Uses `supabase.storage.from('product-images').upload()`
6. Supabase checks:
   - Is user authenticated? (uses token from login)
   - Does file MIME type match `allowed_mime_types`?
   - Does file size < `file_size_limit`?
   - Does RLS policy allow INSERT for this user?
7. If all checks pass → File uploaded → Public URL returned
8. URL added to product images array

### Why Anon Key Doesn't Work

The anon key in `.env` (`VITE_SUPABASE_ANON_KEY`) is for **unauthenticated users** (customers browsing products). 

For security, unauthenticated users:
- ✅ Can READ products and images
- ❌ Cannot WRITE/UPLOAD to storage

Admin operations require:
- Admin login via Supabase Auth
- Auth token with `authenticated` role
- User exists in `admin_users` table

This is enforced by RLS policies:
```sql
CREATE POLICY "Authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated  -- Only authenticated users
WITH CHECK ( bucket_id = 'product-images' );
```

## Related Files

- `src/components/pages/DesktopAdminPanel.jsx` - Admin UI with upload logic
- `src/services/api.js` - `storageAPI.uploadProductImage()` function
- `src/components/AdminAuth.jsx` - Admin authentication flow
- `fix-admin-storage-upload.sql` - SQL fix script
- `fix-storage-bucket.sql` - Alternative fix script (older)
