# Internationalization (i18n) Implementation Plan

## Overview

Implement multi-language support for Ailem with Uzbek (primary) and Russian languages.

## Target Languages

1. **Uzbek (uz)** - Primary language (majority of users)
2. **Russian (ru)** - Secondary language (small percentage of users)
3. **English (en)** - Keep for fallback/development

## Implementation Strategy

### Phase 1: Core Setup ✅
- [x] Create translation files (`uz.js`, `ru.js`)
- [x] Create LanguageContext for state management
- [x] Create useTranslation hook
- [x] Detect user language from Telegram

### Phase 2: Integration (Current)
- [ ] Update all components to use translations
- [ ] Add language switcher in Profile
- [ ] Test all pages with both languages

### Phase 3: Refinement
- [ ] Review translations with native speakers
- [ ] Add missing translations
- [ ] Optimize bundle size (lazy load translations)

## File Structure

```
src/
├── locales/
│   ├── uz.js          # Uzbek translations (PRIMARY)
│   ├── ru.js          # Russian translations
│   ├── en.js          # English (fallback)
│   └── index.js       # Export all languages
├── context/
│   └── LanguageContext.jsx  # Language state management
└── hooks/
    └── useTranslation.js    # Translation hook
```

## Key Features

### 1. Automatic Language Detection
- Detect from Telegram user language
- Fall back to Uzbek if not detected
- Remember user's manual selection

### 2. Variable Interpolation
```javascript
// Translation: "Omborda: {count} dona"
t('product.inStock', { count: 5 })
// Output: "Omborda: 5 dona"
```

### 3. Nested Translation Keys
```javascript
t('cart.title')              // "Savat"
t('cart.empty')              // "Savatda hech narsa yo'q"
t('orders.statuses.pending') // "Kutilmoqda"
```

### 4. Pluralization (Optional)
Can be added later if needed:
```javascript
t('cart.items', { count: 1 })  // "1 ta mahsulot"
t('cart.items', { count: 5 })  // "5 ta mahsulot"
```

## Translation Coverage

### Completed
- Common UI elements
- Navigation
- Product pages
- Cart & Checkout
- Orders & Payment
- Profile & Settings
- Admin panel
- Notifications & Errors

### Priority Pages to Update

1. **High Priority** (Customer-facing)
   - HomePage
   - ShopPage
   - ProductPage
   - CartPage
   - CheckoutPage
   - PaymentPage
   - OrderHistoryPage
   - ProfilePage

2. **Medium Priority**
   - OrderDetailsPage
   - FavoritesPage
   - WriteReviewPage
   - PaymentStatusPage

3. **Low Priority** (Admin only)
   - DesktopAdminPanel
   - Admin settings

## Usage Examples

### Basic Translation
```javascript
import { useTranslation } from '../hooks/useTranslation';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <h1>{t('home.welcome')}</h1>
  );
}
```

### With Variables
```javascript
<p>{t('product.inStock', { count: product.stock })}</p>
// Uzbek: "Omborda: 10 dona"
// Russian: "В наличии: 10 шт"
```

### Language Switcher
```javascript
const { language, setLanguage } = useTranslation();

<select value={language} onChange={(e) => setLanguage(e.target.value)}>
  <option value="uz">O'zbekcha</option>
  <option value="ru">Русский</option>
</select>
```

## Testing Checklist

- [ ] Uzbek translations display correctly
- [ ] Russian translations display correctly
- [ ] Language persists after page reload
- [ ] Language switcher works
- [ ] All variable interpolations work
- [ ] No missing translation keys (fallback to English)
- [ ] Mobile layout works with both languages
- [ ] Long Russian text doesn't break UI

## Performance Considerations

### Current Approach
- All translations loaded on app start
- Total size: ~100KB (acceptable for now)

### Future Optimization (if needed)
- Lazy load translations per route
- Split common vs page-specific translations
- Use dynamic imports

## Localization Beyond Text

### Already Localized
- ✅ Currency: UZS (same for all languages)
- ✅ Date format: Handled by browser
- ✅ Number format: JavaScript Intl API

### To Consider
- Phone number format
- Address format (if internationalizing beyond Uzbekistan)

## Common Translation Patterns

### Status Messages
```javascript
// Order statuses
const statusKey = `orders.statuses.${order.status}`;
<span>{t(statusKey)}</span>
```

### Error Handling
```javascript
// Try specific error first, fall back to general
const errorKey = `errors.${errorCode}` || 'errors.general';
<p>{t(errorKey)}</p>
```

### Dynamic Content
```javascript
// Product categories (stored in database)
// Keep in database, don't translate
<h2>{category.name}</h2>

// UI around categories (translate)
<label>{t('shop.category')}</label>
```

## Migration Steps

1. **Wrap App with LanguageProvider**
   ```javascript
   <LanguageProvider>
     <App />
   </LanguageProvider>
   ```

2. **Replace hardcoded strings**
   ```javascript
   // Before
   <button>Add to Cart</button>
   
   // After
   <button>{t('product.addToCart')}</button>
   ```

3. **Test each page**
   - Switch language
   - Verify all text updates
   - Check for UI breaks

## Notes

- Uzbek uses Latin alphabet (not Cyrillic)
- Keep product names/descriptions in original language from database
- Translate only UI elements, not user-generated content
- Admin panel can stay in Uzbek primarily (admins are local)

## Resources

- Uzbek keyboard layout: https://www.branah.com/uzbek
- Russian keyboard layout: https://www.branah.com/russian
- Unicode for special characters: O' (Uzbek apostrophe)

---

**Status**: Core files created, integration in progress
**Next Step**: Create Russian translations and core i18n system
