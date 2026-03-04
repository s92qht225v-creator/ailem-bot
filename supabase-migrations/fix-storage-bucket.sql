-- Fix Supabase Storage Bucket MIME Type Configuration
-- Run this in Supabase SQL Editor

-- Update the product-images bucket to allow common image MIME types
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  file_size_limit = 5242880  -- 5 MB in bytes
WHERE id = 'product-images';

-- Verify the update
SELECT 
  id,
  name,
  public,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets
WHERE id = 'product-images';

-- If bucket doesn't exist, create it:
-- (Uncomment if needed)
/*
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'product-images',
  'product-images',
  true,  -- Make bucket public
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  5242880  -- 5 MB
)
ON CONFLICT (id) DO UPDATE
SET 
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit,
  public = EXCLUDED.public;
*/

-- Ensure proper RLS policies for the bucket
-- Allow public SELECT (read)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Allow authenticated INSERT (upload)
DROP POLICY IF EXISTS "Authenticated uploads" ON storage.objects;
CREATE POLICY "Authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'product-images' );

-- Allow authenticated UPDATE
DROP POLICY IF EXISTS "Authenticated updates" ON storage.objects;
CREATE POLICY "Authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'product-images' )
WITH CHECK ( bucket_id = 'product-images' );

-- Allow authenticated DELETE
DROP POLICY IF EXISTS "Authenticated deletes" ON storage.objects;
CREATE POLICY "Authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'product-images' );
