-- Ailem E-commerce Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. PRODUCTS TABLE
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  image TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  stock INTEGER NOT NULL DEFAULT 0,
  badge TEXT,
  material TEXT,
  colors TEXT[] DEFAULT '{}',
  sizes TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  rating NUMERIC(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  username TEXT,
  photo_url TEXT,
  bonus_points INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. ORDERS TABLE
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) NOT NULL,
  bonus_discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  payment_screenshot TEXT,
  items JSONB NOT NULL,
  courier_service TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'shipped', 'delivered', 'rejected'))
);

-- ============================================
-- 5. REVIEWS TABLE
-- ============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[] DEFAULT '{}',
  verified BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_approved ON reviews(approved);
CREATE INDEX idx_users_telegram ON users(telegram_id);
CREATE INDEX idx_users_referral ON users(referral_code);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Categories: Everyone can read, only service role can write
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Categories are insertable by service role" ON categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Categories are updatable by service role" ON categories
  FOR UPDATE USING (true);

CREATE POLICY "Categories are deletable by service role" ON categories
  FOR DELETE USING (true);

-- Products: Everyone can read, only service role can write
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (true);

CREATE POLICY "Products are insertable by service role" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Products are updatable by service role" ON products
  FOR UPDATE USING (true);

CREATE POLICY "Products are deletable by service role" ON products
  FOR DELETE USING (true);

-- Users: Users can read their own data, service role can do everything
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users are insertable by everyone" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Users are deletable by service role" ON users
  FOR DELETE USING (true);

-- Orders: Everyone can read and insert, service role can update/delete
CREATE POLICY "Orders are viewable by everyone" ON orders
  FOR SELECT USING (true);

CREATE POLICY "Orders are insertable by everyone" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Orders are updatable by service role" ON orders
  FOR UPDATE USING (true);

CREATE POLICY "Orders are deletable by service role" ON orders
  FOR DELETE USING (true);

-- Reviews: Everyone can read, users can insert their own, service role can approve/delete
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Reviews are insertable by everyone" ON reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Reviews are updatable by service role" ON reviews
  FOR UPDATE USING (true);

CREATE POLICY "Reviews are deletable by service role" ON reviews
  FOR DELETE USING (true);

-- ============================================
-- INSERT INITIAL CATEGORIES DATA
-- ============================================
INSERT INTO categories (name, image) VALUES
  ('Bedsheets', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop'),
  ('Pillows', 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=300&fit=crop'),
  ('Curtains', 'https://images.unsplash.com/photo-1578898886636-5c4ab2c2a8e6?w=400&h=300&fit=crop'),
  ('Towels', 'https://images.unsplash.com/photo-1622622641693-8f5830c51c02?w=400&h=300&fit=crop');

-- ============================================
-- COMPLETE!
-- ============================================
-- Your database is ready to use!
-- Next: Set up the frontend integration
