# Category release — production readiness report

Updated 2026-10-25 after the production SQL pre-check and the follow-up reviews (R5-01..03, `audit-reports/2026-10-25-categories/production-security-fix-review/`; R6-01/02, `…/payment-claim-review/`) (pre-check: `audit-reports/2026-10-25-categories/production-precheck-review/`, run read-only in the Supabase Dashboard SQL Editor). Project `jbdzhwenzedlwbdpguyt` (ailem-production). Code base: working tree on `13d61f7` (deployed commit) + uncommitted work. Nothing in production has been changed.

**Verdict: NOT READY.** The security fixes below are implemented and tested locally against a production-equivalent permission baseline, but release still requires verified private backups, an admin pause, a decision on release scope, and authorised execution of the runbook.

## Critical production finding (pre-check 2026-10-25)

| Table / bucket | Production state | Consequence |
|---|---|---|
| `public.admin_users` | **RLS disabled**; anon + authenticated hold SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES; its two policies are inert | Anyone can add themselves as admin; `is_admin()` trusts this table → every admin check (incl. the new category/storage guards) is bypassable |
| `public.categories`, `public.products` | RLS disabled; full DML + TRUNCATE grants to anon/authenticated; "Allow all operations" policies | Anyone can change or delete categories, prices, stock, products |
| `public.audit_logs` | RLS disabled; full grants; no policies | Anyone can read, forge, edit or delete the admin audit trail |
| `storage.objects` / `product-images` | RLS on, but permissive `{public}` DELETE **and UPDATE** policies + grants | Anyone can delete any image (in use or not) **and overwrite images** (upsert) |

Reproduced locally on that exact baseline (synthetic accounts): a signed-in non-admin inserted its own `admin_users` row through the REST API (HTTP 201) and `is_admin()` became true; anon changed a price, forged an audit entry, overwrote an in-use image and deleted an unused one (`local-staging/results/api-baseline.json`, `supabase-tests/production-baseline.before.sql`).

## Fixes (local, not applied to production)

| Migration / change | Effect | Callers preserved |
|---|---|---|
| `add-payment-fulfillment.sql` (**P: before image A**, R6) | Payment state change + stock + bonus in ONE transaction under the order lock (`payme_create_transaction`, `payme_perform_transaction`, `click_complete_payment`); order-level marker `orders.fulfilled_at/fulfilled_by`; Payme binding decided inside CreateTransaction (no new transaction while one is active/performed or the order is not pending); in-place increments under row locks (products in id order); unique transaction ids. Functions SECURITY INVOKER, EXECUTE for service_role only; helpers in unexposed `payment_internal` | Deployed 13d61f7 unaffected (ignores them); image A and release webhooks require them |
| `secure-admin-users.sql` (**first of the window**) | RLS on; only own-row SELECT for authenticated; anon nothing; INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES revoked; refuses to run without a real admin; fails if a SECURITY DEFINER function writes `admin_users` | Admin login (`AdminAuth.jsx` reads own row); provisioning via service role / Dashboard |
| `add-category-integrity.sql` | (unchanged scope) categories admin-only, atomic saves, ordering, reference status | — |
| `protect-referenced-storage-objects.sql` | referenced images cannot be deleted | — |
| `restrict-storage-writes-to-admins.sql` (**now required**) | DELETE and UPDATE/overwrite in `product-images` require `is_admin()`; refuses to run while `admin_users` is writable | Anonymous review-photo uploads (INSERT of new objects) and public reads unchanged; service role unaffected |
| `secure-audit-logs.sql` | RLS on; admins SELECT + INSERT only (append-only); a trigger stamps `created_at`, `admin_id = auth.uid()` and `admin_email` from **`auth.users`** (NULL when missing/blank) — the submitted value and the JWT `email` claim are ignored (R5-02) | Admin logging from `auditLog.js`; service-role inserts keep their own values |
| `secure-products.sql` (**after image A or the release is live**) | RLS on; public SELECT; INSERT/UPDATE/DELETE for admins; anon writes and TRUNCATE revoked | Storefront reads, admin CRUD/stock, category cascade, payment webhooks (service role) |
| `app/api/payme-webhook`, `app/api/click-webhook` | Server-only service-role client. CreateTransaction / PerformTransaction / Click complete each call one of the P functions and map its result; the JS read-modify-write `deductStock` / `awardBonusPoints` are gone. Telegram (customer, admin, low stock) is sent only after the commit. Click ids normalised (`src/lib/paymentIds.js`). Signature / Basic-auth checks unchanged | Order status, stock, bonuses (Payme: subtotal base + referral commission; Click: total base, no referral — both as before) |
| **Image A** (`rollback-compat-webhooks.patch` on `13d61f7`) | The two webhooks + `paymentIds.js` + the P migration file; deployed after P and **before** migrations 1–5; the rollback target from then on (R5-01) | Everything in `13d61f7`; tested at every migration stage (below) |

