# Release checklist — Categories + payment path + checkout

Prepared 2026-11-03 · project `jbdzhwenzedlwbdpguyt` · `main` = deployed `13d61f7` (no commits since 2026-07-10).
Scope is **frozen**: Categories, payments (P) and checkout (B8). No new fixes or audits. Step details and commands: [RUNBOOK.md](RUNBOOK.md); evidence: [ACCEPTANCE.md](ACCEPTANCE.md), [READINESS.md](READINESS.md), [../2026-10-checkout-b8/PROPOSAL.md](../2026-10-checkout-b8/PROPOSAL.md).

---

## Part 1 — Completed (local only; nothing in production changed)

- [x] All 15 Categories findings (CAT-01…15) and every follow-up (R1–R7, V2-01/02, V3-01, V4-01, S1, production permission gap, R5-01…03, R6-01/02) closed and independently re-verified.
- [x] B8 checkout repair (insert without read-back) implemented in the release code **and** in image A.
- [x] B4: service-role key present in the running container (`role=service_role`, correct project) — read-only, 2026-10-25.
- [x] B7: production payment path confirmed broken (anon cannot read `orders`; last completed online payment 2026-03-06) — read-only, 2026-10-25.
- [x] A2: production pre-check re-run 2026-11-03 — PASS, identical to the 2026-10-25 baseline (`precheck-results/2026-11-03.md`).
- [x] A3: private backup `~/ailem-backups/20261103-2355-pre-release` + restore test PASS 2026-11-04 (2.3).
- [x] Image A tested at every database stage (before P: fails closed; P; P + 1–5; P + 1–5 + 7): webhooks 30/30, old-admin calls 6/6, browser checkout → Payme → status page.
- [x] Re-verified on this tree today (2026-11-03): client 189/189; `npm run test:db` all pass (category, security, audit, payment, 8 concurrency); `rollback-compat-webhooks.patch` applies to `13d61f7` and its files are identical to the tested sources; `git diff --check` clean. Last full local-staging run (2026-10-25): API 93/93, webhooks 30/30, `verify-after-migration.sql` 0 FAIL, build OK. (ACCEPTANCE §4 still shows the earlier 185 / 90 / 28 counts — superseded by these.)

---

## Part 2 — Pending

### 2.1 Exact PR scope

**PR A — rollback target** (branch from `13d61f7`; contents = `git apply release/2026-10-categories/rollback-compat-webhooks.patch`, nothing else)

| File | Change |
|---|---|
| `app/api/payme-webhook/route.js` | service-role client; Create/Perform via P functions; Telegram after commit |
| `app/api/click-webhook/route.js` | service-role client; complete via P function; id normalisation |
| `src/lib/paymentIds.js` | new |
| `src/services/api.js` | `ordersAPI.create` only (B8) |
| `supabase-migrations/add-payment-fulfillment.sql` | new (P) — applied manually, not by CI |

**Release PR — Categories** (branch from PR A)

| Group | Files |
|---|---|
| Application | `src/components/admin/sections/CategoriesSection.jsx` (new), `src/components/admin/exitGuard.js` (new), `src/components/admin/sections/index.js`, `src/components/pages/DesktopAdminPanel.jsx`, `src/components/admin/sections/ProductsSection.jsx`, `src/context/AdminContext.jsx`, `src/hooks/useProducts.js`, `src/services/api.js`, `src/services/auditLog.js`, `src/utils/validation.js`, `src/utils/categories.js` (new), `src/utils/operationId.js` (new), `src/utils/storageCleanup.js` (new) |
| Migrations (manual) | `secure-admin-users.sql`, `add-category-integrity.sql`, `protect-referenced-storage-objects.sql`, `restrict-storage-writes-to-admins.sql`, `secure-audit-logs.sql`, `secure-products.sql` |
| **Optional** migration | `restrict-product-images-bucket.sql` — bucket size/type limits; **not** in the run order, not a blocker; apply only if you decide so |
| Tests | `src/tests/categories.test.jsx`, `src/tests/paymentIds.test.js`, `src/tests/ordersCreate.test.js`, `supabase-tests/`, `package.json` (`test:db` script only) |
| Docs | `src/components/admin/CLAUDE.md`, `src/services/CLAUDE.md`, `release/2026-10-categories/`, `release/2026-10-checkout-b8/` |

