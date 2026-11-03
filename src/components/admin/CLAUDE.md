# Admin Panel

Desktop-only interface. URL: `https://www.ailem.uz?admin=true` (redirected to `/admin` by `middleware.js`).
All admin UI strings in Uzbek (Cyrillic).

## Authentication

- Supabase Auth (`supabase.auth.signInWithPassword()`) + `admin_users` table check (two-factor gate)
- Session via Supabase JWT tokens
- Admin users created via Supabase Admin API (not self-service)
- Migration: `supabase-migrations/add-admin-auth.sql`
- File: `src/components/AdminAuth.jsx`

## 14 Sections (`src/components/admin/sections/`)

### DashboardSection
Quick stats: total revenue, pending orders, total users, recent activity.

### ProductsSection
Full CRUD with:
- **Variants**: color + size combinations; each variant has independent `stock`, `price`, `image`, `sku`, `barcode`, `weight`, `volume_pricing`
- **Volume Pricing**:
  - Products WITHOUT variants: product-level `volume_pricing` editor
  - Products WITH variants: collapsible "💰 Hajm narxi" per variant card; product-level editor hidden
  - On save: product-level `volume_pricing` auto-cleared when variants exist
- **Per-Variant Weight**: weight input per variant card
- **A+ Content**: 9 module types via `APlusEditor`
- **Visibility toggle**: Eye/EyeOff — green = visible, gray = hidden
  - Button order: Visibility | Edit | Duplicate | Delete
  - Toast: `"Mahsulot ko'rsatildi"` / `"Mahsulot yashirildi"`
- **New Product Notification** (Telegram):
  - Small Send icon: **test mode** — sends to admin only (chat ID from localStorage `admin_telegram_chat_id`, default `8370090674`)
  - Regular Send icon: **full mode** — sends to all users with confirmation showing count
  - Uses `sendTelegramPhoto()` + `notifyAllUsersNewProduct()` from `telegram.js`
  - 50ms delay per message (Telegram rate limit ~30 msgs/sec)
- **Storage cleanup on delete**: removes all images from Supabase Storage (non-blocking, `Promise.allSettled`)
- CSV export, barcode support

### OrdersSection
- Status flow: `pending → approved → shipped → delivered` (or `rejected`)
- **Inventory**: auto-deduct stock on approval, restore on rejection
- **Bonus points on approval**: award `order.subtotal × bonusRate%` (use subtotal, not total)
- **Bonus on rejection**: only deduct if `order.status === 'approved'` (wasApproved guard)
- Bulk operations with progress tracking
- Shipping label + packing slip printing (single/batch)
- Telegram notifications on status changes (rejection includes `@ailem_yordam`)
- CSV export

### ReviewsSection
Approve/delete reviews, filter by status (pending/approved), CSV export.

### UsersSection
- Search by name/phone/ID
- Role management: `customer` / `cashier`
- **Inline bonus points editor**: click the bonus points number → shows input + green Plus + red Minus buttons
  - Validation: positive amount; deduction cannot exceed current balance
  - Uses `updateUserBonusPoints(userId, delta)` from AdminContext
  - Toast: `"${user.name}: +${amount} ball"` / `"${user.name}: -${amount} ball"`
- Audit logging for role changes

### WalkInCustomersSection
POS customer records (cash/walk-in sales). Search, SMS campaign export.

### AnalyticsSection
Revenue metrics, 7-day chart, order breakdown by status, month-over-month growth.

### StockRequestsSection
Back-in-stock requests — notify waiting users via Telegram.

### BonusSettingsSection
Configure referral commission % and purchase bonus % (stored in `settings` table as `bonus_config`).

### InventorySettingsSection
Low stock threshold — products below this show warning in ProductsSection.

### AuditLogsSection
Complete action trail: who did what, when, old/new data. Filterable, paginated (25 items/page).

### SupportSection
Two-way support chat admin panel. Lists all user sessions (left sidebar), shows conversation thread (right), admin can reply.
- Polls sessions every 5s, active chat polls every 5s
- Unread indicator: red dot on sessions with last message from user
- Admin replies via `POST /api/support/admin-reply` (saves `sender: 'admin'` directly to DB)
- Sessions listed by recency; sessions with pending user messages shown with blue accent
- One-time webhook setup: `https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://www.ailem.uz/api/support/webhook`

### SettingsSection
Placeholder (not yet implemented).

