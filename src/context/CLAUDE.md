# React Contexts

7 contexts providing global state. All wrapped in `App.jsx`.

## AdminContext

Central data store. **Two-phase loading**:
- **Phase 1** (essential): products + categories + reviews → `loading = false` → customers can browse
- **Phase 2** (deferred): orders + users → loads silently ~1s later → `adminLoading = false`
- Uses single RPC `get_essential_data(lightweight=true)` for phase 1 (1 DB call for 3 tables)
- `lightweight=true` omits `description`, `images`, `a_plus_content` — full data fetched on-demand via `productsAPI.getById()`
- Cleanup: `cancelled` flag in useEffect prevents state updates after unmount
- Context value wrapped in `useMemo` — dependencies: `[products, categories, orders, reviews, users, loading, error]`

Key methods:
- `addOrder(order)` — create order
- `updateOrderStatus(id, status)` — update with inventory + bonus + notification side effects
- `updateUserBonusPoints(userId, delta)` — delta is positive (add) or negative (deduct)
- `refreshUsers()` — reload users from DB
- Category reordering: persisted to localStorage

## UserContext

User profile, favorites, bonus points.

- Auto-login from Telegram `window.Telegram.WebApp.initDataUnsafe.user`
- `updateBonusPoints(delta)` — delta is positive/negative value, updates DB + local state
- Favorites stored as `TEXT[]` in DB, cached in localStorage
- localStorage caching for user profile (Telegram Desktop fallback)

## CartContext

Shopping cart with variant support.

- Cart items: `{ id, name, price, quantity, selectedColor, selectedSize, image, volume_pricing, weight }`
- Persistent in localStorage, synced to Supabase (debounced 500ms)
- **Volume pricing in cart**: always resolves **live** from AdminContext products — not stale cart snapshot
- `clearCart()` — called from PaymentStatusPage only after order `'approved'`

## ToastContext

```javascript
import { useToast } from './ToastContext';
const toast = useToast();
toast.success('Saved!');
toast.error('Failed');
toast.warning('Low stock');
toast.info('Coming soon');
```

Auto-dismiss, queue management.

## ConfirmContext

Promise-based confirmation dialogs.

```javascript
import { useConfirm } from './ConfirmContext';
const confirm = useConfirm();
const ok = await confirm({
  title: 'Delete?',
  message: 'Cannot be undone.',
  type: 'danger',        // optional — red styling
  confirmText: 'Delete',
  cancelText: 'Cancel'
});
if (ok) { /* proceed */ }
```

## PickupPointsContext

Delivery pickup locations and couriers. CRUD operations, filter by `is_active`.

## ShippingRatesContext

Shipping cost by courier + region + weight.

```javascript
const rate = await getRate(courier, region, weight);  // returns price or null
```

## Custom Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useProducts` | Filtering, sorting, search, featured products (module-level cache) |
| `useCart` | Add/remove/update cart items |
| `useOrders` | User order history, filter by status |
| `useAdminMode` | Admin permission checks, role validation |
| `useBackButton` | Telegram back button |
| `useMainButton` | Telegram main button (payment/checkout) |

### useProducts — Featured Products Cache
Module-level variables (not `useRef`) persist across all hook instances and re-mounts.
`useRef` creates new ref on each component mount — causes flicker when navigating back to homepage.
Only locks permanently after orders data arrives (allows one fallback → real data transition).
