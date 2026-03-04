-- Add cart column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users
ADD COLUMN cart JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN users.cart IS 'Stores user cart items as JSONB array';
