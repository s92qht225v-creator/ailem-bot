-- PRE-migration schema matching PRODUCTION's permissions as read by the
-- 2026-10-25 production pre-check (audit-reports/.../production-precheck-review):
--   * RLS DISABLED on admin_users, categories, products, audit_logs
--   * anon/authenticated hold ALL table privileges (shim default privileges)
--   * the existing (inert) policies, by name
--   * audit_logs.id uuid, products.images / reviews.images text[]
-- Table shapes are reduced to the columns these tests need. Synthetic data only.

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT '{}',
  variants JSONB DEFAULT '[]',
  a_plus_content JSONB,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.reviews (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID, images TEXT[] DEFAULT '{}', comment TEXT);
CREATE TABLE public.app_settings (id INTEGER PRIMARY KEY DEFAULT 1, banners JSONB DEFAULT '[]', bonus_config JSONB, inventory JSONB);
-- orders/users: the columns the payment webhooks use (types as in production)
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY, items JSONB DEFAULT '[]', status TEXT DEFAULT 'pending',
  total NUMERIC, subtotal NUMERIC, user_id TEXT, user_telegram_id TEXT,
  payme_order_id TEXT, payme_transaction_id TEXT, payme_state INTEGER,
  payme_create_time BIGINT, payme_perform_time BIGINT, payme_cancel_time BIGINT, payme_cancel_reason INTEGER,
  click_order_id TEXT, click_trans_id TEXT, click_prepare_time BIGINT, click_complete_time BIGINT, click_error INTEGER
);
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cart JSONB DEFAULT '[]',
  bonus_points INTEGER DEFAULT 0, total_orders INTEGER DEFAULT 0,
  referral_code TEXT, referred_by TEXT, referrals INTEGER DEFAULT 0
);
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT, entity_type TEXT, entity_id TEXT,
  admin_id TEXT, admin_email TEXT,
  old_data TEXT, new_data TEXT, metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin'
);
-- admin_users: policies exist, RLS DISABLED (production) → policies inert
CREATE POLICY "Users can check if they are admin" ON public.admin_users
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Only service role can modify admin_users" ON public.admin_users
  FOR ALL TO service_role USING (true);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()); $$;

-- Reduced stand-in for production's get_essential_data(boolean): SECURITY
-- DEFINER, anon-executable, categories/products via row_to_json (pre-check 8b)
CREATE OR REPLACE FUNCTION public.get_essential_data(lightweight boolean DEFAULT true)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT jsonb_build_object(
    'products', COALESCE((SELECT jsonb_agg(row_to_json(p)::jsonb) FROM public.products p), '[]'::jsonb),
    'categories', COALESCE((SELECT jsonb_agg(row_to_json(c)::jsonb) FROM public.categories c), '[]'::jsonb));
$$;

-- categories: production policy set, RLS DISABLED
CREATE POLICY "Allow all operations on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories are insertable by service role" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Categories are updatable by service role" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Categories are deletable by service role" ON public.categories FOR DELETE USING (true);

-- products: production policy set, RLS DISABLED
CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Products are insertable by service role" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Products are updatable by service role" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Products are deletable by service role" ON public.products FOR DELETE USING (true);

-- audit_logs: no policies, RLS DISABLED (production)

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'admin@test'),
  ('00000000-0000-0000-0000-00000000b002', 'customer@test');
INSERT INTO public.admin_users (user_id) VALUES ('00000000-0000-0000-0000-00000000a001');

INSERT INTO public.categories (id, name, image, visible, created_at) VALUES
  ('00000000-0000-0000-0000-000000000c01', 'Choyshab', 'https://proj.supabase.co/storage/v1/object/public/product-images/categories/choyshab.svg', true, '2026-01-01'),
  ('00000000-0000-0000-0000-000000000c02', 'Dasturxon', 'https://proj.supabase.co/storage/v1/object/public/product-images/categories/dasturxon.svg', true, '2026-01-02'),
  ('00000000-0000-0000-0000-000000000c03', 'Pled', 'https://proj.supabase.co/storage/v1/object/public/product-images/categories/pled.svg', false, '2026-01-03');

INSERT INTO public.products (id, name, category_name, image) VALUES
  ('00000000-0000-0000-0000-000000000d01', 'Choyshab 1', 'Choyshab', 'https://proj.supabase.co/storage/v1/object/public/product-images/products/p1.jpg'),
  ('00000000-0000-0000-0000-000000000d02', 'Choyshab 2', 'Choyshab', 'https://proj.supabase.co/storage/v1/object/public/product-images/products/p2.jpg'),
  ('00000000-0000-0000-0000-000000000d03', 'Dasturxon 1', 'Dasturxon', 'https://proj.supabase.co/storage/v1/object/public/product-images/products/p3.jpg'),
  ('00000000-0000-0000-0000-000000000d04', 'Orphan', 'Bedsheets', 'https://proj.supabase.co/storage/v1/object/public/product-images/products/p4.jpg');

INSERT INTO public.app_settings (id, banners) VALUES (1, '[]');
INSERT INTO public.audit_logs (action, entity_type, admin_email) VALUES ('user.update', 'user', 'admin@test');
INSERT INTO storage.objects (bucket_id, name) VALUES ('product-images', 'categories/choyshab.svg');
