-- Add Payme transaction fields to orders table
-- Run this in Supabase SQL Editor

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payme_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payme_create_time BIGINT,
ADD COLUMN IF NOT EXISTS payme_perform_time BIGINT,
ADD COLUMN IF NOT EXISTS payme_cancel_time BIGINT,
ADD COLUMN IF NOT EXISTS payme_state INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payme_cancel_reason INTEGER;

-- Add index for faster transaction lookups
CREATE INDEX IF NOT EXISTS idx_orders_payme_transaction 
ON orders(payme_transaction_id);

-- Add comments
COMMENT ON COLUMN orders.payme_transaction_id IS 'Payme transaction ID';
COMMENT ON COLUMN orders.payme_state IS 'Payme transaction state: 1=created, 2=completed, -1=cancelled, -2=cancelled_after_complete';