**In neither PR** (default; your call): `local-staging/`, `audit-reports/`, `.claude/launch.json`.

- [ ] CI build green on both PRs.
- [ ] PR A diff == the patch (no extra files).

### 2.2 Outstanding production checks (read-only)

- [x] Re-run `production-precheck.sql` — done 2026-11-03, PASS (`precheck-results/2026-11-03.md`). Re-run sections 2 and 12 right before P and before migration 1 (RUNBOOK 1.5).
- [ ] Re-confirm B4 (key present) and the running image tag, right before deploying image A.
- [ ] `pg_stat_activity` quiet before each migration step (pre-check §12).

### 2.3 Backup and restore verification (B1)

Before P, and again at the start of the window. Exact commands: RUNBOOK 1.2–1.4. Private directory under `~/ailem-backups/` (owner-only; contains customer data; never committed, uploaded or shared). Production is only read.

- [x] **Before P — done 2026-11-03/04:** `~/ailem-backups/20261103-2355-pre-release` (102 MB, 175 checksums), restore test passed (below). Its `RESTORE.md` holds the same procedure.
- [ ] **Window backup** (fresh, at the start of Phase B):
  - [ ] DB password typed by you at a hidden prompt only (never chat, file or command line).
  - [ ] Dumps `roles.sql`, `schema.sql`, `data.sql` (public, auth, storage) + `product-images/` (≈170 objects); CLI unlinked afterwards.
  - [ ] **Required supplement** `access-privileges.sql` from `export-access-privileges.sql` (read-only). Without it a restore grants anon SELECT on `orders`/`users`.
  - [ ] **Required supplement** `storage-policies.sql` from `export-storage-policies.sql` (read-only). The dump has no storage policies.
  - [ ] `MANIFEST.sha256`, permissions 700/600.
- [ ] **Restore test** in a disposable local Supabase stack (own project id and ports, not `local-staging/`):
  - [ ] Auth/Storage pinned to ≥ production (tested **auth v2.197.0, storage v1.84.25**; read the current versions from `/auth/v1/health` and `/storage/v1/version`).
  - [ ] As superuser **`supabase_admin`**, in order: `roles.sql` → `schema.sql` → `SET session_replication_role = replica` → `data.sql` (one transaction) → `access-privileges.sql` → `storage-policies.sql`; all without error.
  - [ ] Row counts: every table = dump, and = live production (tested 48 tables / 1,032 rows; `orders` 163, `users` 164, `products` 37, `categories` 10, `admin_users` 1, `auth.users` 2, `storage.objects` 170).
  - [ ] Access rules = production (pre-check 4b, 5, 6c–6e, 8, 13c `anon_select = false`).
  - [ ] Storage: manifest OK; each file's size + MD5 = `storage.objects` metadata; no missing/extra files (tested 170/170).
  - [ ] No outbound effects (no app connected, no HTTP-calling functions, no cron); then `supabase stop --no-backup` and delete the scratch folder.
- [ ] Do not continue if any check fails.

### 2.4 Migration and deployment order

**Phase A — before the window (can be days earlier)**

1. [ ] Pre-check (2.2) and backup + restore test (2.3).
2. [ ] Apply **P** `add-payment-fulfillment.sql` (SQL Editor, postgres). Post-check: 3 functions `anon false / authenticated false / service_role true`. Anon probes on `rpc/payme_perform_transaction` and `rpc/click_complete_payment` → 401.
3. [ ] Merge **PR A** → GitHub Actions deploys → `gh run watch` success → record `IMAGE_TAG=sha-<A>` from `/opt/ailem/.deploy.env` = **rollback target**.
4. [ ] One real checkout + Payme payment (2.6, "Phase A smoke").

**Phase B — release window**

