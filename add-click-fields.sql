-- Add Click.uz transaction fields to orders table
-- Run this in Supabase SQL Editor

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS click_order_id TEXT,
ADD COLUMN IF NOT EXISTS click_trans_id TEXT,
ADD COLUMN IF NOT EXISTS click_prepare_time BIGINT,
ADD COLUMN IF NOT EXISTS click_complete_time BIGINT,
ADD COLUMN IF NOT EXISTS click_error INTEGER;

-- Add indexes for faster transaction lookups
CREATE INDEX IF NOT EXISTS idx_orders_click_order_id
ON orders(click_order_id);

CREATE INDEX IF NOT EXISTS idx_orders_click_trans_id
ON orders(click_trans_id);

-- Add comments
COMMENT ON COLUMN orders.click_order_id IS 'Click merchant_trans_id (our order reference)';
COMMENT ON COLUMN orders.click_trans_id IS 'Click transaction ID from Click.uz';
COMMENT ON COLUMN orders.click_prepare_time IS 'Timestamp when Click prepare was called';
COMMENT ON COLUMN orders.click_complete_time IS 'Timestamp when Click complete was successful';
COMMENT ON COLUMN orders.click_error IS 'Click error code if payment failed';
