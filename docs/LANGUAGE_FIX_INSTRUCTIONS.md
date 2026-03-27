# Language Implementation Fix - Instructions

## Overview
This fix implements proper bilingual support (Uzbek/Russian) for pickup points and shipping rates. State/region names and city names will now display correctly in the user's selected language.

## What Was Fixed

### 1. Created Translation System
- **File**: `src/utils/locationTranslations.js`
- Maps all Uzbek regions and cities to Russian equivalents
- Provides helper functions to normalize location names for matching

### 2. Updated Pickup Points Context
- **File**: `src/context/PickupPointsContext.jsx`
- Now properly filters pickup points by language
- Returns state/city names in the correct language (uz/ru)

### 3. Updated Shipping Rates Context
- **File**: `src/context/ShippingRatesContext.jsx`
- Normalizes location names for matching shipping rates
- Handles Uzbek, Russian, and English state names

### 4. Database Migration Ready
- **File**: `duplicate-pickup-points-russian.sql`
- SQL script to duplicate all pickup points with Russian translations
- Translates state and city names to Russian
- Keeps addresses in Latin (as requested)

## Step-by-Step Implementation

### Step 1: Backup Database (IMPORTANT!)
```bash
# Create a backup before running migration
pg_dump "$DATABASE_URL" > backup_before_language_fix_$(date +%Y%m%d).sql
```

### Step 2: Run Database Migration

**Option A: Using psql command line**
```bash
psql "$DATABASE_URL" -f duplicate-pickup-points-russian.sql
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy contents of `duplicate-pickup-points-russian.sql`
4. Paste and execute

**Option C: Create an admin tool** (Recommended for easier execution)
```bash
# Run the migration through Node.js
node run-language-migration.js
```

### Step 3: Verify Migration Results

The migration script will output:
- Count of pickup points by language
- Number of unique couriers, states, cities per language
- Sample records showing translations

Expected output:
```
 language | total_points | unique_couriers | unique_states | unique_cities
----------+--------------+-----------------+---------------+---------------
 uz       |      45      |        5        |       8       |      12
 ru       |      45      |        5        |        8       |      12
```

### Step 4: Deploy Code Changes

```bash
# Build and deploy
npm run build
vercel --prod --yes
```

## How It Works Now

### For Uzbek Users (language='uz'):
```
State: "Toshkent viloyati"
City: "Toshkent"
Address: "Amir Temur ko'chasi 129"  (Latin)
```

### For Russian Users (language='ru'):
```
State: "Ташкентская область"
City: "Ташкент"
Address: "Amir Temur ko'chasi 129"  (Latin - same)
```

### Shipping Rate Matching:
- User selects state in their language (e.g., "Ташкентская область")
- System normalizes to English internally ("Tashkent Region")
- Matches with shipping rates stored in English
- Delivery fee calculated correctly

## Testing Checklist

### Test in Uzbek (uz):
- [ ] Change language to Uzbek
- [ ] Add product to cart
- [ ] Go to checkout
- [ ] Select courier (e.g., "BTS")
- [ ] Verify states show in Uzbek (e.g., "Toshkent viloyati")
- [ ] Select state and city
- [ ] Verify pickup points load
- [ ] Verify delivery fee calculates correctly
- [ ] Complete order and verify delivery info saved correctly

### Test in Russian (ru):
- [ ] Change language to Russian
- [ ] Add product to cart
- [ ] Go to checkout
- [ ] Select courier (e.g., "BTS")
- [ ] Verify states show in Russian (e.g., "Ташкентская область")
- [ ] Select state and city
- [ ] Verify pickup points load
- [ ] Verify delivery fee calculates correctly
- [ ] Complete order and verify delivery info saved correctly

### Test Yandex Delivery:
- [ ] Test Yandex selection in both languages
- [ ] Verify Tashkent districts show correctly
- [ ] Verify flat rate delivery fee applies

## Troubleshooting

### Issue: No pickup points showing after language switch
**Solution**: Run the database migration. Russian pickup points don't exist yet.

### Issue: Delivery fee shows as 0
**Cause**: State name mismatch between pickup points and shipping rates
**Solution**:
1. Check console for warning message showing state names
2. Verify shipping rates table has entries for that state in English
3. Check if state translation exists in `locationTranslations.js`

### Issue: States/cities showing in English
**Cause**: Migration not run yet, or language column not set
**Solution**: Run the migration script

### Issue: Duplicate Russian entries created
**Solution**: The migration script has duplicate protection. Safe to run multiple times.

## Adding New States/Cities

When adding new regions or cities:

1. **Add to translation file**: `src/utils/locationTranslations.js`
```javascript
'New Region': {
  uz: 'Yangi viloyat',
  ru: 'Новая область',
  en: 'New Region'
}
```

2. **Add pickup points in Admin Panel** - Add in Uzbek first (language='uz')

3. **Run migration script again** - It will create Russian versions automatically

## Rollback Plan

If issues occur:

```bash
# Restore from backup
psql "$DATABASE_URL" < backup_before_language_fix_YYYYMMDD.sql

# Revert code changes
git revert HEAD
vercel --prod --yes
```

## Files Modified

1. ✅ `src/utils/locationTranslations.js` (NEW)
2. ✅ `src/context/PickupPointsContext.jsx`
3. ✅ `src/context/ShippingRatesContext.jsx`
4. ✅ `src/components/pages/CheckoutPage.jsx` (shipping fee calculation)
5. ✅ `duplicate-pickup-points-russian.sql` (NEW)

## Next Steps After Deployment

1. Monitor error logs for any state name mismatches
2. Test thoroughly with real users in both languages
3. Update admin panel to support adding bilingual pickup points
4. Consider adding language toggle in admin panel for easier management

## Support

If you encounter issues:
1. Check browser console for error messages
2. Check the warning logs for state name mismatches
3. Verify database has both 'uz' and 'ru' entries
4. Review `LANGUAGE_ANALYSIS_INDEX.md` for detailed analysis
