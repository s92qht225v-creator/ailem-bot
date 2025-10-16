-- ============================================
-- VERIFICATION SCRIPT FOR FAVORITES COLUMN
-- ============================================
-- Run this in Supabase Dashboard > SQL Editor
-- to check if the favorites column exists
-- ============================================

-- Step 1: Check if favorites column exists
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'favorites';

-- Expected result:
-- column_name | data_type | column_default | is_nullable
-- favorites   | ARRAY     | '{}'::text[]   | YES
--
-- If you see NO ROWS, the column doesn't exist - run migration-simple-add-columns.sql

-- ============================================

-- Step 2: Check if any users have NULL favorites
SELECT
  id,
  name,
  favorites IS NULL as has_null_favorites,
  favorites
FROM users
LIMIT 5;

-- If has_null_favorites is TRUE for any user, run this:
-- UPDATE users SET favorites = '{}' WHERE favorites IS NULL;

-- ============================================

-- Step 3: Test adding a favorite to a user
-- (Replace 'YOUR_USER_ID' with an actual user ID from your users table)
--
-- First, get a user ID:
-- SELECT id, name FROM users LIMIT 1;
--
-- Then test update:
-- UPDATE users
-- SET favorites = ARRAY['test-product-123']
-- WHERE id = 'YOUR_USER_ID'
-- RETURNING id, name, favorites;

-- ============================================
-- If all checks pass, the favorites functionality should work!
-- ============================================
