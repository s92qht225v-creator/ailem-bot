# Customer-Facing Pages

17 pages in `src/components/pages/`. All receive `onNavigate` prop (bridged to Next.js router via `useAppNavigate.js`).
Page wrapper pattern: `className="pb-20 pt-16 bg-gray-50 min-h-screen"`.
All UI strings in Uzbek (Cyrillic).

## Shopping

### HomePage
- Hero banners (Carousel), countdown timer, category grid, featured products
- Background: `#f5f5f5`, cards: `rounded-2xl shadow-md`
- Banners: no text overlay (text baked into images)
- Featured products: module-level cache in `useProducts.js` (not `useRef` — persists across re-mounts)

### ShopPage
- Full catalog: search (300ms debounce), cascading filters (category → material → color → size), sorting
- Product grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (single column mobile)
- Smart cascade: materials filtered by category, colors by category+material, sizes by all three
- Filter options only show values with matching visible products
- Filter dropdown uses React Portal (`CustomDropdown.jsx`) to escape `overflow-x-auto` parent
- Focus ring fix: `pt-1 px-1 -ml-1` on overflow container

### ProductPage
- Lightweight data shown instantly from cache; full data (description/images/a_plus_content) fetched on-demand via `productsAPI.getById()`
- Main image: CSS `background-image` div (not `<img>`) — prevents Telegram long-press
- Thumbnails: also `background-image`
- Reviews, related products, A+ content below fold

### CartPage
- Cross-references cart items against live product visibility from AdminContext
- Hidden products excluded from display and total
- Volume pricing resolves **live** from AdminContext (not stale cart snapshot)
- Bonus points: apply up to 20% of order total

### FavoritesPage
- Products WITH variants → navigate to ProductPage (user selects variant before adding)
- Products WITHOUT variants → add directly to cart
- Hidden products filtered out

## Checkout Flow

### CheckoutPage
Delivery types (stored as `deliveryInfo.type`):

| Type | Value | Fee | Notes |
|------|-------|-----|-------|
| Self-pickup | `'self_pickup'` | 0 | Static store card shown |
| Yandex | `'home_delivery'` | calculated | Tashkent only, 11 districts |
| BTS | `'bts_delivery'` | 0 | Postpaid — paid on pickup, manual address textarea |
| Other couriers | `'pickup'` | calculated | Cascading state → city → pickup point |

Self-pickup address (`SELF_PICKUP_ADDRESS` constant):
- AILEM Do'koni, Yunusobod-19, 44 dom, Toshkent
- Hours: 09:00–18:00, Phone: +998 99 221 11 12

Self-pickup and BTS are special-cased — no cascading dropdowns, no shipping rate lookup.

Per-variant weight: `handleAddToCart` overrides `product.weight` with variant's weight.

### PaymentPage
- Creates order with status `'pending'`
- Stores `pendingPayment` in localStorage: `{ orderId, paymentMethod, timestamp }`
- Opens Payme via `window.Telegram.WebApp.openLink()` or `window.open()`
- **Does NOT deduct bonus points or clear cart** — both happen in PaymentStatusPage
- Click payment: disabled (lines 372–432 commented out)

### PaymentStatusPage
- Polls order status every 3s, up to 6 attempts (18s total)
- On `'approved'`: `clearCart()` + `updateBonusPoints(-bonusPointsUsed)` + redirect to OrderDetails
- On `'rejected'`/timeout: failure UI shown, cart intact
- Auto-redirects to OrderDetailsPage after 4s on success

**Critical rule**: Never deduct user resources (cart, bonus) before payment is confirmed.

## Account Management

### ProfilePage
- Bonus card: red gradient (`from-accent to-red-600`), shows `user.bonusPoints`
- Menu: Orders, Reviews (removed: Addresses, Settings, Help — stubs deleted)

### OrderHistoryPage / OrderDetailsPage
- Status flow: `pending → approved → shipped → delivered`
- Telegram notification sent on each status change

### MyReviewsPage
- Two tabs: pending reviews (delivered orders without reviews) + approved reviews
- All strings in Uzbek

### WriteReviewPage
- Star rating 1–5 (labels: Yomon/Qoniqarli/Yaxshi/Juda yaxshi/Ajoyib)
- Comment (min 10 chars), up to 5 images (uploaded to Supabase Storage)
- Image upload: `storageAPI.uploadProductImage()` → permanent URLs stored, object URLs for preview

### ReferralsPage
- Shows `user.referrals` count and referral link
- Commission rate loaded from `localStorage('bonusConfig')`
- All strings in Uzbek

### LoginPage
- Telegram Login Widget (external script)
- Calls `POST /api/auth/telegram-login` on success

## Common Patterns

```javascript
// Navigation
const MyPage = ({ onNavigate }) => {
  return (
    <div className="pb-20 pt-16 bg-gray-50 min-h-screen">
      <button onClick={() => onNavigate('shop')}>...</button>
      <button onClick={() => onNavigate('product', { id: '123' })}>...</button>
    </div>
  );
};
```

```javascript
// Translation (all UI must be Uzbek)
import { t } from '../../utils/translation-fallback';
<h1>{t('page.title')}</h1>
<p>{t('shop.productsFound', { count: n })}</p>
```

```javascript
// Toast (no alert() anywhere — use toast)
import { useToast } from '../../context/ToastContext';
const toast = useToast();
toast.warning('Iltimos, to\'ldiring');
```

## Lazy Loading
All pages except HomePage, ShopPage, CartPage are lazy-loaded in `App.jsx` via `lazyWithRetry()`.
`lazyWithRetry()` auto-reloads once on chunk load failure using `sessionStorage('chunk_reload')` flag.
