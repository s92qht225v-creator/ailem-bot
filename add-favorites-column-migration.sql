-- Add favorites column to users table
-- Run this in Supabase SQL Editor

-- Add favorites column (TEXT array for storing product IDs)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS favorites TEXT[] DEFAULT '{}';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'favorites';
