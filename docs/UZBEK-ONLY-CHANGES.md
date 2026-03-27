# Converting App to Uzbek-Only - Implementation Guide

## ✅ Completed
1. Removed LanguageProvider from main.jsx
2. Created database migration (run successfully)

## 🔧 Changes Needed

### 1. API Layer (src/services/api.js)

**Remove these parameters from all API calls:**
- Remove `language = 'uz'` parameter from all functions
- Remove all `product[`name_${language}`]` logic
- Remove all localization mapping

**Key changes:**

```javascript
// OLD productsAPI.getAll()
async getAll(language = 'uz') {
  // ... complex localization logic
  name: product[`name_${language}`] || product.name,
}

// NEW productsAPI.getAll() 
async getAll() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return products.map(product => ({
    ...product,
    category: product.category_name,
    originalPrice: product.original_price,
    reviewCount: product.review_count,
    variants: product.variants || []
  }));
}
```

**Same simplification for:**
- `productsAPI.getById()` - remove language param and localization
- `productsAPI.create()` - remove _uz, _ru fields
- `productsAPI.update()` - remove _uz, _ru fields
- `categoriesAPI.getAll()` - already done ✅

### 2. Components - Remove useTranslation

**Find and replace in ALL component files:**

```javascript
// REMOVE these lines:
import { useTranslation } from '../hooks/useTranslation';
const { t, language } = useTranslation();

// REPLACE t('key') with direct Uzbek text:
t('cart.title') → 'Savat'
t('product.addToCart') → 'Savatga qo\'shish'
t('checkout.title') → 'Buyurtma berish'
```

**Key components to update:**
- `src/components/pages/ShopPage.jsx`
- `src/components/pages/CartPage.jsx`
- `src/components/pages/CheckoutPage.jsx`
- `src/components/pages/ProductPage.jsx`
- `src/components/pages/ProfilePage.jsx`
- `src/components/pages/OrderHistoryPage.jsx`
- `src/components/pages/FavoritesPage.jsx`
- `src/components/layout/Header.jsx`
- `src/components/layout/BottomNav.jsx`

### 3. Admin Panel Forms

**Remove language tabs and multilingual fields:**

In `src/components/pages/DesktopAdminPanel.jsx`:

```javascript
// REMOVE:
const [activeLanguageTab, setActiveLanguageTab] = useState('uz');
name_uz: '',
name_ru: '',
description_uz: '',
description_ru: '',

// KEEP ONLY:
name: '',
description: '',
material: '',
colors: '',
sizes: '',
tags: ''
```

### 4. Admin Context

In `src/context/AdminContext.jsx`:

**Remove language param from API calls:**
```javascript
// OLD
const productsData = await productsAPI.getAll(language);
const categoriesData = await categoriesAPI.getAll(language);

// NEW  
const productsData = await productsAPI.getAll();
const categoriesData = await categoriesAPI.getAll();
```

### 5. Checkout Page

**Simplify courier/state names** - they're already in English in database for matching with Shipping Rates, just display them as-is:

```javascript
// No translation needed anymore!
const courierOptions = getCourierServices(); // Returns ['BTS', 'Yandex', etc]
```

### 6. Pickup Points Context

Already simplified to not filter by language ✅

### 7. Variant Utilities

Update `src/utils/variants.js` to remove `color_ru`, `size_ru` fields:

```javascript
// OLD variant structure:
{ color: 'Qora', color_ru: 'Черный', size: 'Katta', size_ru: 'Большой' }

// NEW variant structure (Uzbek only):
{ color: 'Qora', size: 'Katta', stock: 10, image: '...' }
```

## 📝 Quick Reference: Uzbek Translations

```javascript
// Navigation
'Bosh sahifa' // Home
'Do\'kon' // Shop  
'Savat' // Cart
'Profil' // Profile

// Actions
'Savatga qo\'shish' // Add to cart
'Xarid qilish' // Buy now
'Buyurtma berish' // Place order
'Qidirish' // Search

// Common
'Narx' // Price
'Omborda' // In stock
'Tugadi' // Out of stock
'Yetkazib berish' // Delivery
```

## 🗑️ Files to Delete

```bash
rm src/context/LanguageContext.jsx
rm src/hooks/useTranslation.js
rm src/components/LanguageSwitcher.jsx
rm src/locales/ru.js
rm src/locales/en.js
# Keep src/locales/uz.js as reference only
```

## ⚠️ Important Notes

1. **Database already migrated** ✅ - multilingual fields removed
2. **Pickup Points** use English courier/state names for matching with Shipping Rates
3. **Display everything in Uzbek** on frontend
4. **Admin panel** should also be in Uzbek
5. **Test thoroughly** after all changes

## 🚀 Testing Checklist

- [ ] Products display correctly
- [ ] Categories show in Uzbek
- [ ] Search works
- [ ] Cart functions
- [ ] Checkout flow works
- [ ] Pickup points match with shipping rates
- [ ] Admin panel product creation works
- [ ] Admin panel forms simplified (no language tabs)
- [ ] No console errors
