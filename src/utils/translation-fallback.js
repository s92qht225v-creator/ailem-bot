// Simple fallback for t() function to prevent errors
// Returns key if no translation found

export const t = (key) => {
  // Map of common translations
  const translations = {
    'profile.title': 'Profil',
    'profile.guest': 'Mehmon',
    'profile.guestUser': 'Mehmon foydalanuvchi',
    'orders.title': 'Buyurtmalar',
    'orders.empty': 'Buyurtmalar yo\'q',
    'profile.addresses': 'Manzillar',
    'profile.addressesSubtitle': 'Yetkazib berish manzillaringizni boshqaring',
    'profile.reviews': 'Sharhlar',
    'profile.reviewsSubtitle': 'Sizning sharhlaringiz',
    'profile.favorites': 'Saralangan',
    'profile.favoritesSubtitle': 'Saralangan mahsulotlar',
    'profile.bonusPoints': 'Bonus ballari',
    'profile.earnings': 'ball',
    'profile.settings': 'Sozlamalar',
    'profile.settingsSubtitle': 'Hisobingizni boshqaring',
    'profile.help': 'Yordam',
    'profile.helpSubtitle': 'FAQ va qo\'llab-quvvatlash',
    'profile.login': 'Kirish',
    'profile.loginSubtitle': 'Hisobingizga kiring',
    'profile.logout': 'Chiqish',
    'profile.logoutSubtitle': 'Hisobdan chiqish',
    'common.comingSoon': 'Tez orada!',
    'cart.title': 'Savat',
    'cart.empty': 'Savatda hech narsa yo\'q',
    'checkout.title': 'Buyurtma berish',
    'shop.title': 'Do\'kon',
    'nav.home': 'Bosh sahifa',
    'nav.shop': 'Do\'kon',
    'nav.cart': 'Savat',
    'nav.profile': 'Profil'
  };
  
  return translations[key] || key;
};
