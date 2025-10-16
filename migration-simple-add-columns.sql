-- ============================================
-- SIMPLE DATABASE MIGRATION SCRIPT
-- ============================================
-- This script ONLY adds missing columns
-- Does NOT modify or drop existing columns
-- Safe to run multiple times
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Add missing columns to USERS table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referrals INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorites TEXT[] DEFAULT '{}';

-- Update existing users to ensure they have default values
UPDATE users SET referrals = 0 WHERE referrals IS NULL;
UPDATE users SET favorites = '{}' WHERE favorites IS NULL;

-- Add missing columns to PRODUCTS table
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight NUMERIC(10, 2);

-- Update existing products to ensure they have default values
UPDATE products SET variants = '[]'::jsonb WHERE variants IS NULL;

-- Add missing columns to ORDERS table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_telegram_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_info JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bonus_points_used INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Update existing orders to ensure they have default values
UPDATE orders SET bonus_points_used = 0 WHERE bonus_points_used IS NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration worked:

SELECT 'USERS TABLE' as table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('referrals', 'favorites')
ORDER BY column_name;

SELECT 'PRODUCTS TABLE' as table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('variants', 'weight')
ORDER BY column_name;

SELECT 'ORDERS TABLE' as table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('user_telegram_id', 'user_name', 'user_phone', 'delivery_info', 'courier', 'bonus_points_used', 'order_number')
ORDER BY column_name;

-- ============================================
-- SUCCESS!
-- ============================================
-- If all verification queries return results,
-- your database is now updated!
-- ============================================
