-- ============================================================================
-- Secure products: public read, admin-only writes
-- (production pre-check review, 2026-10-25)
--
-- PRODUCTION FINDING: RLS is DISABLED on products; anon/authenticated hold all
-- DML plus TRUNCATE/TRIGGER/REFERENCES; the policies ("Allow all operations on
-- products", "... by service role" with roles {public} and USING (true)) are
-- inert and would allow everything anyway. Anyone with the public anon key
-- can change prices, stock or delete products.
--
-- WRITERS (traced in code, 2026-10-25)
--   * admin panel (authenticated admin): ProductsSection, AdminContext stock
--     changes on order approve/reject, visibility, barcode   → is_admin() policy
--   * payment webhooks app/api/payme-webhook, app/api/click-webhook: stock
--     deduction → MUST use the service-role client (createServerSupabaseClient).
--     They used the anon key up to 13d61f7; rollback-compat image A
--     (release/2026-10-categories/rollback-compat-webhooks.patch) and the
--     release code switch them. Apply this file only AFTER image A or the
--     release is deployed (RUNBOOK), otherwise paid orders stop deducting
--     stock. Never roll the app back to sha-13d61f7 once this is applied.
--   * category rename cascade: SECURITY DEFINER trigger (unaffected)
--   * CashierMode.jsx would write as a customer, but it is not mounted in the
--     Next.js app (no import) — if it is re-enabled it needs a server route.
--   * readers: storefront (anon) and get_essential_data (SECURITY DEFINER)
--
-- Idempotent. NO ROLLBACK that weakens it: do not disable RLS or re-grant
-- anon/authenticated writes (that re-opens price/stock tampering by anyone).
-- Fix forward instead (RUNBOOK §7): webhooks failing → check that
-- SUPABASE_SERVICE_ROLE_KEY is set in the app container; a missed admin
-- writer → run it with the admin session (is_admin()); a missed server
-- writer → use the service-role client. Code rollback target is image A.
-- ============================================================================

BEGIN;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.products', p.policyname);
  END LOOP;
END $$;

CREATE POLICY products_select_all ON public.products
  FOR SELECT TO public USING (true);
CREATE POLICY products_insert_admin ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY products_update_admin ON public.products
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY products_delete_admin ON public.products
  FOR DELETE TO authenticated USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.products FROM PUBLIC, anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.products FROM authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

COMMIT;

-- POST-CHECK (read-only):
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.products'::regclass;   -- true
--   SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'products';     -- 4 policies above
--   SELECT has_table_privilege('anon', 'public.products', 'UPDATE');                -- false