## Test evidence (local)

- **Database suite** (`npm run test:db`, disposable PG15, production-equivalent baseline): 16 baseline-exposure confirmations, then the release migrations (P + 1–5 + 7) twice, then the category/security assertions, **59 payment assertions** (`payment-fulfillment.test.sql`) and 8 concurrency checks — all pass. Includes: self-promotion refused (42501) with membership unchanged; TRUNCATE denied; service-role provisioning works; products public read / admin write / anon+non-admin refused; audit append-only with stamped actor/time; image delete/overwrite refused for anon and non-admins, admin and service role allowed, anon uploads still allowed; moving an object into the bucket refused. **Mutation check**: each of 5 weakened migrations (writes left granted, RLS left off, no UPDATE restriction, no stamping, products open) is caught by an explicit assertion; the storage migration's ordering guard additionally refuses to run while `admin_users` is writable.
- **Real local Supabase** (`local-staging/`, production permissions reproduced by `sql/40-production-permissions.sql`): 8/8 baseline exposures confirmed through the REST/Storage APIs, then **90/90** API checks after the migrations (incl. payment RPCs refused for anon / non-admin / admin with 42501, `payment_internal` not served), **30/30** webhook checks on the real routes (Telegram blocked by the outbound guard), browser: admin login, category create with upload, product hide — all work.
- **Production verification script** (`verify-after-migration.sql`): run against the insecure state it reports FAIL for self-promotion, anon membership reads and grants; after the fixes 28 PASS (incl. `payment functions`, `payment internals`, `payment binding`), 0 FAIL. Always rolled back.
- Client suite 185/185 (incl. `src/tests/paymentIds.test.js`) · production build passes.

### Follow-up review R5 (2026-10-25)

| Finding | Fix | Evidence |
|---|---|---|
| R5-01 rollback re-opened holes (disable products RLS, anon `UPDATE(stock, variants)`, drop storage policies; rollback image `sha-13d61f7` had anon webhooks) | Rollback target is now **image A** (13d61f7 + service-role webhooks), deployed before the migrations. RUNBOOK §7 is code rollback + fix-forward only; every migration header says "no rollback that weakens it" (the category/storage DROP lists are marked uninstall reference, not rollback) | Image A built from `git archive 13d61f7` + patch, run against the **fully migrated** local Supabase: webhook checks 16/16 at the time; superseded by the R6 image A (stage table below); old admin UI signed in and renamed a category, products stayed linked |
| R5-02 `COALESCE(jwt email, submitted email)` kept client data | e-mail only from `auth.users` (NULL when missing/blank) | `npm run test:db`: different claim, no claim, blank (`'  '`) and NULL auth e-mail, service role — all pass. **Mutation**: restoring the old COALESCE fails the suite. `verify-after-migration.sql` now checks id **and** e-mail (`s_admin_audit`); local run 25 PASS, 0 FAIL. `api-checks` 78/78 |
| R5-03 Click replay deducted again (5 → 4 → 3) | id normalisation + atomic claim (see table above); Payme PerformTransaction uses the same claim | `local-staging/webhook-check.sh` against the real routes, products locked: **16/16** — Payme create+perform, sequential replay, 6 concurrent performs; Click invalid signature (-1), numeric id stored canonically, numeric and string replays without side effects, other transaction -4, 6 concurrent completes → exactly one "Success", stock and bonus changed once. **Mutation**: without the claim conditions 5 checks fail |

### Follow-up review R6 (2026-10-25, payment completion)

