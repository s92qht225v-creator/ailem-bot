-- ============================================================================
-- Category integrity: admin-only writes, atomic renames, shared ordering,
-- canonical image-reference checks.
--
-- Fixes category audit findings CAT-01/02/06/08/09/13, independent-review
-- findings R1, R2, R5, R6 and second-review V2-01 (resolvable save outcomes)
-- (audit-reports/2026-10-25-categories/).
-- Database tests: supabase-tests/run-db-tests.sh (disposable local Postgres).
--
-- Idempotent: safe to run more than once. Existing product assignments
-- (products.category_name) and category images (SVG URLs) are not modified.
--
-- PREREQUISITES (verify with the PRE-CHECK queries below)
--   * secure-admin-users.sql MUST be applied first. Production (pre-check
--     2026-10-25) has RLS disabled on admin_users with anon/authenticated
--     write grants, so is_admin() — which every guard in this file relies on —
--     could be satisfied by anyone who inserts their own membership row.
--   * public.admin_users contains EVERY person who must keep editing
--     categories (production: one admin, linked to an auth user).
--   * auth.uid() exists (standard on Supabase).
--
-- ROLLOUT ORDER: see release/2026-10-categories/RUNBOOK.md. Summary:
--   secure-admin-users → THIS FILE → protect-referenced-storage-objects →
--   restrict-storage-writes-to-admins → secure-audit-logs → deploy code →
--   secure-products (after the payment webhooks use the service-role client)

-- OLD BROWSER TABS (deployed client) until they are reloaded
--   * Can still: edit names/images (plain UPDATE: renames now cascade to
--     products in the same statement), toggle visibility, delete EMPTY
--     categories, create categories (now validated: trimmed name, image).
--   * Their image-first delete of an OCCUPIED category: the database refuses
--     the category delete; with protect-referenced-storage-objects.sql the
--     earlier image delete is refused too (the category row still references
--     it), so nothing is lost. WITHOUT that file the image can be lost —
--     the pre-existing bug this rollout is fixing.
--   * Reorder only changes that tab's own localStorage (as before).
--   * Old tabs do not use operation ids or holds; they never delete draft
--     uploads, so they cannot cause the V2-01 race.
--   Remaining limitation: an old tab cannot be forced to reload; the server
--   policies above bound what it can do, they do not upgrade it.
--
-- POSTGREST BEHAVIOUR (found in local staging, local-staging/results/):
--   * Never raise SQLSTATE 40001 for app errors: PostgREST retries it (the
--     request hangs → 504, and a retried stale write can later succeed).
--     Stale-data errors here use PT409 (HTTP 409).
--   * Browsers re-send a POST when a reused connection is reset, so the same
--     save can arrive several times: a replay of a COMMITTED operation id is
--     answered with the saved row (idempotent); an ABORTED one stays refused.
--
-- INTERNAL HELPERS live in schema category_internal, which must NOT be added
--   to the API's exposed schemas (Settings → API). Re-run BOTH migrations
--   together: this file drops the old public helper versions that
--   protect-referenced-storage-objects.sql then replaces.
--
-- NEW CLIENT BEFORE THIS MIGRATION: NOT supported, fails closed. Saves (create
--   and edit) are refused with "migration required" (admin_save_category
--   missing), reorders revert, storage cleanup keeps every file (reference
--   status "unknown"). Visibility toggles and empty-category deletes still work.
--
-- OLD CLIENT AFTER THIS MIGRATION: supported. Rollback-compatible image A
--   (13d61f7 + rollback-compat-webhooks.patch) was tested against it: admin
--   sign-in and category rename work, products keep their category.
--
-- UNINSTALL REFERENCE ONLY — not a rollback step (code rollback = image A,
-- which needs none of this). Does not touch category/product data. Never
-- restore the previous permissive policies (re-opens R1):
--   DROP TRIGGER IF EXISTS categories_cascade_rename ON public.categories;
--   DROP TRIGGER IF EXISTS categories_block_delete_in_use ON public.categories;
--   DROP TRIGGER IF EXISTS categories_default_sort_order ON public.categories;
--   DROP TRIGGER IF EXISTS products_sync_category_id ON public.products;
--   DROP FUNCTION IF EXISTS public.admin_save_category(uuid, uuid, text, text, text);
--   DROP FUNCTION IF EXISTS public.resolve_category_write(uuid);
--   DROP SCHEMA IF EXISTS category_internal CASCADE;   -- claim/finish/reference helpers
--   DROP TABLE IF EXISTS public.category_write_ops;
--   DROP FUNCTION IF EXISTS public.reorder_categories(uuid[]);
--   DROP FUNCTION IF EXISTS public.storage_reference_status(text);
--   DROP INDEX IF EXISTS public.categories_name_normalized_key;
--   ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_length_check;
--   ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_image_not_blank_check;
--
-- PRE-CHECK (read-only) -------------------------------------------------------
--   -- a) Admins who will keep write access (must not be empty):
--   SELECT au.user_id, u.email FROM public.admin_users au
--   LEFT JOIN auth.users u ON u.id = au.user_id;
--
--   -- b) Current category policies, RLS state and grants (ALL policies on
--   --    public.categories are dropped and replaced below):
--   SELECT policyname, permissive, roles, cmd, qual, with_check
--   FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories';
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.categories'::regclass;
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND table_name = 'categories' ORDER BY 1, 2;
--
--   -- c) Duplicate names after normalisation (must be empty, otherwise the
--   --    unique index is skipped with a NOTICE):
--   SELECT lower(btrim(name)), array_agg(name) FROM public.categories
--   GROUP BY 1 HAVING count(*) > 1;
--
--   -- d) Products whose category_name matches no category (e.g. 'Bedsheets').
--   --    Left untouched; reassign them in the admin Products screen.
--   SELECT p.id, p.name, p.category_name, p.visible FROM public.products p
--   LEFT JOIN public.categories c ON c.name = p.category_name WHERE c.id IS NULL;
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Clean up objects from an earlier draft of this migration
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.storage_url_is_referenced(text);
-- Internal helpers used to live in public, where PostgREST exposes every
-- function as /rest/v1/rpc/<name> (local-staging review S1)
DROP FUNCTION IF EXISTS public.category_finish_write(uuid, uuid);
DROP FUNCTION IF EXISTS public.category_claim_write(uuid);

