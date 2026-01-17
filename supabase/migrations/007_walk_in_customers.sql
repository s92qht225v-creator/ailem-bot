-- Walk-in customers table for brick and mortar store
-- Stores customer information for repeat walk-in customers

CREATE TABLE IF NOT EXISTS walk_in_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  notes TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for phone lookup (most common search)
CREATE INDEX IF NOT EXISTS idx_walk_in_customers_phone ON walk_in_customers(phone);

-- Index for name search
CREATE INDEX IF NOT EXISTS idx_walk_in_customers_name ON walk_in_customers(name);

-- Enable RLS
ALTER TABLE walk_in_customers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users (cashiers)
CREATE POLICY "Allow all for authenticated users" ON walk_in_customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_walk_in_customer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS walk_in_customers_updated_at ON walk_in_customers;
CREATE TRIGGER walk_in_customers_updated_at
  BEFORE UPDATE ON walk_in_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_walk_in_customer_updated_at();

-- Function to update customer stats after order
CREATE OR REPLACE FUNCTION update_walk_in_customer_stats(
  p_phone TEXT,
  p_order_total DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE walk_in_customers
  SET
    total_orders = total_orders + 1,
    total_spent = total_spent + p_order_total
  WHERE phone = p_phone;
END;
$$ LANGUAGE plpgsql;
