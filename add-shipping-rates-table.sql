-- Shipping Rates Table Migration
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier TEXT NOT NULL,
  state TEXT NOT NULL,
  first_kg INTEGER NOT NULL,
  additional_kg INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(courier, state)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shipping_rates_courier ON shipping_rates(courier);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_state ON shipping_rates(state);

-- Add updated_at trigger
CREATE TRIGGER update_shipping_rates_updated_at BEFORE UPDATE ON shipping_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read shipping rates
CREATE POLICY "Shipping rates are viewable by everyone" ON shipping_rates
  FOR SELECT USING (true);

-- Only service role can modify
CREATE POLICY "Shipping rates are insertable by service role" ON shipping_rates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Shipping rates are updatable by service role" ON shipping_rates
  FOR UPDATE USING (true);

CREATE POLICY "Shipping rates are deletable by service role" ON shipping_rates
  FOR DELETE USING (true);

-- Insert default shipping rates
INSERT INTO shipping_rates (courier, state, first_kg, additional_kg) VALUES
  ('BTS', 'Tashkent Region', 15000, 5000),
  ('BTS', 'Samarkand Region', 20000, 7000),
  ('Starex', 'Tashkent Region', 18000, 6000),
  ('EMU', 'Tashkent Region', 12000, 4000),
  ('UzPost', 'Tashkent Region', 10000, 3000),
  ('Yandex', 'Tashkent', 25000, 0)
ON CONFLICT (courier, state) DO NOTHING;
