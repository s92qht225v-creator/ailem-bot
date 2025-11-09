-- Stock Notifications Feature Migration
-- Enables users to subscribe to out-of-stock product alerts via Telegram

-- Create stock_notifications table
CREATE TABLE IF NOT EXISTS stock_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_color TEXT,
  variant_size TEXT,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_stock_notifications_product ON stock_notifications(product_id, notified);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_user ON stock_notifications(user_id);

-- Add unique constraint to prevent duplicate subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_notifications_unique
  ON stock_notifications(user_id, product_id, COALESCE(variant_color, ''), COALESCE(variant_size, ''));

-- Comment for documentation
COMMENT ON TABLE stock_notifications IS 'Tracks user subscriptions for out-of-stock product notifications';
COMMENT ON COLUMN stock_notifications.variant_color IS 'Variant color (null if subscribing to product without variant specificity)';
COMMENT ON COLUMN stock_notifications.variant_size IS 'Variant size (null if subscribing to product without variant specificity)';
COMMENT ON COLUMN stock_notifications.notified IS 'Whether the user has been notified about stock availability';
