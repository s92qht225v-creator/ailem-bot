-- ============================================================================
-- Secure admin membership (public.admin_users)  —  RUN FIRST
-- (production pre-check review, 2026-10-25)
--
-- PRODUCTION FINDING: RLS is DISABLED on admin_users and anon/authenticated
-- hold SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES. The
-- existing policies ("Users can check if they are admin", "Only service role
-- can modify admin_users") are therefore inert. public.is_admin() trusts this
-- table, so any signed-in user (and even anon) could add a membership row and
-- pass every admin check — including the new category and storage guards.
-- This file must be applied BEFORE anything that relies on is_admin().
--
-- AFTER THIS FILE
--   * authenticated: SELECT only its OWN row (what AdminAuth.jsx needs at login)
--   * anon: no access
--   * no INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES for anon or
--     authenticated (TRUNCATE etc. are not governed by RLS, so they are revoked)
--   * service_role (server, dashboard) and postgres keep full control —
--     provisioning admins stays: Dashboard → Table editor, or SQL Editor
--   * existing membership rows are not touched
--
-- Idempotent. Refuses to run when no admin row is linked to an auth user
-- (that would lock everyone out of the admin panel).
--
-- ROLLBACK: there is NO safe rollback to the previous state. Never re-grant
-- anon/authenticated write access or disable RLS on this table. If the admin
-- login breaks, fix the SELECT policy (below), not the grants.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users au JOIN auth.users u ON u.id = au.user_id
  ) THEN
    RAISE EXCEPTION 'secure-admin-users: no admin_users row is linked to an auth user — add the real admin first, then re-run';
  END IF;
END $$;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Replace every existing policy (permissive policies are OR-ed together)
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_users'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.admin_users', p.policyname);
  END LOOP;
END $$;

CREATE POLICY admin_users_select_own ON public.admin_users
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

-- Same definition as fix-users-orders-rls.sql (re-stated so this file is
-- self-contained); reads the now-protected table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Indirect paths: SECURITY DEFINER functions run with their owner's rights
-- and could still write admin_users. Fail if one does (review it first).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'extensions',
                            'graphql', 'graphql_public', 'realtime', 'vault', 'pgsodium', 'net', 'cron', 'supabase_functions')
      AND p.prosrc ~* '(insert\s+into|update|delete\s+from|truncate)\s+(public\.)?admin_users'
  LOOP
    RAISE EXCEPTION 'secure-admin-users: SECURITY DEFINER function % writes admin_users — review/restrict it before applying', r.fn;
  END LOOP;
END $$;

COMMIT;

-- POST-CHECK (read-only):
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_users'::regclass;          -- true
--   SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'admin_users';     -- only admin_users_select_own
--   SELECT grantee, string_agg(privilege_type, ',') FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND table_name = 'admin_users' GROUP BY 1;                 -- authenticated: SELECT only; no anon