-- Schema for helpers that must NOT be callable through the Data API.
-- Supabase exposes only the schemas listed in its API settings (public,
-- graphql_public by default); never add this one there. API roles get USAGE
-- so SECURITY INVOKER functions and storage policies can call into it, and
-- every mutating helper still checks the caller itself.
CREATE SCHEMA IF NOT EXISTS category_internal;
REVOKE ALL ON SCHEMA category_internal FROM PUBLIC;
GRANT USAGE ON SCHEMA category_internal TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 1. Authorization (R1)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Who may change categories. PostgREST runs each request under
-- SET ROLE anon | authenticated | service_role; direct database sessions
-- (SQL editor, migrations, cron) have no SET ROLE ('none').
-- Any other role fails closed.
CREATE OR REPLACE FUNCTION public.category_writer_allowed()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT CASE
    WHEN current_setting('role', true) = 'authenticated' THEN public.is_admin()
    WHEN current_setting('role', true) IN ('none', 'service_role', 'postgres', 'supabase_admin') THEN true
    ELSE false
  END;
$$;
REVOKE ALL ON FUNCTION public.category_writer_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.category_writer_allowed() TO anon, authenticated, service_role;

-- Replace ALL existing category policies (permissive policies combine with OR,
-- so adding a restrictive policy next to a USING (true) one is not enough).
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'categories'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.categories', p.policyname);
  END LOOP;
END $$;

CREATE POLICY categories_select_all ON public.categories
  FOR SELECT TO public USING (true);
CREATE POLICY categories_insert_admin ON public.categories
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY categories_update_admin ON public.categories
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY categories_delete_admin ON public.categories
  FOR DELETE TO authenticated USING (public.is_admin());

