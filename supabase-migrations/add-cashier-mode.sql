-- Cashier Mode Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ADD ROLE TO USERS TABLE
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- 2. ADD BARCODE TO PRODUCTS TABLE
-- ============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Create index for barcode lookups (for scanner)
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- ============================================
-- 3. ADD CASH PAYMENT FIELDS TO ORDERS TABLE
-- ============================================
-- Payment method: 'payme', 'click', 'cash'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'payme';

-- Cash-specific fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_received NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_given NUMERIC(10, 2);

-- Cashier who processed the order (for cash sales)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_name TEXT;

-- Update the status constraint to include 'completed' for immediate cash sales
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE orders ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'shipped', 'delivered', 'rejected', 'completed'));

-- ============================================
-- 4. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN users.role IS 'User role: customer (default), cashier';
COMMENT ON COLUMN products.barcode IS 'Product barcode for scanner lookup';
COMMENT ON COLUMN orders.payment_method IS 'Payment method: payme, click, cash';
COMMENT ON COLUMN orders.cash_received IS 'Amount of cash received from customer';
COMMENT ON COLUMN orders.change_given IS 'Change returned to customer';
COMMENT ON COLUMN orders.cashier_id IS 'ID of cashier who processed the cash sale';
COMMENT ON COLUMN orders.cashier_name IS 'Name of cashier for quick reference';

-- ============================================
-- DONE!
-- ============================================
-- Next steps:
-- 1. Update API to include role in user data
-- 2. Add role management to admin panel
-- 3. Create CashierMode component