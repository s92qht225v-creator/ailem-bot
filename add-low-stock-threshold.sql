-- Add inventory column to app_settings table
-- This stores inventory-related settings like low_stock_threshold
-- Run this in Supabase SQL Editor

-- Add inventory column if it doesn't exist (JSONB type to store threshold and other settings)
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '{"low_stock_threshold": 10}'::jsonb;

-- Set default value for existing row (id = 1)
UPDATE app_settings
SET inventory = '{"low_stock_threshold": 10}'::jsonb
WHERE id = 1 AND inventory IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN app_settings.inventory IS 'Inventory management settings including low_stock_threshold';

-- Verify the setting
SELECT id, inventory
FROM app_settings
WHERE id = 1;
