# React Contexts

7 contexts providing global state. All wrapped in `src/components/Providers.jsx`, mounted in `app/layout.jsx`.

## Provider Order (Providers.jsx)

```
ErrorBoundary
  ToastProvider
    ConfirmProvider
      UserProvider
        AdminProvider
          PickupPointsProvider
            ShippingRatesProvider
              CartProvider
                {children}
                <GlobalEffects />
```

## AdminContext

Central data store. **Two-phase loading**:
- **Phase 1** (essential): products + categories + reviews → `loading = false` → customers can browse
- **Phase 2** (deferred): orders + users → loads silently ~1s later → `adminLoading = false`
- Uses single RPC `get_essential_data(lightweight=true)` for Phase 1 (1 DB call, 3 tables)
- `lightweight=true` omits `description`, `images`, `a_plus_content` — fetched on-demand via `productsAPI.getById()`
- Context value wrapped in `useMemo` to prevent unnecessary re-renders

Key methods:
- `addOrder(order)` — create order (used by CheckoutPage)
- `updateOrderStatus(id, status)` — triggers inventory + bonus + Telegram notification side effects
- `updateUserBonusPoints(userId, delta)` — delta is positive (add) or negative (deduct)
- `refreshUsers()` — reload users from DB
- Category reordering: persisted to localStorage

## UserContext

User profile, favorites, bonus points.

- Auto-login from Telegram `window.Telegram.WebApp.initDataUnsafe.user` on app mount
- `user.isGuest = true` when not logged in (no Telegram session)
- `updateBonusPoints(delta)` — positive/negative, updates DB + local state atomically
- `setReferredBy(referralCode)` — link user to referrer
- Favorites stored as `TEXT[]` in DB, cached in localStorage
- Profile cached in localStorage (Telegram Desktop fallback)

## CartContext

Shopping cart with variant support.

- Cart item shape: `{ id, name, price, quantity, selectedColor, selectedSize, image, volume_pricing, weight }`
- Persistent in localStorage, synced to Supabase (debounced 500ms)
- **Volume pricing in cart**: always resolves **live** from AdminContext products — never use stale cart snapshot
- `clearCart()` — called from PaymentStatusPage **only** after order status = `'approved'`

## ToastContext

```javascript
import { useToast } from './ToastContext';
const toast = useToast();
toast.success('Saqlandi!');      // green, 4s
toast.error('Xatolik!');         // red, 6s
toast.warning('Diqqat!');        // yellow, 5s
toast.info('Ma\'lumot');         // blue, 4s
```

Auto-dismiss, slide-in animation, X close button. Use instead of `alert()` everywhere.

## ConfirmContext

Promise-based confirmation dialogs.

```javascript
import { useConfirm } from './ConfirmContext';
const confirm = useConfirm();
const ok = await confirm({
  title: "O'chirish?",
  message: "Bu amalni ortga qaytarib bo'lmaydi.",
  type: 'danger',            // 'danger'|'warning'|'success'|'info'
  confirmText: "O'chirish",
  cancelText: 'Bekor qilish'
});
if (ok) { /* proceed */ }
```

## PickupPointsContext

Delivery pickup locations and couriers.
- CRUD: `addPickupPoint()`, `updatePickupPoint()`, `deletePickupPoint()`, `togglePickupPointStatus()`, `duplicatePickupPoint()`
- Cascading filter: courier → state → city → points
- Filters inactive points for customer views (`filter(p => p.isActive !== false)`)

## ShippingRatesContext

Shipping cost by courier + region + weight.

```javascript
const rate = await getRate(courier, region, weight);  // returns price in UZS or null
```

## Custom Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useProducts` | Filtering, sorting, search, featured products (module-level cache) |
| `useCart` | Add/remove/update cart items |
| `useOrders` | User order history, filter by status |
| `useAdminMode` | Admin permission checks |
| `useAppNavigate` | `onNavigate(page, data)` → Next.js `router.push(url)` bridge |
| `useBackButton` | No-op (Telegram back button not used in Next.js) |
| `useMainButton` | No-op (Telegram main button replaced by in-page buttons) |

### useProducts — Featured Products Cache

Module-level variables (not `useRef`) persist across all hook instances and re-mounts.
`useRef` creates new ref per component mount — causes flicker when navigating back to homepage.
Only locks permanently after orders data arrives (allows one fallback → real data transition).

```javascript
// Module-level (outside component)
let featuredProductsCache = null;
let featuredProductsCacheLocked = false;
```
