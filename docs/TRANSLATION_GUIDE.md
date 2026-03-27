# Multilingual Product Content Guide

## Overview

Ailem bot supports **Uzbek (uz)** and **Russian (ru)** languages for both UI elements and product content.

## Architecture

### 1. UI Translations (Static Content)
**Location**: `/src/locales/uz.js` and `/src/locales/ru.js`

- Buttons, labels, messages, etc.
- Accessed via `useTranslation()` hook
- Example: `t('product.addToCart')` → "Savatga qo'shish" / "В корзину"

### 2. Product Content (Dynamic Database Content)
**Location**: Supabase database columns

Products, categories, and materials have language-specific columns:
- `name_uz`, `name_ru`
- `description_uz`, `description_ru`
- `material_uz`, `material_ru`

## Database Schema

### Products Table
```sql
-- Uzbek columns
name_uz TEXT
description_uz TEXT
material_uz TEXT

-- Russian columns
name_ru TEXT
description_ru TEXT
material_ru TEXT

-- Original columns (deprecated, kept for backward compatibility)
name TEXT
description TEXT
material TEXT
```

### Categories Table
```sql
name_uz TEXT
name_ru TEXT
name TEXT  -- original (deprecated)
```

## Migration

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor, run:
/add-product-translations.sql
```

This will:
- ✅ Add language-specific columns
- ✅ Migrate existing data to `_uz` columns
- ✅ Create search indexes
- ✅ Leave `_ru` columns empty for manual translation

### Step 2: Translate Products
After migration, you need to manually add Russian translations:

1. Go to Admin Panel → Products
2. Edit each product
3. Fill in Russian fields (name, description, material)

## How It Works

### Language Detection
```javascript
// LanguageContext provides current language
const { language } = useContext(LanguageContext);  // 'uz' or 'ru'
```

### API Layer (Automatic)
```javascript
// Products API automatically returns localized content
const products = await productsAPI.getAll(language);

// Product object returned:
{
  name: product.name_uz || product.name,  // Uzbek by default
  description: product.description_uz || product.description,
  material: product.material_uz || product.material
}
```

### Fallback Strategy
- If Russian translation missing → falls back to Uzbek
- If Uzbek missing → falls back to original `name` column
- Ensures no content is lost

## Search Functionality

Search works across localized fields automatically:

```javascript
// Search in ShopPage.jsx
const query = 'подушка';  // Russian search

// Searches in:
- product.name (already localized by API based on current language)
- product.category (already localized)
- product.material (already localized)
- product.tags (language-agnostic)
```

## Admin Panel Updates Needed

### Current State
Admin panel currently saves to old columns (`name`, `description`, `material`)

### TODO: Update Admin Forms
Add language tabs to product edit form:

```jsx
<Tabs>
  <Tab label="O'zbek">
    <Input name="name_uz" />
    <Textarea name="description_uz" />
    <Input name="material_uz" />
  </Tab>
  <Tab label="Русский">
    <Input name="name_ru" />
    <Textarea name="description_ru" />
    <Input name="material_ru" />
  </Tab>
</Tabs>
```

## Best Practices

### For Developers
1. ✅ Always use `useTranslation()` hook for UI text
2. ✅ Product content automatically localized by API - no manual handling needed
3. ✅ Test language switching in development
4. ❌ Never hardcode UI strings in components

### For Content Managers
1. ✅ Fill both Uzbek and Russian fields for all products
2. ✅ Use consistent terminology across products
3. ✅ Keep descriptions concise and clear
4. ✅ Verify translations before publishing

## Testing

### Test Language Switching
```javascript
// In browser console
localStorage.setItem('language', 'ru');  // Switch to Russian
window.location.reload();

localStorage.setItem('language', 'uz');  // Switch to Uzbek
window.location.reload();
```

### Test Search
1. Switch to Russian
2. Search for "подушка" (pillow)
3. Should find products with Russian names containing "подушка"

### Test Fallbacks
1. Create product with only Uzbek name
2. Switch to Russian
3. Should show Uzbek name (fallback)

## Migration Checklist

- [x] Database migration script created
- [x] API updated to return localized fields
- [x] Search updated to work with localized content
- [x] UI translations added to product components
- [ ] Run database migration in Supabase
- [ ] Update admin panel forms for translation input
- [ ] Translate existing products to Russian
- [ ] Test thoroughly before deployment

## Files Modified

### Database
- `/add-product-translations.sql` - Migration script

### API Layer
- `/src/services/api.js` - Product localization logic

### Components
- `/src/components/pages/ShopPage.jsx` - Search functionality
- `/src/components/product/ProductDetails.jsx` - UI translations
- `/src/components/product/ReviewSection.jsx` - UI translations
- `/src/components/product/RelatedProducts.jsx` - UI translations

### Locales
- `/src/locales/uz.js` - Uzbek UI translations
- `/src/locales/ru.js` - Russian UI translations

## Questions?

Contact the development team or refer to:
- `WARP.md` for project architecture
- `README.md` for general project info
