-- Add cash/POS payment fields to orders table
-- These fields store information for in-store cash transactions

-- Payment method (cash, online, etc.)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Cash payment details
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_received DECIMAL(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_given DECIMAL(12, 2);

-- Cashier information
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_name TEXT;

-- Walk-in customer information
ALTER TABLE orders ADD COLUMN IF NOT EXISTS walk_in_customer_id UUID REFERENCES walk_in_customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS walk_in_customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS walk_in_customer_phone TEXT;

-- Index for filtering orders by payment method
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

-- Index for filtering orders by cashier
CREATE INDEX IF NOT EXISTS idx_orders_cashier_id ON orders(cashier_id);