### CategoriesSection
Module-level component (was nested in DesktopAdminPanel, which remounted it and lost drafts).
- **One explicit draft**: Add always starts empty; Edit loads that category; Cancel/Close discard directly (explicit decision). Switching drafts with unsaved changes asks first.
- **Leaving** — one rule (`askToLeave`) for every exit: save in flight → refused; dirty draft or running upload → confirm; else leave. In-app (sidebar, dashboard shortcuts, logout) via `useAdminExitGuard`; browser via `useBrowserExitGuard` (`src/components/admin/exitGuard.js`): `beforeunload` for reload/close and a same-URL history sentinel for Back (cancel re-arms it; verified against the Next 14 App Router in Chromium).
- **Unmount** invalidates pending uploads and cleans up unsaved draft uploads (held images are skipped).
- **Saves carry an operation id** (`newOperationId`, `src/utils/operationId.js`) → `admin_save_category` records it in the same transaction. Before sending, the section **holds** every involved image (`holdImagesForWrite`, localStorage `categoryWriteHolds`); cleanup skips held URLs. Definitive outcome → `releaseWriteHold` (+ reference-checked cleanup). Lost response → `resolve_category_write` (waits for the in-flight transaction): committed = success, aborted = `category_not_saved`, unknown = hold kept, resolved again whenever the section opens.
- **Draft ownership ≠ operation holds** (V3-01): images the open form uses are registered in memory (`setDraftImages`) and cleanup skips them (`in_draft`), so a background resolution (e.g. *aborted*) never deletes an image the form still shows. The form is notified (inline `role="status"` notice): *aborted* → nothing saved, image kept, retry is safe; *committed* → after the refresh (and only if the same draft is still open) closes if unchanged, otherwise the committed record becomes the draft's saved baseline (`draft.original`) with the admin's later edits kept, so dirty checks, exit guards and the next save compare against what is really stored (V4-01); an Add draft becomes an Edit of the created category. The draft cleans its own uploads on Cancel/Close, image replacement and unmount (ownership released first).
- **Saving**: synchronous `savingRef` guard + disabled button. Name normalized, ≤100 chars, unique case-insensitively. **Image required**.
- **Uploads**: `storageAPI.uploadCategoryImage()` — PNG/JPG/WEBP/SVG ≤2 MB. Each upload is tied to draft key + sequence number; stale results are deleted.
- **Create/edit** go through `categoriesAPI.save` → `admin_save_category` RPC (one transaction, admin-only, expected-name check; a rename moves products via trigger). No client-side compensation: unresolvable outcomes or stale data trigger `refreshCatalog()`; errors carry `code`/`definitive`.
- **Delete** blocked while products remain (UI count + DB trigger).
- **Order**: `categories.sort_order` + `reorder_categories` RPC (full list, verified row count); failure reverts, is never audit-logged.
- **Storage cleanup** (`src/utils/storageCleanup.js`): only after the DB write, only owned URLs, only on a definitive `unreferenced` from `storage_reference_status` for the same canonical object (bucket + decoded path). `unknown` keeps the file and the retry entry.
- All successful mutations audit-logged (`category.create|update|delete|visibility|reorder`).
- **Unresolved saves** count as unsaved work (exit guards stay on); submitting again settles them first, else sends full values. Commits recovered in the background are audit-logged with `metadata.recoveredAfterUnknownOutcome`. Replays of a committed op are idempotent on the server; stale errors are `PT409` (never 40001 — PostgREST retries it).
- **Local staging**: `local-staging/README.md` (isolated app + local Supabase, fault-injection proxy for interrupted saves).
- **Requires** `supabase-migrations/add-category-integrity.sql` + recommended `protect-referenced-storage-objects.sql` (prerequisites, rollout and old-tab transition in the header). DB tests incl. a two-connection concurrency test: `npm run test:db`.

## Inline Sections (DesktopAdminPanel)

- **Promotions**: Banner management (up to 5), countdown timer config
- **Pickup Points**: Delivery locations, courier/state/city hierarchy
- **Shipping Rates**: Courier pricing by region and weight tiers

## Shared Components (`admin/shared/`)

### APlusEditor
9 module types for product rich content:
`hero`, `image_text`, `features`, `gallery`, `image_sequence`, `video`, `text`, `comparison`, `accordion`
Stored as JSONB in `products.a_plus_content`. Image recommendations: 1000–1200px wide, <500 KB.

### ErrorBoundary
Wraps admin sections — prevents full panel crash on section error. Shows friendly error + retry button.

### StatCard
Dashboard stat display component: `{ title, value, icon, color, trend }`.

## Audit Logging

All admin CRUD actions **must** be logged:

```javascript
import { logAuditAction, AUDIT_ACTIONS } from '../../../services/auditLog';

// AUDIT_ACTIONS: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'notify'
await logAuditAction(AUDIT_ACTIONS.UPDATE, 'user', userId, { role: oldRole }, { role: newRole });
await logAuditAction(AUDIT_ACTIONS.DELETE, 'product', productId, productData, null);
await logAuditAction(AUDIT_ACTIONS.CREATE, 'category', newId, null, categoryData);
```

## Admin vs Customer Visibility

```javascript
// Admin: show ALL (including hidden)
products  // no filter

// Customer: show only visible (handles undefined gracefully)
products.filter(p => p.visible !== false)
```

## CashierMode (POS)

File: `src/components/cashier/CashierMode.jsx`

- Barcode scanning via `html5-qrcode`
- Variant selection for walk-in sales
- Resolves live variant weight + volume pricing from AdminContext
- Creates `walk_in_customers` records for POS sales
