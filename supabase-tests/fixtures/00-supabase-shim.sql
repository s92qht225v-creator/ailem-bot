-- Minimal stand-in for the parts of Supabase the category migration relies on.
-- Mirrors Supabase defaults: API roles, BYPASSRLS service_role, auth.uid(),
-- default table/function grants to the API roles, storage.buckets.

CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

CREATE SCHEMA extensions;
CREATE FUNCTION extensions.uuid_generate_v4() RETURNS uuid
LANGUAGE sql VOLATILE AS $$ SELECT gen_random_uuid() $$;
-- Some repo SQL calls it unqualified
CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid
LANGUAGE sql VOLATILE AS $$ SELECT gen_random_uuid() $$;

CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);

-- Same resolution order as Supabase's auth.uid()
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
CREATE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
$$;

GRANT USAGE ON SCHEMA auth, extensions, public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth, extensions TO anon, authenticated, service_role;

-- Supabase grants API roles everything on new public objects by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- storage.objects exactly as PRODUCTION (pre-check 2026-10-25): RLS on,
-- four permissive {public} policies on product-images, anon/authenticated
-- hold DELETE, INSERT, SELECT, UPDATE.
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb,
  UNIQUE (bucket_id, name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_images_select ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');
CREATE POLICY product_images_insert ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'product-images');
CREATE POLICY product_images_update ON storage.objects FOR UPDATE TO public USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');
CREATE POLICY product_images_delete ON storage.objects FOR DELETE TO public USING (bucket_id = 'product-images');
-- Test-only bucket (not in production) to prove the new policies leave other buckets alone
CREATE POLICY t_other_bucket_all ON storage.objects FOR ALL TO public USING (bucket_id = 'other-bucket') WITH CHECK (bucket_id = 'other-bucket');
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.objects TO service_role;
