-- ============================================
-- DATABASE MIGRATION SCRIPT
-- ============================================
-- This script adds missing columns to existing tables
-- Safe to run - uses IF NOT EXISTS to avoid errors
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Add missing columns to USERS table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referrals INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorites TEXT[] DEFAULT '{}';

-- Update existing users to ensure they have default values
UPDATE users
SET referrals = 0
WHERE referrals IS NULL;

UPDATE users
SET favorites = '{}'
WHERE favorites IS NULL;

-- Add missing columns to PRODUCTS table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS weight NUMERIC(10, 2);

-- Update existing products to ensure they have default values
UPDATE products
SET variants = '[]'::jsonb
WHERE variants IS NULL;

-- Add missing columns to ORDERS table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_telegram_id TEXT,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_info JSONB,
  ADD COLUMN IF NOT EXISTS courier TEXT,
  ADD COLUMN IF NOT EXISTS bonus_points_used INTEGER DEFAULT 0;

-- Make order_number nullable (allow explicit IDs)
ALTER TABLE orders
  ALTER COLUMN order_number DROP NOT NULL;

-- Drop old columns that were replaced (if they exist)
-- Only if you had the old schema with customer_name, customer_phone, etc.
DO $$
BEGIN
  -- Check and drop customer_name if user_name exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='customer_name'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='user_name'
  ) THEN
    -- Copy data from old columns to new ones if new ones are empty
    UPDATE orders
    SET user_name = customer_name
    WHERE user_name IS NULL AND customer_name IS NOT NULL;

    ALTER TABLE orders DROP COLUMN IF EXISTS customer_name;
  END IF;

  -- Check and drop customer_phone if user_phone exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='customer_phone'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='user_phone'
  ) THEN
    UPDATE orders
    SET user_phone = customer_phone
    WHERE user_phone IS NULL AND customer_phone IS NOT NULL;

    ALTER TABLE orders DROP COLUMN IF EXISTS customer_phone;
  END IF;

  -- Check and migrate delivery_address/city to delivery_info
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='delivery_address'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='delivery_info'
  ) THEN
    UPDATE orders
    SET delivery_info = jsonb_build_object(
      'address', delivery_address,
      'city', city
    )
    WHERE delivery_info IS NULL AND delivery_address IS NOT NULL;

    ALTER TABLE orders DROP COLUMN IF EXISTS delivery_address;
    ALTER TABLE orders DROP COLUMN IF EXISTS city;
  END IF;

  -- Check and drop courier_service if courier exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='courier_service'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='courier'
  ) THEN
    UPDATE orders
    SET courier = courier_service
    WHERE courier IS NULL AND courier_service IS NOT NULL;

    ALTER TABLE orders DROP COLUMN IF EXISTS courier_service;
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration worked:

-- Check users table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('referrals', 'favorites')
ORDER BY column_name;

-- Check products table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('variants', 'weight')
ORDER BY column_name;

-- Check orders table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('user_telegram_id', 'user_name', 'user_phone', 'delivery_info', 'courier', 'bonus_points_used')
ORDER BY column_name;

-- ============================================
-- SUCCESS!
-- ============================================
-- If all verification queries return results,
-- your database is now updated and the app
-- should work without crashing!
-- ============================================