5. [ ] Admins save and close every `/admin` tab (B2); fresh backup + restore test.
6. [ ] Migrations in order, each ending without error, POST-CHECK after each: `secure-admin-users.sql` → `add-category-integrity.sql` → `protect-referenced-storage-objects.sql` → `restrict-storage-writes-to-admins.sql` → `secure-audit-logs.sql`.
7. [ ] `verify-after-migration.sql`: all PASS except `s_user_product` / `s_anon_product` = PENDING; Data API probes (RUNBOOK 3.2); site on image A still works.
8. [ ] Merge **release PR** → deploy success → `.deploy.env` shows the release sha; container healthy.
9. [ ] Apply `secure-products.sql`; `verify-after-migration.sql` now every row PASS; anon product PATCH → 401.
10. [ ] Smoke checks (2.6, "Phase B smoke"); admins resume.
11. [ ] Optional, only if decided: `restrict-product-images-bucket.sql`.

### 2.5 Rollback target

- **Code:** image A (`sha-<A>` recorded in step 3). Never `sha-13d61f7` (anon webhooks, broken checkout, R6-02).
  `sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-<A>/' /opt/ailem/.deploy.env` → `docker compose --env-file .deploy.env pull app && up -d`; revert the release merge on `main` (keep PR A).
- **Database:** no rollback of any protection (RLS, grants, storage policies, audit trigger, P functions). Problems are fixed forward (RUNBOOK §7). Image A is tested against every migration stage.
- **Last resort:** full restore from 2.3 in the tested order (RUNBOOK 7.8): roles → schema → data → `access-privileges.sql` → `storage-policies.sql` → re-upload `product-images/`; then immediately re-apply P, 1–5 and 7. Only the local restore is tested; rehearse a hosted restore in a scratch project first.

### 2.6 Smoke checks

**Phase A (after image A)**
- [ ] Storefront loads categories and products (logged out).
- [ ] One real checkout: order appears `pending` before Payme opens; after payment `approved / payme_state 2 / fulfilled_by payme:<tx>`; stock −qty once; status page shows success, cart cleared.
- [ ] `docker compose logs app` shows no webhook errors.

**Phase B (after release + secure-products)**
- [ ] Every admin hard-reloads `/admin` and signs in.
- [ ] Storefront: categories in stored order, hidden ones absent, products visible.
- [ ] Kategoriyalar with a temporary `ZZ Release test` category: add with upload → rename → reorder → hide/show → deleting **Choyshab** refused (in use) → delete the test category (its image removed) → dirty-form navigation warns.
- [ ] Mahsulotlar: change a price and revert; hide/show a product.
- [ ] Audit log shows those entries with the right admin e-mail and times.
- [ ] One more real checkout + payment, as in Phase A.

---

## Part 3 — Authorization needed from you

Each item is a separate decision; approving one does not approve the next.

| # | Action | Who | Production effect |
|---|---|---|---|
| A1 | Create the two branches, commit exactly the scope in 2.1, push, open PR A and the release PR (no merge) | me | GitHub only; deploys nothing |
| A2 | Run `production-precheck.sql` (read-only) | you in the SQL Editor (my Supabase tool has no permission on this project) | none |
| A3 | Backup: `supabase link` with your DB password + dumps + bucket copy into your private folder; I can run the local restore test from that folder if you allow it | you (credentials), me (restore test) | read-only on production |
| A4 | Apply P `add-payment-fulfillment.sql` | you, or me with SQL access you grant | additive schema change |
| A5 | Merge PR A (auto-deploys image A) | you, or me on your explicit go | production deploy |
| A6 | One real checkout + payment as the Phase A smoke | you (real Payme payment) | real order and payment |
| A7 | Release window: confirm admin pause, apply migrations 1–5, merge the release PR, apply `secure-products.sql`, run the Phase B smoke (creates/deletes a temporary category, edits and reverts a product price) | you, or me step by step on your go | permissions, schema, deploy, test data |
| A8 | Standing permission to roll the code back to image A (SSH, 2.5) if a smoke check fails | me | redeploy of the recorded tag |
| A9 | Decisions: apply the optional bucket migration (yes/no); keep `local-staging/` and `audit-reports/` in the repo (yes/no) | you | none by itself |

Without A1–A7 nothing moves; the release currently waits on **A1** (PRs) and **A2/A3** (pre-check and verified backup).
