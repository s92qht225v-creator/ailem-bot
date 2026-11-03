# Kategoriyalar — final acceptance report

25 October 2026 · project `jbdzhwenzedlwbdpguyt` · base commit `13d61f7` (deployed) + uncommitted work.

**Status: accepted locally, not released.** All 15 audit findings and every follow-up finding from the independent reviews are closed in the local implementation and independently re-verified. Payment changes are **frozen** at the reviewed state (R6 accepted). Production is unchanged: nothing has been committed, pushed, migrated or deployed. Release depends on the operational blockers in section 5.

Companion documents: [RUNBOOK.md](RUNBOOK.md) (step-by-step execution and fix-forward), [READINESS.md](READINESS.md) (production findings, evidence detail), [production-precheck.sql](production-precheck.sql), [verify-after-migration.sql](verify-after-migration.sql).

## 1. Completed findings

### Audit findings (`audit-reports/2026-10-25-categories/report.md`)

| ID | Finding | Resolution |
|---|---|---|
| CAT-01 · P1 | Rename broke product membership | `products.category_id` is the relationship (backfilled by `add-category-integrity.sql`, kept in sync by trigger); rename is one atomic RPC (`admin_save_category`) with a cascade trigger; deleting an occupied category is refused (`category_in_use`) |
| CAT-02 · P1 | Image deleted before the category | Record committed first; then only owned, unreferenced objects are removed after a server reference check (`storage_path_reference_status`); referenced objects cannot be deleted by policy (`protect-referenced-storage-objects.sql`); failed cleanups are retried |
| CAT-03 · P1 | Add kept the previous edit target | Add / Edit / Cancel / Close reset the draft explicitly |
| CAT-04 · P2 | Parent renders discarded the draft | Module-level `CategoriesSection.jsx`; dirty drafts protected on navigation (`exitGuard.js`) |
| CAT-05 · P2 | Pending upload could overwrite another category | Uploads tied to the draft key and a sequence number; stale results discarded; save disabled while the draft's image uploads |
| CAT-06 · P2 | Repeated save duplicated requests | Synchronous pending guard + operation IDs; server-side idempotent replay and outcome resolution (`category_write_ops`, `resolve_category_write`); normalized unique index |
| CAT-07 · P2 | Image optional in form, required in DB | Required in form, client validation and DB (non-blank check) |
| CAT-08 · P2 | Name validation differed create/edit | One normalization (`normalizeCategoryName`) and validation for both; 100-char limit in UI and DB; case-insensitive uniqueness |
| CAT-09 · P2 | Order only in the current browser | `categories.sort_order` + one-call `reorder_categories`; storefront and admin read the same order |
| CAT-10 · P2 | Category actions not audited | create / update / delete / visibility / reorder logged; actor and time stamped by the database (`secure-audit-logs.sql`) |
| CAT-11 · P2 | Removed selection emptied the shop | Persisted/URL selection validated after categories load; invalid or hidden → "All" (`useProducts.js`) |
| CAT-12 · P2 | No upload type/size rules | Client rules: categories 2 MB, JPEG/PNG/WebP/SVG (SVG policy documented); bucket-level limits available in optional `restrict-product-images-bucket.sql` |
| CAT-13 · P3 | Cancelled uploads left objects | Draft uploads tracked and cleaned up through the same reference-checked path as CAT-02 |
| CAT-14 · P3 | Preview did not recover | Explicit error state, reset on URL change |
| CAT-15 · P3 | Missing accessible names | Labels with `htmlFor`, `aria-label` on Close, errors linked with `aria-describedby` |

### Follow-up findings (all closed and independently re-verified)

