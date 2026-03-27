# i18n Usage Guide

Quick reference for using the internationalization system in Ailem.

## Basic Usage

### 1. Import the hook
```javascript
import { useTranslation } from '../hooks/useTranslation';
```

### 2. Use in component
```javascript
function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('home.welcome')}</h1>
      <button>{t('product.addToCart')}</button>
    </div>
  );
}
```

## Examples

### Simple Translation
```javascript
const { t } = useTranslation();

<h1>{t('cart.title')}</h1>
// Uzbek: "Savat"
// Russian: "Корзина"
```

### Translation with Variables
```javascript
<p>{t('product.inStock', { count: 10 })}</p>
// Uzbek: "Omborda: 10 dona"
// Russian: "В наличии: 10 шт"

<p>{t('shop.productsFound', { count: 5 })}</p>
// Uzbek: "5 ta mahsulot topildi"
// Russian: "Найдено 5 товаров"
```

### Nested Keys
```javascript
<span>{t('orders.statuses.pending')}</span>
// Uzbek: "Kutilmoqda"
// Russian: "В обработке"
```

### Language Switcher
```javascript
const { language, setLanguage } = useTranslation();

<select value={language} onChange={(e) => setLanguage(e.target.value)}>
  <option value="uz">O'zbekcha</option>
  <option value="ru">Русский</option>
</select>
```

Or use the pre-built component:
```javascript
import LanguageSwitcher from '../components/LanguageSwitcher';

<LanguageSwitcher />
```

## Common Patterns

### Page Titles
```javascript
// Header.jsx
<h1>{t('header.title')}</h1>

// CartPage.jsx
<h1>{t('cart.title')}</h1>

// ProfilePage.jsx
<h1>{t('profile.title')}</h1>
```

### Buttons
```javascript
<button>{t('common.save')}</button>
<button>{t('common.cancel')}</button>
<button>{t('product.addToCart')}</button>
<button>{t('checkout.placeOrder')}</button>
```

### Form Labels
```javascript
<label>{t('checkout.fullName')}</label>
<input placeholder={t('checkout.fullName')} />

<label>{t('checkout.phone')}</label>
<input placeholder={t('checkout.phone')} />
```

### Status Messages
```javascript
// Order status
const statusKey = `orders.statuses.${order.status}`;
<span>{t(statusKey)}</span>

// Payment status
<span>{t('payment.success')}</span>
<span>{t('payment.failed')}</span>
```

### Error Messages
```javascript
<p>{t('errors.network')}</p>
<p>{t('errors.general')}</p>
<p>{t('checkout.required')}</p>
```

### Navigation
```javascript
<a href="#/shop">{t('nav.shop')}</a>
<a href="#/cart">{t('nav.cart')}</a>
<a href="#/profile">{t('nav.profile')}</a>
```

## Priority Translation Order

Update these pages first:

1. **Header.jsx** - `t('header.searchPlaceholder')`
2. **BottomNav.jsx** - `t('nav.home')`, `t('nav.shop')`, etc.
3. **HomePage.jsx** - `t('home.welcome')`, `t('home.shopNow')`
4. **ShopPage.jsx** - `t('shop.allProducts')`, `t('shop.noProducts')`
5. **ProductPage.jsx** - `t('product.addToCart')`, `t('product.inStock')`
6. **CartPage.jsx** - `t('cart.title')`, `t('cart.checkout')`
7. **CheckoutPage.jsx** - `t('checkout.title')`, `t('checkout.placeOrder')`
8. **PaymentPage.jsx** - `t('payment.title')`, `t('payment.payme')`
9. **ProfilePage.jsx** - `t('profile.title')`, add `<LanguageSwitcher />`

## Testing

### Check Current Language
```javascript
const { language } = useTranslation();
console.log('Current language:', language);
```

### Test Language Switch
1. Open app in browser
2. Go to Profile page
3. Click on LanguageSwitcher
4. Verify all text updates
5. Refresh page - language should persist

### Test Auto-Detection
1. Clear localStorage
2. Reload app
3. Check if language detected from Telegram (if in Telegram)
4. Otherwise should default to Uzbek

## Translation Keys Reference

See the full list of available translation keys in:
- `src/locales/uz.js` - Uzbek translations (complete)
- `src/locales/ru.js` - Russian translations (complete)

## Adding New Translations

1. Add to `src/locales/uz.js`:
```javascript
export default {
  mySection: {
    myKey: 'Uzbek translation'
  }
};
```

2. Add to `src/locales/ru.js`:
```javascript
export default {
  mySection: {
    myKey: 'Russian translation'
  }
};
```

3. Use in component:
```javascript
<p>{t('mySection.myKey')}</p>
```

## Migration Checklist

- [x] Create translation files (uz.js, ru.js)
- [x] Create LanguageContext
- [x] Create useTranslation hook
- [x] Wrap app with LanguageProvider
- [x] Create LanguageSwitcher component
- [ ] Update Header component
- [ ] Update BottomNav component
- [ ] Update HomePage
- [ ] Update ShopPage
- [ ] Update ProductPage
- [ ] Update CartPage
- [ ] Update CheckoutPage
- [ ] Update PaymentPage
- [ ] Update ProfilePage (add LanguageSwitcher)
- [ ] Test all pages with both languages

## Notes

- Default language is **Uzbek** (uz)
- Language auto-detects from Telegram user settings
- Language preference saved to localStorage
- Missing translations fall back to the translation key itself
- Don't translate product names/descriptions from database
- Only translate UI elements

---

**Quick Start**: Import `useTranslation`, call `t('key')`, done! 🎉
