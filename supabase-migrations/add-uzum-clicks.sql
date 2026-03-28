-- Track UZUM button clicks for analytics
CREATE TABLE IF NOT EXISTS uzum_clicks (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow inserts from frontend (anon key)
ALTER TABLE uzum_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert uzum_clicks" ON uzum_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select uzum_clicks" ON uzum_clicks FOR SELECT USING (true);

-- Index for quick aggregation by product
CREATE INDEX IF NOT EXISTS idx_uzum_clicks_product_id ON uzum_clicks(product_id);