-- TRUNCATE and TRIGGER are not governed by RLS: take them away from API roles.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.categories FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.categories FROM authenticated;

-- ----------------------------------------------------------------------------
-- 2. Shared display order (CAT-09)
-- ----------------------------------------------------------------------------
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH base AS (
  SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM public.categories
), numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM public.categories WHERE sort_order IS NULL
)
UPDATE public.categories c
SET sort_order = base.max_order + numbered.rn
FROM numbered, base
WHERE c.id = numbered.id;

CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);

-- New categories go last unless an explicit order is given.
CREATE OR REPLACE FUNCTION public.categories_default_sort_order()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    NEW.sort_order := COALESCE((SELECT MAX(sort_order) FROM public.categories), 0) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_default_sort_order ON public.categories;
CREATE TRIGGER categories_default_sort_order
  BEFORE INSERT ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.categories_default_sort_order();

-- Stale-data errors use SQLSTATE PT409: PostgREST returns it as HTTP 409.
-- (40001 must not be used: PostgREST answers it with a 504 instead.)
-- Persist a complete reorder (R6). The caller must send EVERY category id
-- exactly once; anything else (duplicates, unknown ids, a stale list after a
-- concurrent add/delete, or rows hidden from the caller by RLS) is rejected
-- and nothing is changed. Returns the number of rows updated.
-- SECURITY INVOKER: category RLS still applies on top of the explicit check.
CREATE OR REPLACE FUNCTION public.reorder_categories(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  n_ids integer := COALESCE(array_length(p_ids, 1), 0);
  n_total integer;
  n_known integer;
  n_updated integer;
BEGIN
  IF NOT public.category_writer_allowed() THEN
    RAISE EXCEPTION 'category_forbidden: not allowed to reorder categories' USING ERRCODE = '42501';
  END IF;
  IF n_ids = 0 OR array_position(p_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'category_order_invalid: empty list or null id' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_ids) AS x) <> n_ids THEN
    RAISE EXCEPTION 'category_order_invalid: duplicate ids' USING ERRCODE = '22023';
  END IF;

  -- Serialize with concurrent reorders/inserts/deletes
  LOCK TABLE public.categories IN SHARE ROW EXCLUSIVE MODE;

  SELECT count(*) INTO n_total FROM public.categories;
  SELECT count(*) INTO n_known FROM public.categories WHERE id = ANY(p_ids);
  IF n_known <> n_ids THEN
    RAISE EXCEPTION 'category_order_stale: % of % ids do not exist', n_ids - n_known, n_ids USING ERRCODE = 'PT409';
  END IF;
  IF n_total <> n_ids THEN
    RAISE EXCEPTION 'category_order_stale: list has % ids, table has % categories', n_ids, n_total USING ERRCODE = 'PT409';
  END IF;

  UPDATE public.categories c
  SET sort_order = o.ord
  FROM unnest(p_ids) WITH ORDINALITY AS o(id, ord)
  WHERE c.id = o.id;
  GET DIAGNOSTICS n_updated = ROW_COUNT;

  IF n_updated <> n_ids THEN
    -- e.g. an UPDATE policy filtered some rows: abort the whole transaction
    RAISE EXCEPTION 'category_forbidden: only % of % categories could be updated', n_updated, n_ids USING ERRCODE = '42501';
  END IF;
  RETURN n_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_categories(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[]) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Name and image rules (CAT-06, CAT-07, CAT-08)
--    NOT VALID: enforced for new/updated rows without failing on old rows.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_length_check') THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_name_length_check
      CHECK (char_length(btrim(name)) BETWEEN 1 AND 100 AND name = btrim(name)) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_image_not_blank_check') THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_image_not_blank_check
      CHECK (btrim(image) <> '') NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'categories_name_normalized_key') THEN
    IF EXISTS (SELECT 1 FROM public.categories GROUP BY lower(btrim(name)) HAVING count(*) > 1) THEN
      RAISE NOTICE 'Duplicate category names exist; categories_name_normalized_key NOT created. Resolve PRE-CHECK (c) and re-run.';
    ELSE
      CREATE UNIQUE INDEX categories_name_normalized_key ON public.categories (lower(btrim(name)));
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Product membership (CAT-01, R1, R5)
--    products.category_name stays the field the app reads/writes; category_id
--    is kept in sync from it; renames cascade in the same statement.
-- ----------------------------------------------------------------------------
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.category_id IS NULL
  AND p.category_name = c.name;

