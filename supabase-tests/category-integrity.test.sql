-- Database tests for supabase-migrations/add-category-integrity.sql
-- Run by supabase-tests/run-db-tests.sh against a disposable local Postgres
-- (shim + baseline + migration applied twice). Any failed assertion raises
-- an exception and psql stops with a non-zero exit code.
\set ON_ERROR_STOP on
\set QUIET on
-- Only NOTICE (PASS) lines and \echo headers are printed
\o /dev/null
SET client_min_messages = notice;

\set admin   '00000000-0000-0000-0000-00000000a001'
\set customer '00000000-0000-0000-0000-00000000b002'
\set choy    '00000000-0000-0000-0000-000000000c01'
\set dast    '00000000-0000-0000-0000-000000000c02'
\set pled    '00000000-0000-0000-0000-000000000c03'
\set OWN     'https://proj.supabase.co/storage/v1/object/public/product-images/'

-- ---------------------------------------------------------------------------
-- Test helpers (callable by every role)
-- ---------------------------------------------------------------------------
CREATE SCHEMA t;
GRANT USAGE ON SCHEMA t TO anon, authenticated, service_role;

CREATE FUNCTION t.ok(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END $$;

-- Statement must fail with the given SQLSTATE
CREATE FUNCTION t.fails(p_sql text, p_state text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = p_state THEN
      RAISE NOTICE 'PASS: % (% %)', label, SQLSTATE, left(SQLERRM, 70);
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL: % — expected SQLSTATE %, got % (%)', label, p_state, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'FAIL: % — expected SQLSTATE %, statement succeeded', label, p_state;
END $$;

-- Statement must succeed and affect exactly n rows
CREATE FUNCTION t.rows(p_sql text, n integer, label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c integer;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS c = ROW_COUNT;
  IF c <> n THEN RAISE EXCEPTION 'FAIL: % — expected % rows, got %', label, n, c; END IF;
  RAISE NOTICE 'PASS: % (% rows)', label, c;
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA t TO anon, authenticated, service_role;

CREATE FUNCTION t.cat(p uuid) RETURNS text LANGUAGE sql AS $$ SELECT name FROM public.categories WHERE id = p $$;
CREATE FUNCTION t.order_names() RETURNS text LANGUAGE sql AS $$ SELECT string_agg(name, ',' ORDER BY sort_order) FROM public.categories $$;
-- Edit through the app's save RPC with a fresh operation id; image defaults to the current one
CREATE FUNCTION t.save(p_id uuid, p_name text, p_expected text, p_image text DEFAULT NULL) RETURNS public.categories
LANGUAGE sql AS $$
  SELECT * FROM public.admin_save_category(gen_random_uuid(), p_id, p_name,
    COALESCE(p_image, (SELECT image FROM public.categories WHERE id = p_id), 'x'), p_expected)
$$;
GRANT EXECUTE ON FUNCTION t.save(uuid, text, text, text) TO anon, authenticated, service_role;
CREATE FUNCTION t.ref(p_url text) RETURNS text LANGUAGE sql AS $$ SELECT public.storage_reference_status(p_url) ->> 'status' $$;

\echo '== Migration =='
SELECT t.ok((SELECT count(*) = 3 FROM categories WHERE sort_order IS NOT NULL), 'sort_order backfilled for every category');
SELECT t.ok(t.order_names() = 'Choyshab,Dasturxon,Pled', 'backfilled order follows created_at');
SELECT t.ok((SELECT category_id = :'choy' FROM products WHERE name = 'Choyshab 1'), 'category_id backfilled from category_name');
SELECT t.ok((SELECT category_id IS NULL AND category_name = 'Bedsheets' FROM products WHERE name = 'Orphan'), 'orphan product left untouched');
SELECT t.ok((SELECT image LIKE '%choyshab.svg' FROM categories WHERE id = :'choy'), 'SVG category image preserved');
SELECT t.ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.categories'::regclass), 'RLS enabled on categories');
SELECT t.ok(
  (SELECT string_agg(cmd || ':' || array_to_string(roles, '+') || ':' || COALESCE(qual, '-') || ':' || COALESCE(with_check, '-'), ' | ' ORDER BY cmd)
   FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories')
  = 'DELETE:authenticated:is_admin():- | INSERT:authenticated:-:is_admin() | SELECT:public:true:- | UPDATE:authenticated:is_admin():is_admin()',
  'old permissive policies replaced by exactly 4 policies');
SELECT t.ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND cmd <> 'SELECT' AND (qual = 'true' OR with_check = 'true')),
  'no permissive write policy remains');
SELECT t.ok(NOT has_table_privilege('anon', 'public.categories', 'UPDATE'), 'anon has no UPDATE grant');
SELECT t.ok(NOT has_table_privilege('authenticated', 'public.categories', 'TRUNCATE'), 'authenticated has no TRUNCATE grant');
SELECT t.ok(NOT has_function_privilege('anon', 'public.reorder_categories(uuid[])', 'EXECUTE'), 'anon cannot execute reorder_categories');
SELECT t.ok(NOT has_function_privilege('anon', 'public.admin_save_category(uuid,uuid,text,text,text)', 'EXECUTE'), 'anon cannot execute admin_save_category');
SELECT t.ok(NOT has_function_privilege('anon', 'public.resolve_category_write(uuid)', 'EXECUTE'), 'anon cannot execute resolve_category_write');
SELECT t.ok(to_regprocedure('public.admin_update_category(uuid,text,text,text)') IS NULL, 'superseded admin_update_category removed');
SELECT t.ok(to_regprocedure('public.category_record_write(uuid)') IS NULL, 'superseded category_record_write removed');
SELECT t.ok(NOT has_function_privilege('anon', 'public.storage_reference_status(text)', 'EXECUTE'), 'anon cannot execute storage_reference_status');
SELECT t.ok(to_regprocedure('public.storage_url_is_referenced(text)') IS NULL, 'earlier draft RPC removed');

-- ===========================================================================
\echo '== R1 anonymous caller =='
SELECT set_config('request.jwt.claims', '{"role":"anon"}', false);
SET ROLE anon;
SELECT t.ok((SELECT count(*) = 3 FROM categories), 'anon can still read categories');
SELECT t.fails($$UPDATE categories SET name = 'Anonymous rename' WHERE name = 'Choyshab'$$, '42501', 'anon rename denied');
SELECT t.fails($$INSERT INTO categories (name, image) VALUES ('Anon', 'x')$$, '42501', 'anon insert denied');
SELECT t.fails($$DELETE FROM categories WHERE name = 'Pled'$$, '42501', 'anon delete denied');
SELECT t.fails($$TRUNCATE categories CASCADE$$, '42501', 'anon truncate denied');
SELECT t.fails(format('SELECT reorder_categories(ARRAY[%L,%L,%L]::uuid[])', :'pled', :'dast', :'choy'), '42501', 'anon reorder RPC denied');
SELECT t.fails(format('SELECT t.save(%L, %L, %L)', :'choy', 'X', 'Choyshab'), '42501', 'anon rename RPC denied');
SELECT t.fails(format('SELECT storage_reference_status(%L)', :'OWN' || 'a.png'), '42501', 'anon reference RPC denied');
RESET ROLE;
SELECT t.ok(t.cat(:'choy') = 'Choyshab', 'category unchanged after anon attempts');
SELECT t.ok((SELECT count(*) = 2 FROM products WHERE category_name = 'Choyshab'), 'protected products unchanged after anon attempts');

\echo '== R1 authenticated non-admin =='
SELECT set_config('request.jwt.claims', json_build_object('sub', :'customer', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.ok(NOT is_admin(), 'customer is not admin');
SELECT t.rows($$UPDATE categories SET name = 'Hijacked' WHERE name = 'Choyshab'$$, 0, 'non-admin UPDATE filtered by RLS');
SELECT t.rows($$DELETE FROM categories WHERE name = 'Pled'$$, 0, 'non-admin DELETE filtered by RLS');
SELECT t.fails($$INSERT INTO categories (name, image) VALUES ('Nope', 'x')$$, '42501', 'non-admin INSERT rejected by RLS');
SELECT t.fails($$TRUNCATE categories CASCADE$$, '42501', 'non-admin TRUNCATE denied');
SELECT t.fails(format('SELECT reorder_categories(ARRAY[%L,%L,%L]::uuid[])', :'pled', :'dast', :'choy'), '42501', 'non-admin reorder denied');
SELECT t.fails(format('SELECT t.save(%L, %L, %L)', :'choy', 'Hijacked', 'Choyshab'), '42501', 'non-admin rename RPC denied');
SELECT t.fails(format('SELECT storage_reference_status(%L)', :'OWN' || 'a.png'), '42501', 'non-admin reference RPC denied');
RESET ROLE;
SELECT t.ok(t.cat(:'choy') = 'Choyshab' AND t.order_names() = 'Choyshab,Dasturxon,Pled', 'nothing changed by non-admin');
SELECT t.ok((SELECT count(*) = 2 FROM products WHERE category_name = 'Choyshab'), 'products unchanged by non-admin');

-- ===========================================================================
\echo '== R1/R5 admin: atomic rename via RPC =='
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.ok(is_admin(), 'admin recognised');
SELECT t.ok((SELECT name = 'Choyshablar' FROM t.save(:'choy', '  Choyshablar  ', 'Choyshab')), 'admin rename returns normalized row');
SELECT t.ok((SELECT count(*) = 2 FROM products WHERE category_name = 'Choyshablar' AND category_id = :'choy'), 'rename propagated to products in same call');
SELECT t.ok(NOT EXISTS (SELECT 1 FROM products WHERE category_name = 'Choyshab'), 'no product left on old name');
SELECT t.fails(format('SELECT t.save(%L, %L, %L)', :'choy', 'Other', 'Choyshab'), 'PT409', 'stale expected name rejected');
SELECT t.fails(format('SELECT t.save(%L, %L, %L)', :'choy', 'dasturxon ', 'Choyshablar'), '23505', 'duplicate (case/space-insensitive) rejected');
SELECT t.fails(format('SELECT t.save(%L, %L, %L)', :'choy', '   ', 'Choyshablar'), '22023', 'blank name rejected');
SELECT t.fails(format('SELECT t.save(%L, %L, %L)', :'choy', repeat('x', 101), 'Choyshablar'), '22023', '101-char name rejected');
SELECT t.fails(format('SELECT t.save(%L, %L, %L, %L)', :'choy', 'Ok', 'Choyshablar', ' '), '22023', 'blank image rejected');
SELECT t.fails(format('SELECT t.save(%L, %L, %L)', '00000000-0000-0000-0000-0000000000ff', 'Ok', NULL), 'P0002', 'missing category rejected');
SELECT t.ok((SELECT image LIKE '%new.svg' AND name = 'Choyshab' FROM t.save(:'choy', 'Choyshab', 'Choyshablar', :'OWN' || 'categories/new.svg')), 'rename + image in one call');
SELECT t.fails($$UPDATE categories SET name = ' padded' WHERE name = 'Pled'$$, '23514', 'CHECK rejects untrimmed name');
SELECT t.fails($$UPDATE categories SET image = '' WHERE name = 'Pled'$$, '23514', 'CHECK rejects blank image');
SELECT t.fails($$INSERT INTO categories (name, image) VALUES ('PLED', 'x')$$, '23505', 'duplicate insert rejected');
WITH s AS (INSERT INTO categories (name, image) VALUES ('Yangi', 'x') RETURNING sort_order)
SELECT t.ok((SELECT sort_order = 4 FROM s), 'insert appends sort_order');
SELECT t.fails($$DELETE FROM categories WHERE name = 'Dasturxon'$$, '23503', 'occupied category delete blocked');
SELECT t.rows($$DELETE FROM categories WHERE name = 'Yangi'$$, 1, 'empty category delete allowed');
RESET ROLE;
SELECT t.ok(t.cat(:'choy') = 'Choyshab', 'failed RPC calls left the category intact');

\echo '== R5 cascade failure rolls the rename back =='
CREATE FUNCTION t.boom() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.category_name = 'Boom' AND NEW.name = 'Choyshab 2' THEN RAISE EXCEPTION 'simulated product failure'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER t_boom BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION t.boom();
SET ROLE authenticated;
SELECT t.fails(format('SELECT t.save(%L, %L, %L)', :'choy', 'Boom', 'Choyshab'), 'P0001', 'rename fails when one product update fails');
RESET ROLE;
SELECT t.ok(t.cat(:'choy') = 'Choyshab', 'category name rolled back');
SELECT t.ok((SELECT count(*) = 2 FROM products WHERE category_name = 'Choyshab'), 'no product partially renamed');
DROP TRIGGER t_boom ON products;

\echo '== R1 reviewer scenario: products RLS is never bypassed by a non-admin =='
SELECT set_config('request.jwt.claims', json_build_object('sub', :'customer', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.rows($$UPDATE categories SET name = 'Anonymous rename' WHERE id = '00000000-0000-0000-0000-000000000c01'$$, 0, 'non-admin direct rename filtered');
RESET ROLE;
SELECT t.ok(NOT EXISTS (SELECT 1 FROM products WHERE category_name = 'Anonymous rename'), 'protected product not renamed');

\echo '== R1 defence in depth: trigger re-checks authorization =='
-- Simulate someone later re-adding a permissive policy: the privileged cascade
-- must still refuse a non-admin (current_setting('role') seen inside SECURITY DEFINER).
CREATE POLICY t_reopened ON public.categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
SET ROLE authenticated;
SELECT t.fails($$UPDATE categories SET name = 'Anonymous rename' WHERE name = 'Choyshab'$$, '42501', 'cascade trigger refuses non-admin even with a permissive policy');
RESET ROLE;
DROP POLICY t_reopened ON public.categories;
SELECT t.ok(t.cat(:'choy') = 'Choyshab' AND NOT EXISTS (SELECT 1 FROM products WHERE category_name = 'Anonymous rename'), 'category and products intact');

\echo '== R1 server access =='
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false);
SET ROLE service_role;
SELECT t.rows($$UPDATE categories SET name = 'Choyshab S' WHERE name = 'Choyshab'$$, 1, 'service_role direct rename allowed');
SELECT t.ok((SELECT count(*) = 2 FROM products WHERE category_name = 'Choyshab S'), 'service_role rename cascaded');
SELECT t.ok(reorder_categories(ARRAY[:'pled', :'dast', :'choy']::uuid[]) = 3, 'service_role reorder allowed');
SELECT t.ok(public.storage_reference_status(:'OWN' || 'products/p1.jpg') ->> 'status' = 'referenced', 'service_role reference check allowed');
RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
-- Direct database session (SQL editor / migrations): no SET ROLE
SELECT t.rows($$UPDATE categories SET name = 'Choyshab' WHERE name = 'Choyshab S'$$, 1, 'direct session rename allowed');
SELECT t.ok((SELECT count(*) = 2 FROM products WHERE category_name = 'Choyshab'), 'direct session rename cascaded');
SELECT t.ok(reorder_categories(ARRAY[:'choy', :'dast', :'pled']::uuid[]) = 3, 'direct session reorder allowed');

-- ===========================================================================
\echo '== R6 reorder validation =='
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.ok(reorder_categories(ARRAY[:'pled', :'dast', :'choy']::uuid[]) = 3, 'admin full reorder returns updated count');
SELECT t.ok(t.order_names() = 'Pled,Dasturxon,Choyshab', 'admin reorder stored');
SELECT t.fails(format('SELECT reorder_categories(ARRAY[%L,%L,%L]::uuid[])', :'choy', :'choy', :'dast'), '22023', 'duplicate ids rejected');
SELECT t.fails(format('SELECT reorder_categories(ARRAY[%L,%L,NULL]::uuid[])', :'choy', :'dast'), '22023', 'null id rejected');
SELECT t.fails('SELECT reorder_categories(ARRAY[]::uuid[])', '22023', 'empty list rejected');
SELECT t.fails(format('SELECT reorder_categories(ARRAY[%L,%L,%L]::uuid[])', :'choy', :'dast', '00000000-0000-0000-0000-0000000000ff'), 'PT409', 'unknown id rejected');
SELECT t.fails(format('SELECT reorder_categories(ARRAY[%L,%L]::uuid[])', :'choy', :'dast'), 'PT409', 'stale (incomplete) list rejected');
RESET ROLE;
SELECT t.ok(t.order_names() = 'Pled,Dasturxon,Choyshab', 'rejected reorders changed nothing');

-- An UPDATE policy that silently filters one row must abort the whole reorder
CREATE POLICY t_block_pled ON public.categories AS RESTRICTIVE FOR UPDATE TO authenticated USING (name <> 'Pled');
SET ROLE authenticated;
SELECT t.fails(format('SELECT reorder_categories(ARRAY[%L,%L,%L]::uuid[])', :'choy', :'dast', :'pled'), '42501', 'RLS-filtered row makes reorder fail (no silent success)');
RESET ROLE;
SELECT t.ok(t.order_names() = 'Pled,Dasturxon,Choyshab', 'partial reorder rolled back');
DROP POLICY t_block_pled ON public.categories;

-- ===========================================================================
\echo '== R2 canonical storage references =='
SET ROLE authenticated;
-- Seed references in many shapes (as the admin; products/app_settings writes via superuser below)
RESET ROLE;
UPDATE products SET image = :'OWN' || 'shared/a.png?download=1' WHERE name = 'Choyshab 1';
UPDATE products SET variants = jsonb_build_array(jsonb_build_object('color', 'Oq', 'image', :'OWN' || 'variants/my%20photo.png')) WHERE name = 'Choyshab 2';
UPDATE products SET a_plus_content = jsonb_build_object('hero', jsonb_build_object('image', :'OWN' || 'aplus/%D0%B1.png#x')) WHERE name = 'Dasturxon 1';
UPDATE products SET images = ARRAY['https://cdn.example/render/x.png', 'https://proj.supabase.co/storage/v1/render/image/public/product-images/gallery/g1.png?width=300'] WHERE name = 'Orphan';
INSERT INTO reviews (images) VALUES (ARRAY[:'OWN' || 'reviews/r1.jpg']);  -- text[] as in production
UPDATE app_settings SET banners = jsonb_build_array(jsonb_build_object('imageUrl', :'OWN' || 'banners/b1.webp'));
INSERT INTO orders (id, items) VALUES ('o1', jsonb_build_array(jsonb_build_object('image', :'OWN' || 'products/old-snapshot.jpg')));
INSERT INTO users (cart) VALUES (jsonb_build_array(jsonb_build_object('image', :'OWN' || 'products/cart.jpg')));
INSERT INTO audit_logs (action, old_data) VALUES ('category.delete', '{"image":"' || :'OWN' || 'categories/deleted.svg"}');
INSERT INTO categories (name, image) VALUES ('Escaped', :'OWN' || 'categories/esc.svg');

SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.ok(t.ref(:'OWN' || 'shared/a.png?download=2') = 'referenced', 'different query string of same object is referenced (reviewer R2 case)');
SELECT t.ok(t.ref(:'OWN' || 'shared/a.png') = 'referenced', 'no query string is referenced');
SELECT t.ok(t.ref(:'OWN' || 'shared/%61.png') = 'referenced', 'percent-encoded candidate path is referenced');
SELECT t.ok(t.ref(:'OWN' || 'variants/my photo.png') = 'referenced', 'decoded candidate matches encoded stored URL in variants JSON');
SELECT t.ok(t.ref(:'OWN' || 'variants/my%20photo.png?v=3') = 'referenced', 'encoded candidate matches encoded stored URL');
SELECT t.ok(t.ref(:'OWN' || 'aplus/б.png') = 'referenced', 'UTF-8 path decoded inside A+ content');
SELECT t.ok(t.ref(:'OWN' || 'gallery/g1.png') = 'referenced', 'render/image transform URL in images[] counts as reference');
SELECT t.ok(t.ref('https://proj.supabase.co/storage/v1/object/sign/product-images/reviews/r1.jpg?token=abc') = 'referenced', 'signed URL of review image is referenced');
SELECT t.ok(t.ref(:'OWN' || 'banners/b1.webp') = 'referenced', 'banner in app_settings is referenced');
SELECT t.ok(t.ref(:'OWN' || 'products/old-snapshot.jpg') = 'referenced', 'order item snapshot is referenced');
SELECT t.ok(t.ref(:'OWN' || 'products/cart.jpg') = 'referenced', 'user cart snapshot is referenced');
SELECT t.ok(t.ref('https://OTHER-ORIGIN.example/storage/v1/object/public/product-images/products/p2.jpg') = 'referenced', 'same path via other origin counts (conservative)');
SELECT t.ok(t.ref(:'OWN' || 'categories/deleted.svg') = 'unreferenced', 'audit-log history alone does not keep a file');
SELECT t.ok(t.ref(:'OWN' || 'categories/unused.svg') = 'unreferenced', 'unused object is unreferenced');
SELECT t.ok((SELECT storage_reference_status(:'OWN' || 'categories/unused%20file.svg?x=1') = '{"status":"unreferenced","bucket":"product-images","path":"categories/unused file.svg"}'::jsonb), 'returns canonical bucket and decoded path');
SELECT t.ok(t.ref('https://example.com/image.png') = 'unknown', 'non-storage URL is unknown');
SELECT t.ok(t.ref(:'OWN' || 'bad%C3%28.png') = 'unknown', 'undecodable candidate is unknown');
SELECT t.ok(t.ref(:'OWN' || '../secret.png') = 'unknown', 'path traversal is unknown');
RESET ROLE;
INSERT INTO reviews (comment) VALUES ('broken encoding %C3%28 here');
SET ROLE authenticated;
SELECT t.ok(t.ref(:'OWN' || 'categories/unused.svg') = 'unknown', 'undecodable stored text makes the result unknown, not unreferenced');
RESET ROLE;

-- ===========================================================================
\echo '== V2-01 saves with a resolvable outcome =='
\set opA '00000000-0000-0000-0000-0000000a0001'
\set opB '00000000-0000-0000-0000-0000000a0002'
\set opC '00000000-0000-0000-0000-0000000a0003'
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.ok((SELECT name = 'Op create' FROM admin_save_category(:'opA', NULL, ' Op  create ', :'OWN' || 'categories/op.svg')), 'create through admin_save_category');
SELECT t.ok(resolve_category_write(:'opA') = 'committed', 'committed save resolves as committed');
-- A replay of the same committed request (retry after a lost response) is
-- answered idempotently with the saved row and never writes twice
SELECT t.ok((SELECT name = 'Op create' FROM admin_save_category(:'opA', NULL, 'Op again', 'x')), 'replaying a committed operation returns its saved row');
SELECT t.ok((SELECT count(*) = 1 FROM categories WHERE name IN ('Op create', 'Op again')), 'replay created no second category');
SELECT t.ok(resolve_category_write(:'opB') = 'aborted', 'unknown operation resolves as aborted (tombstone)');
SELECT t.fails(format('SELECT admin_save_category(%L, NULL, %L, %L)', :'opB', 'Late arrival', 'x'), '55000', 'a save arriving after its tombstone is refused');
SELECT t.ok(NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Late arrival'), 'late save created nothing');
SELECT t.fails(format('SELECT admin_save_category(%L, NULL, %L, %L)', :'opC', 'dasturxon', 'x'), '23505', 'failing save (duplicate name)');
SELECT t.ok(resolve_category_write(:'opC') = 'aborted', 'rolled-back save resolves as aborted');
SELECT t.fails('SELECT * FROM category_write_ops', '42501', 'admins cannot read the op table directly');
SELECT t.fails(format('SELECT admin_save_category(NULL, NULL, %L, %L)', 'No op', 'x'), '22023', 'operation id is required');
SELECT t.fails(format('SELECT admin_save_category(%L, NULL, %L, %L)', gen_random_uuid(), 'No image', ' '), '22023', 'image is required');
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'customer', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.fails(format('SELECT resolve_category_write(%L)', gen_random_uuid()), '42501', 'non-admin cannot resolve');
SELECT t.fails(format('SELECT admin_save_category(%L, NULL, %L, %L)', gen_random_uuid(), 'Nope', 'x'), '42501', 'non-admin cannot save');
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', false);
SET ROLE anon;
SELECT t.fails('SELECT * FROM category_write_ops', '42501', 'anon cannot read the op table');
RESET ROLE;

-- ===========================================================================
\echo '== S1 internal helpers cannot alter operation records =='
CREATE FUNCTION t.op_target(p uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT category_id FROM public.category_write_ops WHERE op_id = p $$;
GRANT EXECUTE ON FUNCTION t.op_target(uuid) TO anon, authenticated;
SELECT t.ok(t.op_target(:'opA') IS NOT NULL, 'committed op A records the category it created');
SELECT t.ok(to_regprocedure('public.category_finish_write(uuid,uuid)') IS NULL
        AND to_regprocedure('public.category_claim_write(uuid)') IS NULL
        AND to_regprocedure('public.storage_path_reference_status(text)') IS NULL
        AND to_regprocedure('public.storage_object_deletable(text,text)') IS NULL,
  'no internal helper left in the API-exposed public schema');
SELECT t.ok(NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname IN ('category_finish_write', 'category_claim_write', 'category_record_write',
                        'storage_path_reference_status', 'storage_object_deletable')),
  'no SECURITY DEFINER helper of this migration in public');

SELECT set_config('request.jwt.claims', json_build_object('sub', :'customer', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.fails(format('SELECT category_internal.category_finish_write(%L, %L)', :'opA', :'dast'), '42501', 'non-admin cannot remap an operation');
SELECT t.fails(format('SELECT * FROM category_internal.category_claim_write(%L)', gen_random_uuid()), '42501', 'non-admin cannot claim an operation');
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', false);
SET ROLE anon;
SELECT t.fails(format('SELECT category_internal.category_finish_write(%L, %L)', :'opA', :'dast'), '42501', 'anon cannot remap an operation');
SELECT t.fails(format('SELECT * FROM category_internal.category_claim_write(%L)', gen_random_uuid()), '42501', 'anon cannot claim an operation');
RESET ROLE;
SELECT t.ok(t.op_target(:'opA') <> :'dast'::uuid AND t.op_target(:'opA') IS NOT NULL, 'rejected calls left the operation row unchanged');

SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.fails(format('SELECT category_internal.category_finish_write(%L, %L)', :'opA', :'dast'), '55000', 'even an admin cannot remap a committed operation (set-once)');
SELECT t.ok((SELECT name = 'Op create' FROM admin_save_category(:'opA', NULL, 'Ignored', 'x')), 'committed replay still returns the original row');
SELECT t.fails(format('SELECT admin_save_category(%L, NULL, %L, %L)', :'opB', 'Late', 'x'), '55000', 'aborted replay still refused');
SELECT t.ok((SELECT name = 'Fresh save' FROM admin_save_category(gen_random_uuid(), NULL, 'Fresh save', :'OWN' || 'categories/fresh.svg')), 'normal admin save still works through the internal helpers');
RESET ROLE;

\echo '== restrict-product-images-bucket.sql =='
\i :migration_dir/restrict-product-images-bucket.sql
SELECT t.ok((SELECT file_size_limit = 10485760 AND 'image/svg+xml' = ANY(allowed_mime_types) FROM storage.buckets WHERE id = 'product-images'), 'bucket limited to images ≤10 MB incl. SVG');

-- ===========================================================================
\echo '== protect-referenced-storage-objects.sql (old browser tabs) =='
-- (applied by run-db-tests.sh together with the other release migrations)
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('product-images', 'products/p3.jpg'),
  ('product-images', 'categories/pled.svg'),
  ('product-images', 'categories/unused.svg'),
  ('other-bucket', 'products/p3.jpg');
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.rows($$DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = 'products/p3.jpg'$$, 0, 'referenced product image cannot be deleted');
-- The undecodable review row from the R2 section makes every status 'unknown'
SELECT t.rows($$DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = 'categories/unused.svg'$$, 0, 'unknown reference status blocks deletion');
RESET ROLE;
DELETE FROM reviews WHERE comment LIKE 'broken encoding%';
SET ROLE authenticated;
SELECT t.rows($$DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = 'categories/unused.svg'$$, 1, 'unreferenced object can be deleted');
SELECT t.rows($$DELETE FROM storage.objects WHERE bucket_id = 'other-bucket'$$, 1, 'other buckets unaffected');
-- Old client: image first, then the (occupied) category
SELECT t.rows($$DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = 'categories/pled.svg'$$, 0, 'old client: image of an existing category is kept');
RESET ROLE;
-- Give Pled a product so its delete is refused, as for an occupied category
INSERT INTO products (name, category_name, image) VALUES ('Pled 1', 'Pled', 'x');
SET ROLE authenticated;
SELECT t.fails($$DELETE FROM categories WHERE name = 'Pled'$$, '23503', 'old client: occupied category delete refused');
RESET ROLE;
SELECT t.ok(EXISTS (SELECT 1 FROM storage.objects WHERE name = 'categories/pled.svg'), 'old client: image still exists after the refused delete');
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false);
SET ROLE service_role;
SELECT t.rows($$DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = 'products/p3.jpg'$$, 1, 'service_role keeps full control');
RESET ROLE;

-- ===========================================================================
\echo '== restrict-storage-writes-to-admins.sql: DELETE =='
-- production's permissive product_images_delete is still present; the
-- restrictive policy must win. Controls: the targets exist, admin can delete.
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('product-images', 'drafts/anon-target.svg'), ('product-images', 'drafts/user-target.svg'), ('product-images', 'drafts/admin-target.svg'),
  ('product-images', 'products/p2.jpg');  -- referenced by product "Choyshab 2"
SELECT t.ok((SELECT count(*) = 4 FROM storage.objects WHERE name IN ('drafts/anon-target.svg', 'drafts/user-target.svg', 'drafts/admin-target.svg', 'products/p2.jpg')), 'control: delete targets exist');
SELECT t.ok(EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'product_images_delete' AND permissive = 'PERMISSIVE'), 'control: production permissive delete policy still present');
SELECT set_config('request.jwt.claims', '{"role":"anon"}', false);
SET ROLE anon;
SELECT t.rows($$DELETE FROM storage.objects WHERE name = 'drafts/anon-target.svg'$$, 0, 'anon cannot delete an unreferenced object');
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'customer', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.rows($$DELETE FROM storage.objects WHERE name = 'drafts/user-target.svg'$$, 0, 'non-admin cannot delete an unreferenced object');
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.rows($$DELETE FROM storage.objects WHERE name = 'drafts/admin-target.svg'$$, 1, 'admin can delete an unreferenced object');
SELECT t.rows($$DELETE FROM storage.objects WHERE name = 'products/p2.jpg'$$, 0, 'admin still cannot delete a referenced object');
RESET ROLE;
SELECT t.ok((SELECT count(*) = 3 FROM storage.objects WHERE name IN ('drafts/anon-target.svg', 'drafts/user-target.svg', 'products/p2.jpg')), 'refused deletes left their objects in place');

\echo '== restrict-storage-writes-to-admins.sql: UPDATE / overwrite, uploads, reads =='
SELECT set_config('request.jwt.claims', '{"role":"anon"}', false);
SET ROLE anon;
SELECT t.rows($$UPDATE storage.objects SET metadata = '{"x":1}' WHERE name = 'products/p2.jpg'$$, 0, 'anon cannot overwrite (UPDATE) an image');
SELECT t.rows($$INSERT INTO storage.objects (bucket_id, name) VALUES ('product-images', 'products/review-upload-1.jpg')$$, 1, 'anon can still upload a NEW object (customer review photos)');
SELECT t.fails($$INSERT INTO storage.objects (bucket_id, name) VALUES ('product-images', 'products/p2.jpg')$$, '23505', 'an upload cannot replace an existing object');
SELECT t.ok((SELECT count(*) > 0 FROM storage.objects WHERE bucket_id = 'product-images'), 'anon can still read objects');
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'customer', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.rows($$UPDATE storage.objects SET metadata = '{"x":1}' WHERE name = 'products/p2.jpg'$$, 0, 'non-admin cannot overwrite an image');
INSERT INTO storage.objects (bucket_id, name) VALUES ('other-bucket', 'moved.svg');
SELECT t.fails($$UPDATE storage.objects SET bucket_id = 'product-images' WHERE bucket_id = 'other-bucket' AND name = 'moved.svg'$$, '42501', 'non-admin cannot move an object into product-images');
RESET ROLE;
SELECT t.ok((SELECT metadata IS NULL FROM storage.objects WHERE name = 'products/p2.jpg'), 'refused overwrites left the object unchanged');
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.rows($$UPDATE storage.objects SET metadata = '{"admin":true}' WHERE name = 'products/p2.jpg'$$, 1, 'admin can update an object');
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false);
SET ROLE service_role;
SELECT t.rows($$UPDATE storage.objects SET metadata = NULL WHERE name = 'products/p2.jpg'$$, 1, 'service_role can update an object');
RESET ROLE;

-- ===========================================================================
\echo '== secure-admin-users.sql: membership cannot be self-granted =='
CREATE FUNCTION t.membership() RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT string_agg(user_id::text, ',' ORDER BY user_id) FROM public.admin_users $$;
GRANT EXECUTE ON FUNCTION t.membership() TO anon, authenticated;
SELECT t.ok(t.membership() = :'admin', 'control: exactly the real admin is a member');
SELECT t.ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_users'::regclass), 'admin_users RLS enabled');
SELECT t.ok((SELECT string_agg(policyname || ':' || cmd || ':' || array_to_string(roles, '+'), ' ') FROM pg_policies WHERE tablename = 'admin_users') = 'admin_users_select_own:SELECT:authenticated', 'only the own-row SELECT policy remains');
SELECT t.ok(NOT has_table_privilege('anon', 'public.admin_users', 'SELECT') AND NOT has_table_privilege('anon', 'public.admin_users', 'TRUNCATE'), 'anon has no privileges on admin_users');
SELECT t.ok(NOT has_table_privilege('authenticated', 'public.admin_users', 'INSERT') AND NOT has_table_privilege('authenticated', 'public.admin_users', 'UPDATE')
        AND NOT has_table_privilege('authenticated', 'public.admin_users', 'DELETE') AND NOT has_table_privilege('authenticated', 'public.admin_users', 'TRUNCATE')
        AND NOT has_table_privilege('authenticated', 'public.admin_users', 'TRIGGER') AND NOT has_table_privilege('authenticated', 'public.admin_users', 'REFERENCES'),
  'authenticated has only SELECT on admin_users');

SELECT set_config('request.jwt.claims', json_build_object('sub', :'customer', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.fails(format('INSERT INTO admin_users (user_id) VALUES (%L)', :'customer'), '42501', 'non-admin cannot add itself to admin_users (self-promotion)');
SELECT t.fails(format('UPDATE admin_users SET user_id = %L', :'customer'), '42501', 'non-admin cannot rewrite memberships');
SELECT t.fails('DELETE FROM admin_users', '42501', 'non-admin cannot delete memberships');
SELECT t.fails('TRUNCATE admin_users', '42501', 'non-admin cannot truncate admin_users');
SELECT t.ok((SELECT count(*) = 0 FROM admin_users), 'non-admin sees no membership rows');
SELECT t.ok(NOT is_admin(), 'non-admin is still not an admin');
SELECT t.fails(format('SELECT admin_save_category(%L, %L, %L, %L, %L)', gen_random_uuid(), :'choy', 'Escalated', 'x', 'Choyshab'), '42501', 'non-admin still cannot write categories');
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', false);
SET ROLE anon;
SELECT t.fails('SELECT * FROM admin_users', '42501', 'anon cannot read admin_users');
SELECT t.fails(format('INSERT INTO admin_users (user_id) VALUES (%L)', :'customer'), '42501', 'anon cannot add memberships');
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.ok((SELECT count(*) = 1 FROM admin_users WHERE user_id = :'admin'), 'admin can read its own membership (admin login check)');
SELECT t.fails(format('INSERT INTO admin_users (user_id) VALUES (%L)', :'customer'), '42501', 'admins cannot grant admin through the API either');
RESET ROLE;
SELECT t.ok(t.membership() = :'admin', 'membership unchanged after every refused attempt');
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false);
SET ROLE service_role;
SELECT t.rows(format('INSERT INTO admin_users (user_id) VALUES (%L)', :'customer'), 1, 'service_role can provision an admin (server/dashboard)');
SELECT t.rows(format('DELETE FROM admin_users WHERE user_id = %L', :'customer'), 1, 'service_role can remove an admin');
RESET ROLE;
-- Indirect path: a SECURITY DEFINER function that writes admin_users makes the
-- migration's guard fail (same detection query as secure-admin-users.sql)
CREATE FUNCTION public.t_evil_promote(u uuid) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ INSERT INTO public.admin_users (user_id) VALUES (u) $$;
SELECT t.ok(EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prosecdef AND n.nspname = 'public' AND p.prosrc ~* '(insert\s+into|update|delete\s+from|truncate)\s+(public\.)?admin_users'),
  'the migration guard detects a SECURITY DEFINER function writing admin_users');
DROP FUNCTION public.t_evil_promote(uuid);

-- ===========================================================================
\echo '== secure-products.sql =='
SELECT t.ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.products'::regclass), 'products RLS enabled');
SELECT t.ok((SELECT string_agg(cmd || ':' || array_to_string(roles, '+'), ' ' ORDER BY cmd) FROM pg_policies WHERE tablename = 'products')
  = 'DELETE:authenticated INSERT:authenticated SELECT:public UPDATE:authenticated', 'production "Allow all" policies replaced by 4 policies');
SELECT set_config('request.jwt.claims', '{"role":"anon"}', false);
SET ROLE anon;
SELECT t.ok((SELECT count(*) >= 5 FROM products), 'anon can read products (incl. hidden, as before)');
SELECT t.ok((SELECT jsonb_array_length(get_essential_data(true) -> 'products') >= 5), 'storefront RPC still returns products');
SELECT t.fails('UPDATE products SET price = 1', '42501', 'anon cannot update products');
SELECT t.fails($$INSERT INTO products (name, category_name, image) VALUES ('x', 'Choyshab', 'x')$$, '42501', 'anon cannot insert products');
SELECT t.fails('DELETE FROM products', '42501', 'anon cannot delete products');
SELECT t.fails('TRUNCATE products CASCADE', '42501', 'anon cannot truncate products');
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'customer', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.rows('UPDATE products SET price = 1', 0, 'non-admin product UPDATE filtered (0 rows)');
SELECT t.fails($$INSERT INTO products (name, category_name, image) VALUES ('x', 'Choyshab', 'x')$$, '42501', 'non-admin cannot insert products');
SELECT t.rows('DELETE FROM products', 0, 'non-admin product DELETE filtered (0 rows)');
SELECT t.fails('TRUNCATE products CASCADE', '42501', 'non-admin cannot truncate products');
RESET ROLE;
SELECT t.ok(NOT EXISTS (SELECT 1 FROM products WHERE price = 1), 'no refused write changed a product');
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.rows($$INSERT INTO products (name, category_name, image) VALUES ('Admin product', 'Choyshab', 'x')$$, 1, 'admin can create a product');
SELECT t.ok((SELECT category_id = :'choy'::uuid FROM products WHERE name = 'Admin product'), 'new product linked to its category by id');
SELECT t.rows($$UPDATE products SET price = 777 WHERE name = 'Admin product'$$, 1, 'admin can update a product');
SELECT t.rows($$DELETE FROM products WHERE name = 'Admin product'$$, 1, 'admin can delete a product');
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false);
SET ROLE service_role;
SELECT t.rows($$UPDATE products SET stock = stock WHERE name = 'Choyshab 1'$$, 1, 'service_role (payment webhooks) can update stock');
RESET ROLE;

-- ===========================================================================
\echo '== secure-audit-logs.sql =='
SELECT t.ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.audit_logs'::regclass), 'audit_logs RLS enabled');
SELECT set_config('request.jwt.claims', '{"role":"anon"}', false);
SET ROLE anon;
SELECT t.fails('SELECT * FROM audit_logs', '42501', 'anon cannot read audit logs');
SELECT t.fails($$INSERT INTO audit_logs (action) VALUES ('forged')$$, '42501', 'anon cannot write audit logs');
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'customer', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.ok((SELECT count(*) = 0 FROM audit_logs), 'non-admin sees no audit entries');
SELECT t.fails($$INSERT INTO audit_logs (action, admin_email) VALUES ('forged', 'admin@test')$$, '42501', 'non-admin cannot forge audit entries');
SELECT t.fails($$UPDATE audit_logs SET action = 'edited'$$, '42501', 'non-admin cannot edit audit entries');
SELECT t.fails('DELETE FROM audit_logs', '42501', 'non-admin cannot delete audit entries');
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated', 'email', 'admin@test')::text, false);
SET ROLE authenticated;
SELECT t.rows($$INSERT INTO audit_logs (action, entity_type, admin_id, admin_email, created_at)
               VALUES ('category.update', 'category', 'someone-else', 'spoofed@example.com', '2000-01-01')$$, 1, 'admin can append an audit entry');
SELECT t.ok((SELECT admin_id = '00000000-0000-0000-0000-00000000a001' AND admin_email = 'admin@test' AND created_at > now() - interval '1 minute'
             FROM audit_logs WHERE action = 'category.update' AND entity_type = 'category' ORDER BY created_at DESC LIMIT 1),
  'actor and time are stamped by the database (spoofed values ignored)');
SELECT t.ok((SELECT count(*) >= 2 FROM audit_logs), 'admin can read the audit trail');
SELECT t.fails($$UPDATE audit_logs SET action = 'edited'$$, '42501', 'even admins cannot edit audit entries');
SELECT t.fails('DELETE FROM audit_logs', '42501', 'even admins cannot delete audit entries');
RESET ROLE;

\echo '== secure-audit-logs.sql: actor e-mail only from auth.users (R5-02) =='
CREATE FUNCTION t.last_audit_email(p_action text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(admin_email, '<NULL>') FROM public.audit_logs WHERE action = p_action ORDER BY created_at DESC LIMIT 1 $$;
-- admin JWT WITHOUT an email claim + client-supplied e-mail
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT t.rows($$INSERT INTO audit_logs (action, admin_email) VALUES ('r5-no-claim', 'spoofed@example.test')$$, 1, 'admin append without an email claim');
RESET ROLE;
SELECT t.ok(t.last_audit_email('r5-no-claim') = 'admin@test', 'no email claim: e-mail taken from auth.users, submitted value ignored');
-- admin JWT with a DIFFERENT email claim
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated', 'email', 'claimed@example.test')::text, false);
SET ROLE authenticated;
SELECT t.rows($$INSERT INTO audit_logs (action, admin_email) VALUES ('r5-other-claim', 'spoofed@example.test')$$, 1, 'admin append with a different email claim');
RESET ROLE;
SELECT t.ok(t.last_audit_email('r5-other-claim') = 'admin@test', 'JWT email claim not trusted either: auth.users wins');
-- auth user with an EMPTY and with NO e-mail → explicit NULL, never the submitted value
UPDATE auth.users SET email = '  ' WHERE id = :'admin';
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated', 'email', 'spoofed@example.test')::text, false);
SET ROLE authenticated;
SELECT t.rows($$INSERT INTO audit_logs (action, admin_email) VALUES ('r5-empty', 'spoofed@example.test')$$, 1, 'admin append with an empty auth e-mail');
RESET ROLE;
SELECT t.ok(t.last_audit_email('r5-empty') = '<NULL>', 'empty auth e-mail stored as NULL (explicitly absent)');
UPDATE auth.users SET email = NULL WHERE id = :'admin';
SET ROLE authenticated;
SELECT t.rows($$INSERT INTO audit_logs (action, admin_email) VALUES ('r5-missing', 'spoofed@example.test')$$, 1, 'admin append with no auth e-mail');
RESET ROLE;
SELECT t.ok(t.last_audit_email('r5-missing') = '<NULL>', 'missing auth e-mail stored as NULL (explicitly absent)');
UPDATE auth.users SET email = 'admin@test' WHERE id = :'admin';
-- trusted server path keeps what it sends
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false);
SET ROLE service_role;
SELECT t.rows($$INSERT INTO audit_logs (action, admin_id, admin_email) VALUES ('r5-server', 'server-job', 'jobs@ailem.uz')$$, 1, 'service_role append');
RESET ROLE;
SELECT t.ok(t.last_audit_email('r5-server') = 'jobs@ailem.uz', 'service_role inserts keep their own actor fields');

\echo 'ALL DATABASE TESTS PASSED'
