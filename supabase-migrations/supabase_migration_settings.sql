-- Create app_settings table to store banner and timer configuration
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  sale_banner JSONB DEFAULT '{"title": "Summer Sale", "subtitle": "Up to 50% Off on Selected Items", "imageUrl": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=400&fit=crop", "enabled": true}'::jsonb,
  sale_timer JSONB DEFAULT '{"endDate": "2025-12-31T23:59:59", "enabled": true}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- Insert initial row
INSERT INTO app_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all users to read settings
CREATE POLICY "Allow public read access" ON app_settings
  FOR SELECT USING (true);

-- Allow authenticated users to update settings (admins)
CREATE POLICY "Allow authenticated updates" ON app_settings
  FOR UPDATE USING (true);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
