# Fix Supabase Storage Bucket MIME Type Issue

## Problem
Image uploads are failing with "mime type image/jpeg is not supported" or "mime type image/png is not supported"

## Solution
You need to configure the `product-images` bucket to allow common image MIME types.

## Steps to Fix in Supabase Dashboard:

### 1. Go to Storage Settings
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Storage** (left sidebar)
4. Click on the **product-images** bucket

### 2. Update Bucket Settings
1. Click the **Configuration** or **Settings** icon (gear icon)
2. Look for **Allowed MIME types** or **File type restrictions**
3. **Add these MIME types:**
   ```
   image/jpeg
   image/jpg
   image/png
   image/gif
   image/webp
   image/svg+xml
   ```

### Alternative: Create New Bucket with Correct Settings

If you can't find the MIME type settings, create a new bucket:

1. Click **New Bucket**
2. Name: `product-images` (or keep existing and use new name in code)
3. **Public bucket**: ✅ Yes (enable)
4. **Allowed MIME types**: Add all image types above
5. **File size limit**: 5 MB (or higher if needed)
6. Click **Create bucket**

### 3. Update Bucket Policies (if needed)

Make sure the bucket has public read access:

Go to **Policies** tab and add:

```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Allow authenticated uploads
CREATE POLICY "Authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-images' AND auth.role() = 'authenticated' );
```

### 4. Test Upload
After updating settings, try uploading an image again from the admin panel.

## Quick Fix Alternative

If the bucket settings can't be changed easily, you can:

1. Delete the `product-images` bucket
2. Recreate it with proper MIME type settings
3. Re-upload any existing images

---

**Note:** Make sure the bucket is set to **Public** so product images are accessible to customers.
