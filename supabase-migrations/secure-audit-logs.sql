-- ============================================================================
-- Secure audit logs: admin read, admin append-only, server-stamped identity
-- (production pre-check review, 2026-10-25)
--
-- PRODUCTION FINDING: RLS is DISABLED on audit_logs, no policies exist, and
-- anon/authenticated hold all DML plus TRUNCATE/TRIGGER/REFERENCES. Anyone
-- could read the admin trail, forge entries, or edit/delete them.
--
-- WRITERS (traced): only admin code via src/services/auditLog.js
--   (AdminContext category actions, UsersSection role changes) as an
--   authenticated admin. Reader: AuditLogsSection (admin).
--
-- AFTER THIS FILE
--   * authenticated admins: SELECT, INSERT (append-only: no UPDATE/DELETE)
--   * created_at, admin_id and admin_email are set by the database for every
--     API insert: admin_id = auth.uid(), admin_email = that user's e-mail in
--     auth.users (NULL when it has none). Client-supplied values — and the
--     JWT's own email claim — are never used → entries cannot be back-dated or
--     attributed to someone else. Trusted server inserts (service_role, no
--     auth.uid()) keep the values they send.
--   * anon: no access; service_role/postgres: unchanged
--
-- Requires audit_logs columns admin_id, admin_email, created_at (the app
-- inserts them); the file stops with an error if one is missing.
-- Idempotent. NO ROLLBACK that weakens it: do not drop the trigger, disable
-- RLS or re-grant anon access (that re-opens forged or edited audit entries).
-- If admin logging fails after this file, fix forward: check that the admin
-- is in admin_users (is_admin()) and that audit_logs still has the columns
-- above; the trigger function can be replaced with CREATE OR REPLACE.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['admin_id', 'admin_email', 'created_at'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = c) THEN
      RAISE EXCEPTION 'secure-audit-logs: audit_logs.% is missing', c;
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.audit_logs', p.policyname);
  END LOOP;
END $$;

CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY audit_logs_insert_admin ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

REVOKE ALL ON public.audit_logs FROM PUBLIC, anon;
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.audit_logs FROM authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- Identity and time come from the database, not the client. SECURITY
-- DEFINER only to read auth.users (the trusted e-mail source); trigger
-- functions cannot be called through the API.
CREATE OR REPLACE FUNCTION public.audit_logs_stamp()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.created_at := now();
  IF auth.uid() IS NOT NULL THEN
    NEW.admin_id := auth.uid();
    NEW.admin_email := (SELECT NULLIF(btrim(u.email), '') FROM auth.users u WHERE u.id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_logs_stamp() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_logs_stamp ON public.audit_logs;
CREATE TRIGGER audit_logs_stamp
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_stamp();

COMMIT;

-- POST-CHECK (read-only):
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.audit_logs'::regclass;  -- true
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'audit_logs';          -- SELECT + INSERT (admin)
--   SELECT has_table_privilege('authenticated', 'public.audit_logs', 'DELETE');      -- false
