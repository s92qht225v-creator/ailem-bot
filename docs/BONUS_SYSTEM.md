# Bonus Points System Documentation

## Overview
The app has a comprehensive bonus points system that rewards users for purchases and referrals.

## Purchase Bonus System

### How It Works
When an order is approved (payment successful), the buyer automatically receives bonus points.

### Configuration
- **Default Rate**: 3% of order total (changed from 10%)
- **Configurable**: Can be changed in Admin Panel → Settings → Bonus Config
- **Storage**: Stored in `app_settings.bonus_config.purchaseBonus` in Supabase

### Calculation Example
```javascript
Order Total: 50,000 UZS
Bonus Rate: 3%
Bonus Points Awarded: 1,500 points

Order Total: 100,000 UZS
Bonus Rate: 3%
Bonus Points Awarded: 3,000 points
```

### Implementation Flow
1. User completes payment (Payme or Click)
2. Payment webhook receives confirmation
3. Order status updated to `approved`
4. **Bonus points automatically awarded** via `awardBonusPoints()` function
5. User's `bonus_points` column updated in database
6. Telegram notification sent to user

### Code Location
- **Calculation**: `src/utils/helpers.js` → `calculateBonusPoints()`
- **Awarding**: `api/payme-webhook.js` → `awardBonusPoints()` (line 13-79)
- **Awarding**: `api/click-webhook.js` → `awardBonusPoints()` (similar implementation)

### Key Code
```javascript
// In payment webhook after order approved
async function awardBonusPoints(order) {
  // Get bonus config from database (default 3%)
  const purchaseBonusPercentage = settings?.bonus_config?.purchaseBonus || 3;
  
  // Calculate points
  const purchaseBonusPoints = Math.round((order.total * purchaseBonusPercentage) / 100);
  
  // Add to user's account
  await supabase
    .from('users')
    .update({ bonus_points: currentBonus + purchaseBonusPoints })
    .eq('id', userId);
}
```

## Referral Bonus System

### How It Works
When a referred user makes a purchase, the referrer earns bonus points.

### Configuration
- **Default Rate**: 10% of referee's order total
- **Configurable**: Can be changed in Admin Panel → Settings → Bonus Config
- **Storage**: Stored in localStorage as `bonusConfig.referralCommission`

### Calculation Example
```javascript
Referee's Order: 50,000 UZS
Commission Rate: 10%
Referrer Earns: 5,000 bonus points

Referee's Order: 100,000 UZS
Commission Rate: 10%
Referrer Earns: 10,000 bonus points
```

### Implementation Flow
1. User A shares referral link (contains their referral code)
2. User B signs up using User A's link
3. User B's account tagged with `referred_by: UserA_Code`
4. When User B makes a purchase and order is approved
5. System finds User A via referral code
6. **Referral bonus automatically awarded** to User A
7. User A's referral count incremented

### Code Location
- **Tracking Referral**: `src/context/UserContext.jsx` → `setReferredBy()` (line 176-200)
- **Awarding Commission**: `src/context/UserContext.jsx` → `addReferral()` (line 202-240)

### Key Code
```javascript
const addReferral = async (referredUserId, referredUserName, orderTotal = 0) => {
  // Get commission percentage (default 10%)
  const bonusConfig = loadFromLocalStorage('bonusConfig', { referralCommission: 10 });
  const commissionPercentage = bonusConfig?.referralCommission || 10;
  
  // Calculate commission
  const commissionAmount = Math.round((orderTotal * commissionPercentage) / 100);
  
  // Award to referrer
  const newReferrals = currentUser.referrals + 1;
  const newBonusPoints = currentUser.bonusPoints + commissionAmount;
  
  await usersAPI.incrementReferrals(user.id);
  await usersAPI.updateBonusPoints(user.id, newBonusPoints);
};
```

## Bonus Points Usage

### How Users Can Spend Points
- **Maximum Usage**: 20% of order total can be paid with bonus points
- **Conversion Rate**: 1 bonus point = 1 UZS (default, configurable)
- **Applied at Checkout**: User can select how many points to use

### Usage Calculation
```javascript
Order Total: 50,000 UZS
Max Points Usable: 10,000 points (20% of total)
Discount Applied: 10,000 UZS

Final Price: 40,000 UZS
```

### Code Location
- **Max Calculation**: `src/utils/helpers.js` → `calculateMaxBonusUsage()` (line 99-107)
- **Conversion**: `src/utils/helpers.js` → `bonusPointsToDollars()` (line 110-117)

## Configuration Management

### Where to Configure

#### Admin Panel (Future Implementation)
In the admin panel, there should be a "Bonus Settings" section where you can configure:
- Purchase bonus percentage (currently 3%)
- Referral commission percentage (currently 10%)
- Point value (currently 1 point = 1 UZS)
- Max usage percentage (currently 20%)

#### Current Configuration
Settings are stored in:
1. **Database**: `app_settings.bonus_config` (for purchase bonus)
2. **LocalStorage**: `bonusConfig` key (for referral commission and point value)

### Important Notes

1. **Purchase Bonus is Automatic**: No manual approval needed - awarded immediately when payment webhook confirms order
2. **Referral Bonus Requires Manual Trigger**: Currently needs admin to call `addReferral()` when referee's order is approved
3. **Database Column**: Make sure `app_settings` table has `bonus_config` column (JSONB type)
4. **Default is 3%**: Changed from original 10% to prevent excessive rewards

## Testing

### Test Purchase Bonus
1. Create order in app
2. Pay with test card
3. Check user's bonus points increased by 3% of order total

### Test Referral Bonus
1. User A shares referral link
2. User B signs up via link
3. User B makes purchase
4. Check User A's bonus points increased by 10% of User B's order

## Future Improvements

1. **Admin UI**: Add bonus configuration UI in admin panel
2. **Automatic Referral Tracking**: Auto-award referral bonus when referee's order is approved
3. **Bonus History**: Show users their bonus earning history
4. **Tiered Bonuses**: Different rates for different customer tiers
5. **Expiry**: Add expiry dates for bonus points
