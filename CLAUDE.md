# CLAUDE.md - Ailem Bot Project Guide

## Project Overview

**Ailem** is a Telegram Mini App e-commerce platform for selling home textiles (bedsheets, pillows, curtains, towels) in Uzbekistan. It features a customer-facing shopping interface with integrated admin/POS capabilities, payment processing (Payme, Click), and real-time inventory management.

- **Version**: 1.0.22
- **Primary Language**: Uzbek
- **Platform**: Telegram Mini App

## Tech Stack

- **Frontend**: React 18.3.1 with Vite 5.2.11 (vanilla JavaScript, no TypeScript)
- **Styling**: Tailwind CSS 3.4.3 with custom colors
- **Icons**: Lucide React
- **State Management**: React Context API (7 contexts)
- **Backend**: Supabase (PostgreSQL)
- **Payments**: Payme, Click
- **Platform**: Telegram Mini Apps SDK
- **Deployment**: Vercel

## Quick Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
npm run test     # Run tests with Vitest
```

## Project Structure

```
src/
├── components/
│   ├── admin/sections/   # Modular admin sections (12 files)
│   ├── admin/shared/     # Shared admin components
│   ├── cashier/          # POS/Cashier mode
│   ├── layout/           # Header, BottomNav
│   ├── pages/            # 21 page components
│   ├── product/          # ProductCard, ProductDetails, etc.
│   └── common/           # Carousel, ImageModal, etc.
├── context/              # 7 React Contexts
├── hooks/                # 6 custom hooks
├── services/             # API modules (api.js is main file)
├── utils/                # Utility functions
├── locales/              # i18n translations (Uzbek)
├── lib/                  # Supabase client
└── data/                 # Static data
```

## Key Patterns

### Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Pages | PascalCase + "Page" | `HomePage.jsx` |
| Components | PascalCase | `ProductCard.jsx` |
| Contexts | PascalCase + "Context" | `UserContext.jsx` |
| Hooks | camelCase + "use" | `useProducts.js` |
| Utilities | camelCase | `helpers.js` |
| DB fields | snake_case | `user_id`, `created_at` |
| App fields | camelCase | `userId`, `createdAt` |
| Translation keys | dot.notation | `'cart.title'` |

### Field Mapping

The API transforms between database snake_case and app camelCase:
```javascript
// Database: user_id, created_at, original_price
// App: userId, createdAt, originalPrice
```

### State Management

7 React Contexts (no Redux):
1. **UserContext** - User data, favorites, bonus points
2. **CartContext** - Shopping cart with variants
3. **AdminContext** - Products, orders, categories, reviews
4. **ToastContext** - Toast notifications
5. **ConfirmContext** - Confirmation dialogs
6. **PickupPointsContext** - Delivery locations
7. **ShippingRatesContext** - Shipping rates

### Translations (i18n)

Use the `t()` function from `translation-fallback.js`:
```javascript
import { t } from '../../utils/translation-fallback';

// Simple
<h1>{t('cart.title')}</h1>

// With parameters
<p>{t('shop.productsFound', { count: 5 })}</p>
```

All user-facing text should use translations. Add new keys to `src/utils/translation-fallback.js`.

### Safe localStorage

Always use the wrapper from `helpers.js`:
```javascript
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/helpers';
```

This handles Telegram Desktop's disabled localStorage gracefully.

## Important Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root component, page routing |
| `src/services/api.js` | Main API layer (53KB) |
| `src/utils/helpers.js` | Core utilities (formatPrice, localStorage) |
| `src/utils/translation-fallback.js` | i18n system |
| `src/utils/variants.js` | Product variant logic |
| `src/context/AdminContext.jsx` | Admin data loading |
| `src/lib/supabase.js` | Supabase client |

## Database Schema (Key Tables)

```
users: id, telegram_id, name, bonus_points, favorites, cart, role
products: id, name, price, stock, variants, volume_pricing, category_name, a_plus_content
orders: id, user_id, items, total, status, delivery_info, payment_method
reviews: id, product_id, user_id, rating, comment, approved
categories: id, name, image, visible
```

### Categories Table
- `visible` (BOOLEAN, default: true): Controls whether a category is displayed to customers
  - `true`: Category appears on homepage and shop filters
  - `false`: Category is hidden from customers but remains manageable in admin panel
  - All existing categories default to visible

## Custom Colors (Tailwind)

```javascript
primary: '#111827'  // Dark gray
accent: '#ed2224'   // Ailem Red (brand color)
success: '#10B981'  // Green
warning: '#F59E0B'  // Yellow
error: '#EF4444'    // Red
```

## Common Patterns

### Page Component
```javascript
import { useContext } from 'react';
import { t } from '../../utils/translation-fallback';
import { UserContext } from '../../context/UserContext';

const MyPage = ({ onNavigate }) => {
  const { user } = useContext(UserContext);

  return (
    <div className="pb-20 pt-16 bg-gray-50 min-h-screen">
      {/* Content */}
    </div>
  );
};

export default MyPage;
```

### API Calls
```javascript
import { productsAPI, ordersAPI } from '../services/api';

// Get all
const products = await productsAPI.getAll();

