-- Fix Storage RLS for product-images bucket
-- Run this in Supabase SQL Editor

-- First, check if RLS is enabled on storage.objects
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'objects'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');

-- Check existing policies
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Drop ALL existing storage policies to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Create simple permissive policies for product-images bucket
-- SELECT: anyone can read (public bucket)
CREATE POLICY "product_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- INSERT: anyone can upload (we rely on app-level auth, not DB-level)
CREATE POLICY "product_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images');

-- UPDATE: anyone can update
CREATE POLICY "product_images_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

-- DELETE: anyone can delete
CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images');

-- Verify
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
