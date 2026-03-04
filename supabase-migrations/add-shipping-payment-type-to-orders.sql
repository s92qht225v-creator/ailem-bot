-- Add shipping_payment_type column to orders table
-- This tracks whether shipping was paid online or will be paid at pickup
-- Run this in Supabase SQL Editor

-- Add shipping_payment_type column with default 'prepaid' (preserves current behavior)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_payment_type TEXT DEFAULT 'prepaid' NOT NULL;

-- Add constraint to ensure only valid values
ALTER TABLE orders
ADD CONSTRAINT orders_shipping_payment_type_check
CHECK (shipping_payment_type IN ('prepaid', 'postpaid'));

-- Add comment for documentation
COMMENT ON COLUMN orders.shipping_payment_type IS 'How shipping fee is paid: prepaid (included in online payment) or postpaid (paid at pickup point)';

-- Create index for queries filtering by payment type
CREATE INDEX IF NOT EXISTS idx_orders_shipping_payment_type ON orders(shipping_payment_type);

-- Verify the changes
SELECT
  order_number,
  courier,
  delivery_fee,
  shipping_payment_type,
  total,
  status
FROM orders
ORDER BY created_at DESC
LIMIT 10;