// Create
const newProduct = await productsAPI.create({ name, price, ... });

// Update
await productsAPI.update(id, { name: 'Updated' });

// Delete
await productsAPI.delete(id);
```

### Toast Notifications
```javascript
import { useToast } from '../../context/ToastContext';

const toast = useToast();
toast.success('Saved successfully');
toast.error('Something went wrong');
```

### Confirmation Dialogs
```javascript
import { useConfirm } from '../../context/ConfirmContext';

const confirm = useConfirm();
const confirmed = await confirm({
  title: 'Delete?',
  message: 'This cannot be undone',
  confirmText: 'Delete',
  cancelText: 'Cancel'
});
```

## Console Logging Style

Use emoji prefixes for clarity:
- `🔍` - Searching/loading
- `✅` - Success
- `❌` - Error
- `⚠️` - Warning
- `🔄` - Refreshing/updating
- `💾` - Saving
- `📥` - Receiving data

## Testing

```bash
npm run test           # Run all tests
npm run test:coverage  # With coverage report
```

Tests use Vitest with @testing-library/react.

## Environment Variables

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_TELEGRAM_BOT_TOKEN
VITE_PAYME_MERCHANT_ID
VITE_CLICK_MERCHANT_ID
```

## Key Features

1. **Products**: Variants (color/size), volume pricing, stock tracking, A+ Content
2. **Cart**: Persistent, variant-aware, volume discounts
3. **Orders**: Status flow (pending → approved → shipped → delivered)
4. **Payments**: Payme, Click, manual screenshot verification
5. **Bonus Points**: Earn on purchase, redeem up to 20% of order
6. **Referrals**: Unique codes, commission on referred purchases
7. **Admin**: Orders, products, reviews, analytics, settings
8. **Cashier/POS**: Walk-in customer support, quick checkout
9. **A+ Content**: Rich product descriptions with modular content blocks
10. **Category Visibility**: Show/hide categories from customer view while keeping products manageable

## A+ Content System

A+ Content allows rich, modular product descriptions displayed below the product details. Stored as JSONB in the `a_plus_content` column.

### Module Types

| Type | Label | Description |
|------|-------|-------------|
| `hero` | Banner | Full-width image with overlay text |
| `image_text` | Rasm + Matn | Image with text side-by-side |
| `features` | Xususiyatlar | Grid of feature icons with descriptions |
| `gallery` | Galereya | 2-column image grid |
| `image_sequence` | Rasmlar ketma-ketligi | Seamless vertical images (for long infographics) |
| `video` | Video | YouTube/Vimeo embed |
| `text` | Matn bloki | Rich text/HTML block |
| `comparison` | Taqqoslash jadvali | Comparison table |
| `accordion` | Akkordeon (FAQ) | Collapsible sections |

### Key Files

| File | Purpose |
|------|---------|
| `src/components/product/APlusContent.jsx` | Renders A+ modules on product page |
| `src/components/admin/shared/APlusEditor.jsx` | Admin editor for creating/editing modules |

### Data Structure

```javascript
// a_plus_content JSONB structure
{
  "modules": [
    { "type": "hero", "image": "url", "title": "...", "subtitle": "..." },
    { "type": "image_sequence", "images": ["url1", "url2", ...] },
    { "type": "video", "url": "https://youtube.com/watch?v=...", "title": "..." },
    // ... more modules
  ]
}
```

### Image Recommendations

- **Width**: 1000-1200px (scales to fit mobile)
- **Format**: JPG for photos, PNG for graphics
- **File size**: Under 500KB per image
- **Image sequence**: All images should have same width for seamless display

## Category Management

### Category Visibility Toggle

Admins can show/hide categories from customer-facing views without deleting them.

**API Method**:
```javascript
import { categoriesAPI } from '../services/api';

// Toggle visibility
await categoriesAPI.toggleVisibility(categoryId, true);  // Show
await categoriesAPI.toggleVisibility(categoryId, false); // Hide
```

**Context Method**:
```javascript
import { AdminContext } from '../context/AdminContext';

const { toggleCategoryVisibility } = useContext(AdminContext);
await toggleCategoryVisibility(categoryId, false); // Hide category
```

**Admin UI**:
- Located in Admin Panel → Categories section
- Each category card has Eye/EyeOff toggle button
- Hidden categories show "Yashirilgan" badge and appear dimmed
- Toggle button text: "Ko'rsatish" (Show) / "Yashirish" (Hide)

**Customer Views**:
- HomePage: `categories.filter(c => c.visible !== false)`
- ShopPage: `categories.filter(c => c.visible !== false)`
- Hidden categories are completely filtered from customer view
- Products in hidden categories remain accessible via search/direct links

**Migration Required**:
When deploying this feature, run the migration in Supabase SQL Editor:
```sql
ALTER TABLE categories ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true;
UPDATE categories SET visible = true WHERE visible IS NULL;
```

Migration file: `supabase-migrations/add-categories-visible.sql`

## Notes

- Mobile-first design (max-width: 448px)
- All dates use Uzbek locale formatting
- Images stored in Supabase Storage
- Rich text editor (React Quill) for product descriptions
