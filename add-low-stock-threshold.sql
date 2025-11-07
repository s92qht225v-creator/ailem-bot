-- Add low_stock_threshold to app_settings
-- This defines at what stock level to send low stock alerts
-- Run this in Supabase SQL Editor

-- Update app_settings to include low_stock_threshold (default to 10 units)
-- Using JSONB operations to add the field if it doesn't exist
UPDATE app_settings
SET settings = jsonb_set(
  settings,
  '{low_stock_threshold}',
  '10',
  true
)
WHERE key = 'inventory';

-- If the inventory settings key doesn't exist, create it
INSERT INTO app_settings (key, settings)
SELECT 'inventory', '{"low_stock_threshold": 10}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM app_settings WHERE key = 'inventory'
);

-- Add comment for documentation
COMMENT ON TABLE app_settings IS 'Application settings stored as key-value pairs with JSONB values';

-- Verify the setting
SELECT key, settings 
FROM app_settings 
WHERE key = 'inventory';
