-- Add payment_type column to shipping_rates table
-- This allows different couriers to have different payment methods (prepaid vs postpaid)
-- Run this in Supabase SQL Editor

-- Add payment_type column with default 'prepaid' (preserves current behavior)
ALTER TABLE shipping_rates
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'prepaid' NOT NULL;

-- Add constraint to ensure only valid values
ALTER TABLE shipping_rates
ADD CONSTRAINT shipping_rates_payment_type_check
CHECK (payment_type IN ('prepaid', 'postpaid'));

-- Add comment for documentation
COMMENT ON COLUMN shipping_rates.payment_type IS 'Payment method: prepaid (pay online) or postpaid (pay at pickup point)';

-- Verify the changes
SELECT
  courier,
  state,
  first_kg,
  additional_kg,
  payment_type
FROM shipping_rates
ORDER BY courier, state;