| Review | IDs | Topic | Evidence |
|---|---|---|---|
| Independent reviews 1–4 | R1–R7, V2-01, V2-02, V3-01, V4-01 | Server authorization, atomic rename/cascade, reorder validation, canonical storage references, resolvable save outcomes, image preservation on retry, recovered-commit baseline | `claude-review*/`, `final-verification/report.md` |
| Local staging | S1 | Internal helpers callable by non-admins → moved to unexposed `category_internal` | `security-final-verification/report.md` |
| Production pre-check | (critical) | RLS off on `admin_users`, `categories`, `products`, `audit_logs`; open image DELETE/UPDATE | `secure-*.sql`, `restrict-storage-writes-to-admins.sql`; READINESS |
| Security fix review | R5-01, R5-02, R5-03 | Unsafe rollback, audit e-mail spoofing, Click replay double deduction | `production-security-fix-review/`, READINESS |
| Payment claim review | R6-01, R6-02 | Non-atomic payment fulfillment; Payme re-binding a paid order | `payment-final-verification/report.md` |

## 2. Exact release contents

Two PRs. The release PR is based on PR A.

### PR A — rollback-compatible image (branch from `13d61f7`)

Exactly `git apply release/2026-10-categories/rollback-compat-webhooks.patch` (verified with `git apply --check` on `13d61f7`; byte-identical to the tested sources):

