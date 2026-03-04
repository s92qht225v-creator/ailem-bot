-- Add volume_pricing column to products table
-- This stores tiered pricing rules for quantity-based discounts
-- Run this in Supabase SQL Editor

-- Add volume_pricing column if it doesn't exist (JSONB array type)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS volume_pricing JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN products.volume_pricing IS 'Volume pricing tiers: [{"min_qty": 3, "max_qty": 5, "price": 140000}, ...]';

-- Example: Set volume pricing for a test product (optional - remove if not needed)
-- UPDATE products
-- SET volume_pricing = '[
--   {"min_qty": 3, "max_qty": 5, "price": 140000},
--   {"min_qty": 6, "max_qty": 10, "price": 130000},
--   {"min_qty": 11, "max_qty": null, "price": 120000}
-- ]'::jsonb
-- WHERE id = 'your-product-id';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'volume_pricing';
