-- Add visible column to products table
-- Date: 2026-02-10
-- Purpose: Allow admin to show/hide products from customer views

-- Add visible column with default true (all existing products will be visible)
ALTER TABLE products ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true;

-- Update any NULL values to true
UPDATE products SET visible = true WHERE visible IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN products.visible IS 'Controls whether product is shown to customers. Admin panel shows all products.';
