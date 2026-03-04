-- Fix Admin Panel Image Upload Issues
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/editor)

-- Step 1: Check if bucket exists
SELECT 
  id,
  name,
  public,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets
WHERE id = 'product-images';

-- Step 2: Create or update the bucket with correct settings
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'product-images',
  'product-images',
  true,  -- Make bucket public for read access
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif'
  ],
  10485760  -- 10 MB (increased from 5 MB for high-quality product images)
)
ON CONFLICT (id) DO UPDATE
SET 
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit,
  public = EXCLUDED.public;

-- Step 3: Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Admin uploads" ON storage.objects;

-- Step 4: Create RLS policies

-- Allow ANYONE to read (SELECT) from product-images bucket
-- This is needed so customers can see product images
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Allow authenticated users to upload (INSERT) to product-images bucket
-- This allows admin users to upload images
CREATE POLICY "Authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'product-images' );

-- Allow authenticated users to update files in product-images bucket
CREATE POLICY "Authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'product-images' )
WITH CHECK ( bucket_id = 'product-images' );

-- Allow authenticated users to delete files from product-images bucket
CREATE POLICY "Authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'product-images' );

-- Step 5: Verify the setup
SELECT 
  id,
  name,
  public,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets
WHERE id = 'product-images';

-- Step 6: Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Expected result:
-- - Bucket 'product-images' exists with public=true
-- - allowed_mime_types includes all image formats
-- - 4 policies exist: public read, authenticated insert/update/delete