- `app/api/payme-webhook/route.js`
- `app/api/click-webhook/route.js`
- `src/lib/paymentIds.js` (new)
- `src/services/api.js` — `ordersAPI.create` only (B8 checkout repair; the release PR's `api.js` contains the identical change)
- `supabase-migrations/add-payment-fulfillment.sql` (new)

### Release PR — Categories

Application:
- `src/components/admin/sections/CategoriesSection.jsx` (new)
- `src/components/admin/exitGuard.js` (new)
- `src/components/admin/sections/index.js`
- `src/components/pages/DesktopAdminPanel.jsx`
- `src/components/admin/sections/ProductsSection.jsx`
- `src/context/AdminContext.jsx`
- `src/hooks/useProducts.js`
- `src/services/api.js`
- `src/services/auditLog.js`
- `src/utils/validation.js`
- `src/utils/categories.js` (new)
- `src/utils/operationId.js` (new)
- `src/utils/storageCleanup.js` (new)

Migrations:
- `supabase-migrations/secure-admin-users.sql`
- `supabase-migrations/add-category-integrity.sql`
- `supabase-migrations/protect-referenced-storage-objects.sql`
- `supabase-migrations/restrict-storage-writes-to-admins.sql`
- `supabase-migrations/secure-audit-logs.sql`
- `supabase-migrations/secure-products.sql`
- `supabase-migrations/restrict-product-images-bucket.sql` — **optional** (CAT-12 bucket limits); not part of the RUNBOOK order; apply only if agreed

Tests and docs:
- `src/tests/categories.test.jsx`, `src/tests/paymentIds.test.js`, `src/tests/ordersCreate.test.js` (B8)
- `supabase-tests/` (runner, fixtures, `category-integrity.test.sql`, `payment-fulfillment.test.sql`, `production-baseline.before.sql`)
- `package.json` (adds `test:db` only)
- `src/components/admin/CLAUDE.md`, `src/services/CLAUDE.md`
- `release/2026-10-categories/` (this report, RUNBOOK, READINESS, pre-check, verification, patch)

### Not in either PR

- `local-staging/` — local test tooling (optional to keep in the repo; never used by the app)
- `audit-reports/` — review evidence (optional)
- `.claude/launch.json` — local preview entries

## 3. Deployment order

Each step is in RUNBOOK.md with exact commands and expected results; stop at the first failure.

**Before the window (can be days earlier)**
1. Pre-check (read-only) — RUNBOOK 0.1, incl. section 13 payment readiness.
2. CI green on PR A and the release PR; service-role key present in the app container — 0.2, 0.3.
3. Verified private backup (database + Storage, restore tested) — 0.4 / 1.2–1.4.
4. Apply `add-payment-fulfillment.sql`; post-check; anon probes refused — 0.5.
5. Merge PR A → image A live; record its tag as the **rollback target**; one real payment fulfilled once — 0.6.

**Release window**
6. Admin pause; fresh verified backup — 1.
7. Migrations in order: `secure-admin-users.sql` → `add-category-integrity.sql` → `protect-referenced-storage-objects.sql` → `restrict-storage-writes-to-admins.sql` → `secure-audit-logs.sql` — 2.
8. `verify-after-migration.sql` + Data API probes; current site still works — 3.
9. Merge the release PR; deploy verified — 4.
10. `secure-products.sql`; verification all PASS — 5.
11. Admin hard reload; storefront, Kategoriyalar, Mahsulotlar, audit log and payment smoke checks; admins resume — 6.

**Rollback:** code only, back to image A. No database protection is rolled back; database problems are fixed forward (RUNBOOK 7). Image A was tested at every stage above (before P it fails closed; after P, P + 1–5 and P + 1–5 + 7: webhooks 30/30, old-admin calls 6/6).

## 4. Verification summary (local)

| Check | Result |
|---|---|
| Client suite (`npm test`) | 185/185 (120 category tests) |
| Database suite (`npm run test:db`) | all category, security, audit and payment assertions pass; 8 concurrency checks; mutation checks fail as expected |
| Real local Supabase API (`local-staging/api-checks.sh`) | 90/90 |
| Payment webhooks, real routes (`local-staging/webhook-check.sh`) | 30/30 |
| `verify-after-migration.sql` (local) | 28 PASS, 0 FAIL |
| Production build, `git diff --check` | pass |
| Independent re-runs | `final-verification`, `security-final-verification`, `payment-final-verification` reports |

Local staging reproduces production permissions from the pre-check but is not production parity.

## 5. Remaining operational blockers

| # | Blocker | Owner action |
|---|---|---|
| B1 | No verified restorable backup | Private dump (schema, roles, data) + Storage copy + tested restore |
| B2 | Admin pause | All admins save and close `/admin` before the window; confirm each |
| B3 | Release scope | Approve the two PRs exactly as in section 2 (and decide on keeping `local-staging/` / `audit-reports/`). The bucket-limits migration stays **optional** — not a blocker |
| B4 | Server configuration | ✅ resolved 2026-10-25 (read-only): key present, `service_role` for `jbdzhwenzedlwbdpguyt`; running image `sha-13d61f7` |
| B5 | Authorization | Explicit go-ahead for production migrations and deploys |
| B6 | Payment migration + image A live | Steps 3–5 completed, rollback tag recorded, one real payment fulfilled once |
| B7 | Current payment path | ✅ confirmed 2026-10-25 from **production read-only evidence**: anon reads of `orders` refused (401 42501) → deployed webhooks cannot complete any online payment; last order 2026-04-08, last completed online payment 2026-03-06. Fixed by P + image A (READINESS, section A) |
| B8 | Checkout order creation — **separate issue, outside Categories** | Problem: local reproduction only (anon `insert().select()` → 42501 with production permissions). **Repaired locally** (minimum fix, `release/2026-10-checkout-b8/PROPOSAL.md`) and shipped in image A and the release; verified locally by unit tests, API checks and browser checkout + Payme end to end at every stage. Open: production confirmation needs one authorised real checkout |

## 6. Deferred (out of scope, tracked in READINESS)

- Payments (frozen): Payme cancel after perform (state −1 instead of −2, no stock restore); manual admin approve/reject stock updates; at-most-once Telegram notifications after a lost response.
- Other tables' permissions (`users`, `orders`, `reviews`, `app_settings`, support, pickup, shipping, referrals, …); unauthenticated `app/api/test-stock-deduction`; support routes on the anon key.
- Anonymous upload limits (covered only if the optional bucket migration is applied); product admin actions not audit-logged; unmounted `CashierMode.jsx`; rate limiter trusting `X-Forwarded-For`.
- Known Categories limits (not blockers): cross-tab draft ownership and rapid multi-step Back navigation; uncertain saves rechecked at defined points; reference scans retain files when unsure (watch at larger scale).
- Next audit: Mahsulotlar (Products).
