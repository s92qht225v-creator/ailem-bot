# Services

## api.js — Main API Module

All API modules auto-transform DB snake_case ↔ app camelCase.
10-second timeout on all calls.

### categoriesAPI
- `getAll()`, `create()`, `update(id, updates)`, `delete(id)`, `toggleVisibility(id, visible)`

### productsAPI
- `getAll(preloadedReviews?)` — accepts pre-fetched reviews to avoid duplicate fetch
- `getById(id)` — full product data (description, images, a_plus_content) — called on ProductPage
- `create()`, `update(id, updates)`, `delete(id)`, `toggleVisibility(id, visible)`
- `findByBarcode(barcode)` — supports variant barcodes for POS
- **Storage cleanup**: `delete()` removes images from Supabase Storage via `extractStoragePath()` helper
  - Cleans main image, additional images[], variant images — non-blocking via `Promise.allSettled`

### essentialDataAPI
- `get(lightweight=true)` — single RPC call `get_essential_data()` → products + categories + reviews
- `lightweight=true` omits heavy columns for browsing; full data via `productsAPI.getById()`

### ordersAPI
- `getAll()`, `getById(id)`, `getByUser(userId)`, `create(order)`, `updateStatus(id, status)`, `delete(id)`

### reviewsAPI
- `getAll()`, `getByProduct(productId)`, `create(review)`, `approve(id)`, `delete(id)`

### usersAPI
- `getAll()`, `getByTelegramId(id)`, `create()`, `update(id, updates)`
- `updateBonusPoints(id, points)` — points is absolute new value (not delta)
- `updateRole(id, role, adminEmail)` — logs audit trail automatically

### settingsAPI
- `getSettings()` / `updateSettings()` — banners, timers, bonus config
- `getBonusSettings()` / `updateBonusSettings()` — referral % and purchase %
- `getInventorySettings()` / `updateInventorySettings()` — low stock threshold
- **Note**: `app_settings.banners` is JSONB — image URLs must be rewritten separately during Supabase migrations

### storageAPI
- `uploadProductImage(file)` — upload to `product-images` bucket
- `deleteFile(path)` — delete from storage
- Bucket: `product-images` — requires RLS policies (see `fix-storage-rls.sql`)

### walkInCustomersAPI, pickupPointsAPI, shippingRatesAPI, auditLogsAPI, stockNotificationsAPI
Standard CRUD — see root CLAUDE.md for method list.

## telegram.js

Telegram Bot API wrapper.

- `sendTelegramNotification(chatId, message)` — send text message
- `sendTelegramPhoto(chatId, photoUrl, caption)` — send photo with HTML caption
  - Used for new product notifications from admin
- `notifyAllUsersNewProduct(product, users)` — loops all users, 50ms delay (rate limit ~30 msgs/sec)
  - Skips invalid chat IDs (e.g., `'demo-1'`, non-numeric)
- Order status notification messages:
  - `approved`: order confirmed
  - `shipped`: order shipped
  - `delivered`: order delivered
  - `rejected`: order rejected + `@ailem_yordam` support handle

**Security note**: `VITE_TELEGRAM_BOT_TOKEN` is exposed in frontend bundle. Should move to backend.

## payme.js

- `generatePaymeLink({ orderId, amount, description, account, returnUrl })`
- Amount: UZS × 100 = tiyin
- Parameters Base64-encoded
- `orderId` here is the numeric `paymeOrderId` (not the `ORD-xxx` order number)

## click.js

- `generateClickLink({ orderId, amount, description, returnUrl })`
- Amount in UZS (not tiyin)
- Currently disabled in UI (PaymentPage.jsx lines 372-432 commented out)

## Payme Webhook (`api/payme-webhook.js`)

Serverless function (Vercel) handling Payme callbacks.
On successful payment:
1. Updates order status to `'approved'`
2. Deducts inventory
3. Awards bonus points based on `order.subtotal` (not `order.total`)
4. Sends Telegram notification

**Note**: Bonus points awarded here (server-side) for Payme. Frontend `PaymentStatusPage` also deducts bonus for the paying user — these are separate: webhook awards to referrer, frontend deducts from buyer.

## auditLog.js

```javascript
import { logAuditAction, AUDIT_ACTIONS } from './auditLog';

await logAuditAction(
  AUDIT_ACTIONS.UPDATE,  // 'create'|'update'|'delete'|'approve'|'reject'|'notify'
  'product',             // entity_type
  productId,             // entity_id
  oldData,               // before state (null for creates)
  newData                // after state (null for deletes)
);
```

## Console Logging Style

```javascript
console.log('✅ Product created:', product);
console.error('❌ Failed to update:', error);
console.log('💳 Processing payment...', { orderId });
console.log('📦 Order approved:', orderId);
```

Emoji prefixes: `🔍` loading, `✅` success, `❌` error, `⚠️` warning, `🔄` refresh, `💾` save, `📥` receive, `💳` payment, `📦` order.

All `console.*` stripped from production builds via `vite.config.js` esbuild drop.
