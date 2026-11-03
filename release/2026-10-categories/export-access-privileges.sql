-- ============================================================================
-- Backup supplement 1/2 — exact API-role privileges (READ-ONLY)
-- Output: one text value = the file access-privileges.sql for the backup folder.
--
-- Why: pg_dump emits no REVOKEs relative to Supabase's default privileges.
-- Restored into a fresh project, schema.sql alone grants MORE than production
-- (anon SELECT on orders/users comes back — the July PII fix is undone).
-- This export reproduces production's exact grants for every public table,
-- sequence and function. Tested 2026-11-04 (RUNBOOK 1.4).
--
-- Run: psql "<session-pooler URL>" -X -At -f export-access-privileges.sql > "$B/access-privileges.sql"
--  or: SQL Editor → run → copy the single result cell into that file.
-- ============================================================================
WITH roles(r) AS (VALUES ('anon'), ('authenticated'), ('service_role')),
rel AS (
  SELECT c.oid, format('%I.%I', n.nspname, c.relname) AS name,
         CASE WHEN c.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END AS kind, c.relacl
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p', 'S')
),
rel_sql AS (
  SELECT r.name,
         format('REVOKE ALL ON %s %s FROM PUBLIC, anon, authenticated, service_role;', r.kind, r.name)
         || coalesce(E'\n' || string_agg(format('GRANT %s ON %s %s TO %s;', g.privs, r.kind, r.name, g.grantee), E'\n' ORDER BY g.grantee), '') AS stmt
  FROM rel r
  LEFT JOIN LATERAL (
    SELECT CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(x.grantee)) END AS grantee,
           string_agg(x.privilege_type, ', ' ORDER BY x.privilege_type) AS privs
    FROM aclexplode(r.relacl) x
    WHERE x.grantee = 0 OR pg_get_userbyid(x.grantee) IN (SELECT r FROM roles)
    GROUP BY 1
  ) g ON true
  GROUP BY r.name, r.kind
),
fn_sql AS (
  SELECT p.oid::regprocedure::text AS name,
         format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role;', 'public.' || p.oid::regprocedure::text)
         || coalesce(E'\n' || string_agg(format('GRANT EXECUTE ON FUNCTION %s TO %s;', 'public.' || p.oid::regprocedure::text,
              CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(x.grantee)) END), E'\n' ORDER BY x.grantee), '') AS stmt
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  LEFT JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
    ON x.privilege_type = 'EXECUTE' AND (x.grantee = 0 OR pg_get_userbyid(x.grantee) IN (SELECT r FROM roles))
  WHERE n.nspname = 'public'
  GROUP BY p.oid
)
SELECT concat_ws(E'\n',
  '-- Exact API-role privileges of production (exported ' || to_char(now(), 'YYYY-MM-DD HH24:MI TZ') || ').',
  '-- Apply after data.sql, as a superuser (RUNBOOK 1.4). Contains no data.',
  'SET search_path = public;', 'BEGIN;',
  (SELECT string_agg(stmt, E'\n' ORDER BY name) FROM rel_sql),
  (SELECT string_agg(stmt, E'\n' ORDER BY name) FROM fn_sql),
  'COMMIT;') AS sql;