| Finding | Fix | Evidence |
|---|---|---|
| R6-01 order marked paid in one request, stock/bonus in later ones; failures swallowed, retries never repaired them | P functions: status, stock and bonus commit together or not at all; on failure the order stays payable and the provider's retry does everything once; a lost response is answered from the stored state | DB: injected failure on the bonus update (after the stock update) → stock unchanged, order pending/state 1; retry after recovery → effects once (Payme and Click). Routes: same with temporary local triggers (both, only bonus, only stock), lost commit responses through the fault proxy for Create, Perform and Click complete. Reviewer's own `failure-check.mjs` re-run: first call errors with nothing committed, retry fulfils once (`local-staging/results/r6-reviewer-failure-check-after-fix.json`) |
| R6-02 CreateTransaction(B) overwrote performed A and reset state 1 → second fulfilment | Binding decided in `payme_create_transaction` under the order lock; `payme_perform_transaction` and `fulfill_order` also refuse non-pending / already fulfilled orders (also across Payme/Click) | DB + routes: B refused (−31051), Perform(B) −31003, A kept, effects once; 6 concurrent CreateTransaction with different ids → exactly one binds and performs; Payme bound + Click paid → Payme perform refused |
| Known race (R5 limitation): different orders overwrote each other's stock/bonus | In-place increments under row locks | DB: 8 parallel orders (4 Payme + 4 Click) → stock −16, bonus exact; routes: 6 orders at once → stock −12, bonus +18000, orders +6 |

**Regression power:** the previous image A (R5 webhooks) fails 13 of the 30 new route checks (`webhook-check-r5-image-before-fix.json`: no rollback on failure, retries do not repair, B binds and fulfils again, 6 parallel orders lose 8 of 12 stock units). DB mutations — CreateTransaction eligibility removed, `fulfilled_at`/status guards removed, EXECUTE granted to anon — each fail the suite.

**Image A at every RUNBOOK stage** (local, production permissions): before P → payment webhooks fail closed (−31008, order and stock untouched); P → 30/30 webhooks, 6/6 old-admin calls; P + 1–5 → 30/30 / 6/6 (release 30/30); P + 1–5 + 7 → 30/30 / 6/6 (release 30/30). Storefront and `/admin` 200 throughout.

**Observation about the deployed site (needs a read-only production check):** locally, after `fix-users-orders-rls.sql` (July), anon has no SELECT on `orders`, and the deployed 13d61f7 anon-key webhooks then fail every payment ("Transaction not found"), with or without P. Pre-check 13c/13d shows whether production is in that state.

## Payment path (B7 confirmed) and checkout (B8, separate issue)

### A. Production evidence — read-only, observed 2026-10-25

Collected without any write: GET requests from inside the production app container. Anon-key requests mirror exactly what the deployed webhooks send (`limit=0`, no rows returned); service-role requests read only non-personal order columns and print aggregates. No customer data or keys were printed. (The Supabase SQL tool has no permission on this project, so pre-check section 13 still has to be run in the SQL Editor.)

| Observation | Result |
|---|---|
| anon `GET orders?select=id&limit=0` (also filtered by `payme_order_id` / `click_order_id`) | **401 42501** permission denied |
| anon `GET products` | 200 |
| Orders created since 2026-03-01 | 18; **last order 2026-04-08**; none since |
| Last completed online payment | **2026-03-06** (Payme state 2) |
| Payme orders by outcome | March: 4 paid (state 2), 10 `rejected` without a transaction; April: 4 `rejected` without a transaction |
| Webhook traffic | not observable: production strips `console.*`, Caddy has no access log |
| Running app | image `sha-13d61f7`, started 2026-07-10 |

**B7 — confirmed:** the deployed webhooks look orders up with the anon key, and production refuses that read. Every Payme CheckPerformTransaction / CreateTransaction therefore answers "order not found" and no online payment can complete. P + image A move this path to the service role (verified locally).

### B. Local reproduction — NOT observed in production

On local staging with production's permissions reproduced (`sql/40-production-permissions.sql`), synthetic data:

| Request (anon) | Local result |
|---|---|
| `POST /rest/v1/orders` with `Prefer: return=representation` — what `ordersAPI.create` sends (`insert(...).select()`) | **401 42501**, no row created |
| same insert with `Prefer: return=minimal` | 201, row created (probe removed) |

**B8 — separate checkout issue (not part of Categories):** the deployed checkout and the frozen release code both call `insert(...).select()`, so on these permissions checkout fails before payment starts. This is a local reproduction plus code inspection; production was not written to, and no order since 2026-04-08 means production data can neither confirm nor rule out failing checkouts. **Repaired locally** with the minimum fix (`release/2026-10-checkout-b8/PROPOSAL.md`, section "Implementation and results"); included in image A and the release. Anonymous SELECT on `orders` stays revoked; grants and policies unchanged.

## Verified production facts (unchanged)

PostgreSQL 17.6; category migration not applied; exposed API schemas `public, graphql_public`; one admin membership linked to an auth user (signed in within 30 days); 10 categories (no duplicates/invalid names/blank images); 37 products, 0 linked by id, 1 known orphan (hidden "Nilufar Yostiq Jildi" → Bedsheets); `get_essential_data` reads categories via `row_to_json`; `product-images`: 170 objects / 93 MB, no size or MIME limits; no CLI migration history; largest public table 408 kB.

