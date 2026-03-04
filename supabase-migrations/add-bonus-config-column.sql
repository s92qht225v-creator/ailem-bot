-- Add bonus_config column to app_settings table
-- Run this in Supabase SQL Editor

-- Add bonus_config column as JSONB
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS bonus_config JSONB DEFAULT '{"purchaseBonus": 3, "referralCommission": 10}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN app_settings.bonus_config IS 'Bonus points configuration: purchaseBonus (% of order total awarded to customer), referralCommission (% of referred user first order awarded to referrer)';

-- Update the existing row to have the default bonus config if it doesn't have one
UPDATE app_settings
SET bonus_config = '{"purchaseBonus": 3, "referralCommission": 10}'::jsonb
WHERE id = 1 AND bonus_config IS NULL;