CREATE OR REPLACE FUNCTION public.products_sync_category_id()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.category_name IS DISTINCT FROM OLD.category_name THEN
    NEW.category_id := (SELECT id FROM public.categories WHERE name = NEW.category_name LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_sync_category_id ON public.products;
CREATE TRIGGER products_sync_category_id
  BEFORE INSERT OR UPDATE OF category_name ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_sync_category_id();

-- Rename cascade. SECURITY DEFINER so product RLS cannot silently skip rows,
-- which is why it re-checks authorization itself (R1) and verifies that no
-- product was left behind before the statement commits.
CREATE OR REPLACE FUNCTION public.categories_cascade_rename()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    IF NOT public.category_writer_allowed() THEN
      RAISE EXCEPTION 'category_forbidden: not allowed to rename categories' USING ERRCODE = '42501';
    END IF;

    UPDATE public.products
    SET category_name = NEW.name
    WHERE category_id = NEW.id OR category_name = OLD.name;

    IF EXISTS (SELECT 1 FROM public.products WHERE category_name = OLD.name OR (category_id = NEW.id AND category_name <> NEW.name)) THEN
      RAISE EXCEPTION 'category_rename_incomplete: products still reference "%"', OLD.name USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.categories_cascade_rename() FROM PUBLIC;

DROP TRIGGER IF EXISTS categories_cascade_rename ON public.categories;
CREATE TRIGGER categories_cascade_rename
  AFTER UPDATE OF name ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.categories_cascade_rename();

-- Occupied categories cannot be deleted: reassign products first.
CREATE OR REPLACE FUNCTION public.categories_block_delete_in_use()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  in_use integer;
BEGIN
  SELECT count(*) INTO in_use FROM public.products
  WHERE category_id = OLD.id OR category_name = OLD.name;

  IF in_use > 0 THEN
    RAISE EXCEPTION 'category_in_use: % product(s) still assigned to "%"', in_use, OLD.name
      USING ERRCODE = '23503', HINT = 'Reassign the products to another category first.';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.categories_block_delete_in_use() FROM PUBLIC;

DROP TRIGGER IF EXISTS categories_block_delete_in_use ON public.categories;
CREATE TRIGGER categories_block_delete_in_use
  BEFORE DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.categories_block_delete_in_use();

-- ----------------------------------------------------------------------------
-- 5. Category saves with a resolvable outcome (R5, V2-01)
--
-- Every app save carries a client-generated operation id (p_op_id). The save
-- records it in category_write_ops in the SAME transaction. If the client
-- loses the response, resolve_category_write(op) tells it the real outcome:
-- it inserts an 'aborted' tombstone for the id, and a primary-key conflict
-- makes that insert WAIT for an in-flight save holding the id, so the answer
-- is only given once the save has committed or rolled back. A tombstone
-- written first makes a late-arriving save fail, so it can never commit
-- after being reported aborted. The client keeps every image involved
-- protected from cleanup until this answer is definitive.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_update_category(uuid, text, text, text);

CREATE TABLE IF NOT EXISTS public.category_write_ops (
  op_id uuid PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('committed', 'aborted')),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- The category a committed save wrote, so a replayed request can be answered
ALTER TABLE public.category_write_ops ADD COLUMN IF NOT EXISTS category_id uuid;
ALTER TABLE public.category_write_ops ENABLE ROW LEVEL SECURITY;
-- No policies: only the SECURITY DEFINER functions below touch it.
REVOKE ALL ON public.category_write_ops FROM PUBLIC, anon, authenticated;

-- Claim an operation id for this transaction.
--   new operation          → returns replayed = false (caller performs the write)
--   already COMMITTED      → returns replayed = true + the category it wrote:
--                            the same request was delivered again (a retry after
--                            a lost response), so the caller answers idempotently
--   already ABORTED        → error 55000: it was reported as not saved and must
--                            never be applied later
-- If the first delivery is still running, the INSERT waits for it.
DROP FUNCTION IF EXISTS public.category_record_write(uuid);
CREATE OR REPLACE FUNCTION category_internal.category_claim_write(p_op_id uuid, OUT replayed boolean, OUT category_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.category_writer_allowed() THEN
    RAISE EXCEPTION 'category_forbidden: not allowed to save categories' USING ERRCODE = '42501';
  END IF;
  replayed := false;
  BEGIN
    INSERT INTO public.category_write_ops (op_id, status) VALUES (p_op_id, 'committed');
  EXCEPTION WHEN unique_violation THEN
    SELECT o.status, o.category_id INTO v_status, category_id
    FROM public.category_write_ops o WHERE o.op_id = p_op_id;
    IF v_status = 'committed' THEN
      replayed := true;
    ELSE
      RAISE EXCEPTION 'category_op_closed: operation % was resolved as not saved', p_op_id USING ERRCODE = '55000';
    END IF;
  END;
END;
$$;
REVOKE ALL ON FUNCTION category_internal.category_claim_write(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION category_internal.category_claim_write(uuid) TO authenticated, service_role;

-- Record which category a committed save wrote. Same caller rule as the save,
-- and set-once: an operation's mapping can never be changed afterwards, so a
-- direct call cannot redirect what a replay returns.
CREATE OR REPLACE FUNCTION category_internal.category_finish_write(p_op_id uuid, p_category_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.category_writer_allowed() THEN
    RAISE EXCEPTION 'category_forbidden: not allowed to record category saves' USING ERRCODE = '42501';
  END IF;
  UPDATE public.category_write_ops
  SET category_id = p_category_id
  WHERE op_id = p_op_id AND status = 'committed' AND category_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'category_op_closed: operation % is not an open committed save', p_op_id USING ERRCODE = '55000';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION category_internal.category_finish_write(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION category_internal.category_finish_write(uuid, uuid) TO authenticated, service_role;

-- Create (p_id NULL) or update a category in one transaction: validates,
-- checks the caller and, for updates, the expected current name (stale-edit
-- protection); a rename moves every product via the trigger above.
-- SECURITY INVOKER: category RLS applies on top of the explicit check.
CREATE OR REPLACE FUNCTION public.admin_save_category(
  p_op_id uuid,
  p_id uuid,
  p_name text,
  p_image text,
  p_expected_name text DEFAULT NULL
)
RETURNS public.categories
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_name text := btrim(regexp_replace(COALESCE(p_name, ''), '\s+', ' ', 'g'));
  v_image text := btrim(COALESCE(p_image, ''));
  v_old public.categories;
  v_new public.categories;
  v_claim record;
BEGIN
  IF NOT public.category_writer_allowed() THEN
    RAISE EXCEPTION 'category_forbidden: not allowed to save categories' USING ERRCODE = '42501';
  END IF;
  IF p_op_id IS NULL THEN
    RAISE EXCEPTION 'category_invalid: operation id required' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'category_invalid: name must be 1-100 characters' USING ERRCODE = '22023';
  END IF;
  IF v_image = '' THEN
    RAISE EXCEPTION 'category_invalid: image is required' USING ERRCODE = '22023';
  END IF;

  -- First statement of the write: from here on the op id is "taken" by this
  -- transaction, and resolve_category_write() waits for it.
  SELECT * INTO v_claim FROM category_internal.category_claim_write(p_op_id);
  IF v_claim.replayed THEN
    -- Same request delivered again after it committed: answer with the record
    SELECT * INTO v_new FROM public.categories WHERE id = v_claim.category_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'category_stale: the saved category no longer exists' USING ERRCODE = 'PT409';
    END IF;
    RETURN v_new;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.categories (name, image) VALUES (v_name, v_image)
    RETURNING * INTO v_new;
    PERFORM category_internal.category_finish_write(p_op_id, v_new.id);
    RETURN v_new;
  END IF;

  SELECT * INTO v_old FROM public.categories WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'category_not_found: %', p_id USING ERRCODE = 'P0002';
  END IF;
  IF p_expected_name IS NOT NULL AND v_old.name IS DISTINCT FROM p_expected_name THEN
    RAISE EXCEPTION 'category_stale: current name is "%"', v_old.name USING ERRCODE = 'PT409';
  END IF;

  UPDATE public.categories SET name = v_name, image = v_image
  WHERE id = p_id
  RETURNING * INTO v_new;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'category_forbidden: update was not permitted' USING ERRCODE = '42501';
  END IF;
  PERFORM category_internal.category_finish_write(p_op_id, v_new.id);
  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_category(uuid, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_category(uuid, uuid, text, text, text) TO authenticated, service_role;

-- Definitive outcome of a save: 'committed' or 'aborted'. Blocks while a save
-- holding p_op_id is still in flight (bounded by statement_timeout; a timeout
-- is an error and the client keeps treating the outcome as unknown).
CREATE OR REPLACE FUNCTION public.resolve_category_write(p_op_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.category_writer_allowed() THEN
    RAISE EXCEPTION 'category_forbidden: not allowed to resolve category saves' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.category_write_ops (op_id, status) VALUES (p_op_id, 'aborted')
  ON CONFLICT (op_id) DO NOTHING;
  SELECT status INTO v_status FROM public.category_write_ops WHERE op_id = p_op_id;
  RETURN v_status;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_category_write(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_category_write(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. Storage reference status by canonical object identity (R2, R7)
-- ----------------------------------------------------------------------------

-- Percent-decode. Returns NULL when the result is not valid UTF-8 (the caller
-- then treats the reference status as unknown).
CREATE OR REPLACE FUNCTION public.storage_percent_decode(p text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  v bytea;
BEGIN
  IF p IS NULL OR strpos(p, '%') = 0 THEN
    RETURN p;
  END IF;
  SELECT string_agg(
           CASE WHEN r.arr[1] ~ '^%[0-9A-Fa-f]{2}$' THEN decode(substr(r.arr[1], 2), 'hex')
                ELSE convert_to(r.arr[1], 'UTF8') END,
           ''::bytea ORDER BY r.ord)
    INTO v
    FROM regexp_matches(p, '%[0-9A-Fa-f]{2}|[^%]+|%', 'g') WITH ORDINALITY AS r(arr, ord);
  RETURN convert_from(v, 'UTF8');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Canonical identity of a Supabase Storage URL: (bucket, decoded object path).
-- Accepts object/{public|sign|authenticated} and render/image/{public|sign|
-- authenticated} URLs; query string and fragment are ignored. NULL if the
-- text is not such a URL or the path is unsafe/undecodable.
CREATE OR REPLACE FUNCTION public.storage_object_identity(p_url text, OUT bucket text, OUT path text)
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  m text[];
BEGIN
  m := regexp_match(
    split_part(split_part(COALESCE(p_url, ''), '#', 1), '?', 1),
    '/storage/v1/(?:object|render/image)/(?:public|sign|authenticated)/([^/]+)/(.+)$'
  );
  IF m IS NULL THEN
    RETURN;
  END IF;
  bucket := public.storage_percent_decode(m[1]);
  path := public.storage_percent_decode(m[2]);
  IF bucket IS NULL OR path IS NULL OR path = '' OR path ~ '(^|/)\.\.(/|$)' THEN
    bucket := NULL;
    path := NULL;
  END IF;
END;
$$;

-- Does a row's text reference the object path? true / false / NULL (unknown).
-- The path (not the full URL) is matched after decoding, so different query
-- strings, encodings, origins or URL kinds of the same object all count.
CREATE OR REPLACE FUNCTION public.storage_text_references(p_text text, p_path text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  t text := replace(COALESCE(p_text, ''), '\/', '/');
  d text;
BEGIN
  IF strpos(t, p_path) > 0 THEN
    RETURN true;
  END IF;
  IF strpos(t, '%') = 0 THEN
    RETURN false;
  END IF;
  d := public.storage_percent_decode(t);
  IF d IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN strpos(d, p_path) > 0;
END;
$$;

-- Reference status of a decoded object path: 'referenced' | 'unreferenced' |
-- 'unknown'. Scans every table in the public schema except history/bookkeeping
-- (audit_logs, category_write_ops), so nested JSON (variants, A+ content,
-- review images, banners, order/cart snapshots) is covered. Any doubt yields
-- 'unknown'. Only sees COMMITTED rows: a reference being written by an
-- in-flight transaction is invisible, which is why the client additionally
-- holds images of unresolved saves (see section 5).
DROP FUNCTION IF EXISTS public.storage_path_reference_status(text);
CREATE OR REPLACE FUNCTION category_internal.storage_path_reference_status(p_path text)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  tbl record;
  n_ref bigint;
  n_unknown bigint;
  any_unknown boolean := false;
BEGIN
  IF p_path IS NULL OR p_path = '' THEN
    RETURN 'unknown';
  END IF;

  FOR tbl IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND c.relname NOT IN ('audit_logs', 'category_write_ops')
  LOOP
    EXECUTE format(
      'SELECT count(*) FILTER (WHERE m), count(*) FILTER (WHERE m IS NULL)
       FROM (SELECT public.storage_text_references(to_jsonb(t)::text, $1) AS m FROM public.%I t) s',
      tbl.relname)
    INTO n_ref, n_unknown
    USING p_path;

    IF n_ref > 0 THEN
      RETURN 'referenced';
    END IF;
    IF n_unknown > 0 THEN
      any_unknown := true;
    END IF;
  END LOOP;

  RETURN CASE WHEN any_unknown THEN 'unknown' ELSE 'unreferenced' END;
EXCEPTION WHEN OTHERS THEN
  RETURN 'unknown';
END;
$$;
-- No caller check here: the storage DELETE policy evaluates it for every
-- deleting role (including anon). It only returns a status and is not
-- reachable through the Data API (internal schema).
REVOKE ALL ON FUNCTION category_internal.storage_path_reference_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION category_internal.storage_path_reference_status(text) TO anon, authenticated, service_role;

-- Reference status for a storage URL, for safe cleanup:
--   {"status": "referenced" | "unreferenced" | "unknown", "bucket": ..., "path": ...}
CREATE OR REPLACE FUNCTION public.storage_reference_status(p_url text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  obj record;
BEGIN
  IF NOT public.category_writer_allowed() THEN
    RAISE EXCEPTION 'category_forbidden: not allowed to inspect storage references' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO obj FROM public.storage_object_identity(p_url);
  IF obj.path IS NULL THEN
    RETURN jsonb_build_object('status', 'unknown', 'bucket', NULL, 'path', NULL);
  END IF;

  RETURN jsonb_build_object(
    'status', category_internal.storage_path_reference_status(obj.path),
    'bucket', obj.bucket,
    'path', obj.path);
END;
$$;

REVOKE ALL ON FUNCTION public.storage_reference_status(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_reference_status(text) TO authenticated, service_role;

COMMIT;

-- POST-CHECK (read-only) ------------------------------------------------------
--   -- Internal helpers must not be exposed: expect 404 PGRST202 for
--   -- POST /rest/v1/rpc/category_finish_write, and category_internal must not
--   -- appear in Settings → API → Exposed schemas.
--   SELECT n.nspname, p.proname, p.prosecdef FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE p.proname IN ('category_claim_write','category_finish_write',
--                       'storage_path_reference_status','storage_object_deletable');
--   -- expect only schema category_internal
--   SELECT policyname, roles, cmd, qual, with_check FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'categories' ORDER BY cmd;
--   -- expect exactly: SELECT(public,true) + INSERT/UPDATE/DELETE(authenticated, is_admin())
--   SELECT name, sort_order, visible FROM public.categories ORDER BY sort_order;
--   SELECT category_name, count(*) FILTER (WHERE category_id IS NULL) AS unlinked, count(*)
--   FROM public.products GROUP BY 1 ORDER BY 1;