Schema drift to keep in mind: `audit_logs.id` is uuid; `products.images`/`reviews.images` are `text[]` (repo migrations say jsonb for reviews); `orders.id`/`user_id` text.

**Backups:** the Management API lists **no managed backup** and PITR is disabled. That means **no restorable backup has been verified** — it does not prove that no manual backup exists elsewhere.

## Release blockers

| # | Blocker | Needed |
|---|---|---|
| B1 | No verified restorable backup | Private database dump (schema, roles, data) **and** a copy of the Storage files, plus a tested restore into a scratch environment (RUNBOOK 1) |
| B2 | Admin pause | All admins save and close `/admin` before step 2; confirm each one |
| B3 | Release scope | Two PRs: **PR A** = `13d61f7` + `rollback-compat-webhooks.patch` only (webhooks, `paymentIds.js`, P migration file); release PR = category work + security migrations (local-staging tooling/tests/docs optional). CI must build both before merge |
| B4 | Server env | ✅ **Resolved 2026-10-25** (read-only, value not shown): `SUPABASE_SERVICE_ROLE_KEY` present in the running app container; its non-secret claims are `role=service_role`, `ref=jbdzhwenzedlwbdpguyt` (expires 2036-02-13); `NEXT_PUBLIC_SUPABASE_URL` points to the same project. Running image `sha-13d61f7` (started 2026-07-10). Re-check only if `/opt/ailem/.env` changes |
| B6 | P + image A live | Backup, then `add-payment-fulfillment.sql` applied and post-checked, then image A deployed, its tag recorded as the rollback target, and one real payment processed once (`fulfilled_by` set) without webhook errors (RUNBOOK 0.4–0.6) before migrations 1–5 |
| B7 | Current payment path | ✅ **Confirmed 2026-10-25** from production read-only evidence (section A above): deployed webhooks cannot read orders, so online payments cannot complete. Fixed by P + image A |
| B8 | Checkout order creation — **separate issue, outside Categories** | Problem shown by local reproduction only (section B). **Repaired locally** in image A and the release (`ordersAPI.create` inserts without read-back); verified locally at every RUNBOOK stage. Production confirmation needs one authorised real checkout after image A. Anonymous SELECT on `orders` stays revoked; the security risks listed in the proposal stay tracked separately |
| B5 | Authorisation | Explicit go-ahead to run the migrations and deploy |

## Tracked existing exposures (not fixed in this release)

- `users`, `orders` (and other tables: `reviews`, `app_settings`, `support_messages`, `pickup_points`, `shipping_rates`, `referrals`, `uzum_clicks`, `stock_notifications`, `walk_in_customers`) were not re-reviewed here; the July fix only revoked anon SELECT on users/orders and their writes are documented as open. Needs its own review — do **not** apply a blanket historical users/orders migration.
- `app/api/test-stock-deduction` is an unauthenticated route that reads orders with the service role and returns order details (dry run, no writes). Remove or protect it.
- Support API routes (`app/api/support/*`) use the anon key server-side; review together with `support_messages`.
- Anonymous uploads to `product-images` remain unrestricted in size/type (bucket has no limits); `restrict-product-images-bucket.sql` (10 MB, image types incl. HEIC/SVG) is available and recommended.
- Product admin actions are not audit-logged (only category and role changes are).
- `CashierMode.jsx` is unmounted; if re-enabled it must write through a server route.
- Telegram notifications are at most once: if the commit response is lost, the retry is answered from the stored state and that order's notifications are not sent.
- Payme `CancelTransaction` is unchanged: it sets state −1 and `rejected` even after a perform (Payme expects −2) and does not restore stock; a cancelled order cannot be paid again (CreateTransaction refuses non-pending orders). Review with the refund process.
- Manual admin approve/reject (`AdminContext`) still adjusts stock with client-side read-modify-write (unchanged; not part of the webhooks). The webhooks never fulfil an order an admin already approved.
- Concurrent payments whose buyer/referrer pairs cross could hit a Postgres deadlock; the loser gets an error with nothing committed and the provider retries.
- The webhooks' in-memory rate limiter keys on `X-Forwarded-For`. It is only meaningful if Caddy replaces client-supplied values (Caddy's default without `trusted_proxies`) — confirm on the server; it is not a security boundary (signatures/Basic auth are).
