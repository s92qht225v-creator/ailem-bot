# Services

## api.js — Main API Module

All API modules auto-transform DB snake_case ↔ app camelCase.
10-second timeout on all calls. Located in `src/services/api.js`.

### categoriesAPI
- `getAll()`, `create(data)`, `update(id, updates)`, `delete(id)`, `toggleVisibility(id, visible)`
- create/update share normalization + `validateCategory` (name ≤100, image required); errors carry `code` + `definitive` (`category_duplicate`, `category_in_use`, `category_forbidden`, `category_stale`, `migration_required`, `outcome_unknown`, …)
- `save({ opId, id?, name, image, expectedName? })` → `admin_save_category` RPC (create or update incl. atomic rename + products; `opId` recorded in the same transaction)
- `resolveWrite(opId)` → `resolve_category_write`: `'committed' | 'aborted'` (waits for an in-flight save) or `'unknown'` on any error
- `delete(id)` throws `category_not_deleted` if no row was removed
- `reorder(ids)` → `reorder_categories` RPC, must return `ids.length`; `countProducts(name)`
- `isDefinitiveError(err)` — true when the server answered (SQLSTATE / PGRST code); false for network/timeouts (outcome unknown)

### productsAPI
- `getAll(preloadedReviews?)` — accepts pre-fetched reviews to avoid duplicate DB call
- `getById(id)` — full product data including `description`, `images[]`, `a_plus_content`; called on ProductPage mount
- `create(data)`, `update(id, updates)`, `delete(id)`, `toggleVisibility(id, visible)`
- `findByBarcode(barcode)` — supports variant barcodes (POS use)
- **Storage cleanup on delete**: removes main image, `images[]`, variant images from Supabase Storage via `extractStoragePath()` — non-blocking via `Promise.allSettled`

### essentialDataAPI
- `get(lightweight=true)` — single RPC call `get_essential_data()` → products + categories + reviews
- `lightweight=true` omits heavy columns; full data via `productsAPI.getById()` on demand

### ordersAPI
- `getAll()`, `getById(id)`, `getByUser(userId)`, `create(order)`, `updateStatus(id, status)`, `delete(id)`

### reviewsAPI
- `getAll()`, `getByProduct(productId)`, `create(review)`, `approve(id)`, `delete(id)`

### usersAPI
- `getAll()`, `getByTelegramId(id)`, `create(data)`, `update(id, updates)`
- `updateBonusPoints(id, points)` — `points` is the **absolute new value** (not delta)
- `updateRole(id, role, adminEmail)` — auto-logs audit trail

### settingsAPI
- `getSettings()` / `updateSettings()` — banners JSONB, countdown timer
- `getBonusSettings()` / `updateBonusSettings()` — referral % and purchase bonus %
- `getInventorySettings()` / `updateInventorySettings()` — low stock threshold
- ⚠ `app_settings.banners` JSONB contains absolute URLs — must rewrite after Supabase project migration

### storageAPI
- `uploadProductImage(file)` → `{ url }` — uploads to `product-images` bucket
- `uploadImage()` validates type/size first (`validateImageFile`, default ≤10 MB images incl. SVG/HEIC); `uploadCategoryImage(file)` uses stricter category rules
- `referenceStatus(url)` → `storage_reference_status` RPC → `{ status: 'referenced'|'unreferenced'|'unknown', bucket, path }` by canonical object identity; any error → `unknown`
- `extractOwnedStoragePath(url)` — like `extractStoragePath` but only for this project's bucket URL
- `deleteImage(path)` — throws `storage_not_removed` when Storage removed nothing (missing object or refused by policy)
- Bucket requires RLS policies — see `fix-storage-rls.sql` if uploads return 403

### Other APIs
- `walkInCustomersAPI` — POS customer records
- `pickupPointsAPI` — delivery pickup locations
- `shippingRatesAPI` — courier pricing by region/weight
- `auditLogsAPI` — audit trail read
- `stockNotificationsAPI` — back-in-stock request management

## telegram.js

Telegram Bot API wrapper (`src/services/telegram.js`).

