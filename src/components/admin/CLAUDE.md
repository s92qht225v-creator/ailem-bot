# Admin Panel

Desktop-only interface. URL: `https://www.ailem.uz?admin=true`

## Authentication
- Supabase Auth (`supabase.auth.signInWithPassword()`) + `admin_users` table check (two-factor gate)
- Session via Supabase JWT tokens
- Admin users created via Supabase Admin API (not self-service)
- Migration: `supabase-migrations/add-admin-auth.sql`
- File: `src/components/AdminAuth.jsx`

## 12 Sections (`sections/`)

### DashboardSection
Quick stats: revenue, pending orders, recent activity.

### ProductsSection
Full CRUD for products with:
- **Variants**: color + size with independent stock/price/image/sku/barcode/weight/volume_pricing
- **Volume Pricing**:
  - Products WITHOUT variants: product-level editor
  - Products WITH variants: collapsible "💰 Hajm narxi" per variant card; product-level editor hidden
  - On save: product-level `volume_pricing` auto-cleared when variants exist
- **Per-Variant Weight**: weight input per variant card
- **A+ Content**: 9 module types via APlusEditor
- **Visibility toggle**: Eye/EyeOff — green=visible, gray=hidden
  - Button order: Visibility | Edit | Duplicate | Delete
  - Toast: "Mahsulot ko'rsatildi" / "Mahsulot yashirildi"
- **New Product Notification** (Telegram):
  - Small purple Send icon: **test mode** — sends to admin only (chat ID from localStorage `admin_telegram_chat_id`, default `8370090674`)
  - Regular purple Send icon: **full mode** — sends to all users with confirmation showing count
  - `sendTelegramPhoto()` + `notifyAllUsersNewProduct()` in `telegram.js`
  - 50ms delay per message (Telegram rate limit ~30 msgs/sec)
- **Storage cleanup on delete**: removes images from Supabase Storage (non-blocking via `Promise.allSettled`)
- CSV export, barcode support

### OrdersSection
- Status flow: `pending → approved → shipped → delivered → rejected`
- **Inventory**: auto-deduct on approval, restore on rejection
- **Bonus points on approval**: awarded as percentage of `order.subtotal` (not `order.total`)
- **Bonus on rejection**: only deducted if `order.status === 'approved'` (wasApproved guard)
- Bulk operations with progress tracking
- Shipping label + packing slip printing (single/batch)
- Telegram notifications on status changes (rejection includes `@ailem_yordam`)
- CSV export

### ReviewsSection
Approve/delete reviews, filter by status, CSV export.

### UsersSection
- User search, role management (`customer` / `cashier`)
- **Inline bonus points editor**: click bonus points number → input + green Plus + red Minus buttons
  - Validation: positive amount, deduction cannot exceed current balance
  - Uses `updateUserBonusPoints(userId, delta)` from AdminContext
  - Toast shows: `"${user.name}: +/-${amount} ball"`
- Audit logging for role changes

### WalkInCustomersSection
POS customer records, search, SMS campaign export.

### AnalyticsSection
Revenue metrics, 7-day chart, order breakdown, month-over-month growth.

### StockRequestsSection
Back-in-stock requests, notify users via Telegram.

### BonusSettingsSection
Configure referral commission % and purchase bonus % (stored in `settings` table).

### InventorySettingsSection
Low stock threshold, inventory alerts.

### AuditLogsSection
Complete action trail with filtering, pagination (25 items/page).

### SettingsSection
Placeholder (coming soon).

## Inline Sections in DesktopAdminPanel

- **Categories**: CRUD, reorder, visibility toggle (Eye/EyeOff), image upload
  - Hidden categories shown with "Yashirilgan" badge
  - Storage cleanup on delete
- **Promotions**: Banner management, countdown timer config
- **Pickup Points**: Delivery locations, courier management
- **Shipping Rates**: Courier pricing by region and weight

## Shared Components (`shared/`)

### APlusEditor
9 module types: `hero`, `image_text`, `features`, `gallery`, `image_sequence`, `video`, `text`, `comparison`, `accordion`
Stored as JSONB in `products.a_plus_content`. Image recommendations: 1000-1200px, <500KB.

### ErrorBoundary
Wraps admin sections to prevent full panel crash on section error.

## Audit Logging

```javascript
import { logAuditAction, AUDIT_ACTIONS } from '../../../services/auditLog';

await logAuditAction(AUDIT_ACTIONS.UPDATE, 'user', userId, { role: oldRole }, { role: newRole });
```

All admin actions (create/update/delete/approve/reject) must be logged.

## Admin vs Customer Visibility Pattern

```javascript
// Admin: show ALL (including hidden)
products  // no filter

// Customer: show only visible
products.filter(p => p.visible !== false)  // handles undefined/null gracefully
```