- `sendTelegramMessage(chatId, text, options)` — send text message
- `sendTelegramPhoto(chatId, photoUrl, caption)` — send photo with HTML caption
- `notifyAllUsersNewProduct(product, users)` — loops all users with 50ms delay between messages (Telegram rate limit ~30 msgs/sec); skips invalid chat IDs (e.g., `'demo-1'`)
- Order status notification messages:
  - `approved`: order confirmed
  - `shipped`: order shipped
  - `delivered`: order delivered
  - `rejected`: order rejected + `@ailem_yordam` support handle

⚠ **Security**: `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` is exposed in browser bundle. Should be moved to server-side only.

## payme.js

- `generatePaymeLink({ orderId, amount, description, account, returnUrl })`
- `amount` is in UZS — internally converted to tiyin (× 100)
- Parameters are Base64-encoded
- `orderId` here is the numeric `paymeOrderId` field (not the `ORD-xxx` order number)

## click.js

- `generateClickLink({ orderId, amount, description, returnUrl })`
- `amount` in UZS (not tiyin)
- Currently disabled in UI (PaymentPage.jsx lines 372–432 commented out)

## Payme Webhook (`app/api/payme-webhook/route.js`)

Next.js API Route (serverless) handling Payme payment callbacks.
On successful payment:
1. Verifies merchant credentials
2. `PerformTransaction` calls the service-role-only RPC `payme_perform_transaction` (`supabase-migrations/add-payment-fulfillment.sql`): in ONE database transaction it sets `'approved'` / state 2, deducts inventory and awards bonus points from `order.subtotal` (referral commission to referrer), once per order (`orders.fulfilled_at`). A failure changes nothing; a retry returns the stored result.
3. `CreateTransaction` binds the transaction in the RPC `payme_create_transaction`, which refuses another transaction while one is active/performed or the order is not pending
4. Sends Telegram notifications only after the commit (never part of the payment transaction)

The Click webhook uses `click_complete_payment` the same way (base = `order.total`, no referral commission — as before). Never move stock/bonus updates back into JS read-modify-write calls.

**Note**: This webhook awards bonus to the **referrer**. PaymentStatusPage deducts bonus from the **buyer** (for bonus points used at checkout). These are two separate operations.

## Support Chat (`app/api/support/`)

### message/route.js — POST
Receives `{ session_id, message, user_name, user_id }` from website.
- Generates `session_id` (uuid) if none provided
- Saves `{ session_id, sender: 'user', message }` to `support_messages` table
- Forwards to admin Telegram:
  ```
  💬 Sayt orqali xabar
  👤 Ali (ID: 123)
  🔑 Session: abc-123

  User's message here
  ```
- Returns `{ session_id, id }`

### messages/route.js — GET
`GET /api/support/messages?session_id=xxx`
Returns all messages for session ordered by `created_at`. Polled every 3s by `TelegramChatButton.jsx`.

### webhook/route.js — POST
Receives Telegram bot updates.
- Processes `message.reply_to_message` (admin replying in Telegram)
- Also processes `<uuid>\ntext` format if admin sends a new message with session ID prefix
- Extracts `session_id` via regex `/Session: ([\w-]+)/`
- Saves `{ session_id, sender: 'admin', message: reply_text }` to DB
- Always returns 200 (Telegram requires this)

**One-time webhook registration** (after deploy):
```
https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://www.ailem.uz/api/support/webhook
```

## auditLog.js

```javascript
import { logAuditAction, AUDIT_ACTIONS } from './auditLog';

// AUDIT_ACTIONS: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'notify'
await logAuditAction(
  AUDIT_ACTIONS.UPDATE,
  'product',       // entity_type
  productId,       // entity_id
  oldData,         // before state (null for creates)
  newData          // after state (null for deletes)
);
```

All admin CRUD actions must call this.

## Console Logging Style

```javascript
console.log('✅ Product created:', product);
console.error('❌ Failed:', error);
console.log('💳 Payment processing...', { orderId });
console.log('📦 Order approved:', orderId);
```

Emoji prefixes: `🔍` loading, `✅` success, `❌` error, `⚠️` warning, `🔄` refresh, `💾` save, `📥` receive, `💳` payment, `📦` order.

All `console.*` stripped from production via `next.config.mjs` `compiler.removeConsole`.
