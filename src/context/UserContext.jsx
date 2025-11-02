import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { usersAPI } from '../services/api';
import { generateReferralCode, saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage } from '../utils/helpers';
import { getTelegramUser, isInTelegram } from '../utils/telegram';

export const UserContext = createContext();

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
};

const normalizeFavorites = (value) => {
  if (!Array.isArray(value)) return [];

  const unique = new Set();
  for (const item of value) {
    const normalized = normalizeId(item);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
};

export const UserProvider = ({ children }) => {
  console.log('👤 UserProvider render');
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]); // Start empty, load from Supabase
  const [loading, setLoading] = useState(true);

  // Initialize user from Telegram WebApp or create demo user
  useEffect(() => {
    initializeUser();
  }, []);

  // Save favorites to localStorage only for demo user
  useEffect(() => {
    if (user?.id === 'demo-1') {
      saveToLocalStorage('favorites', favorites);
    }
  }, [favorites, user?.id]); // Only depend on user.id, not entire user object

  const initializeUser = async () => {
    try {
      setLoading(true);

      // Check if running in Telegram
      if (isInTelegram()) {
        console.log('🔵 Running in Telegram, fetching user data...');
        const tgUser = getTelegramUser();

        if (tgUser && tgUser.id) {
          console.log('✅ Telegram user found:', tgUser);

          // Prepare user data for Supabase
          const fullName = `${tgUser.firstName || ''} ${tgUser.lastName || ''}`.trim();
          const telegramUserData = {
            telegramId: tgUser.id.toString(),
            name: fullName || tgUser.username || `User ${tgUser.id}`,
            username: tgUser.username || `user${tgUser.id}`,
            photoUrl: tgUser.photoUrl || '',
            referralCode: generateReferralCode(tgUser.firstName || tgUser.username || tgUser.id.toString()),
            referredBy: null // Will be set from URL param in App.jsx
          };

          // Get or create user in Supabase
          const dbUser = await usersAPI.getOrCreate(telegramUserData);
          console.log('✅ User synced with Supabase:', dbUser);

          // Map database fields to app format
          const appUser = {
            id: dbUser.id,
            telegramId: dbUser.telegram_id,
            name: dbUser.name,
            username: dbUser.username,
            phone: dbUser.phone,
            photoUrl: dbUser.photo_url,
            bonusPoints: dbUser.bonus_points || 0,
            referralCode: dbUser.referral_code,
            referrals: dbUser.referrals || 0,
            referredBy: dbUser.referred_by,
            totalOrders: dbUser.total_orders || 0
          };

          setUser(appUser);

          // Load user's favorites - prioritize database (source of truth for real users)
          const dbFavorites = normalizeFavorites(dbUser.favorites || []);
          console.log('📥 Loading favorites from database:', dbFavorites);
          setFavorites(dbFavorites);
          
          // Clear any stale localStorage favorites to avoid confusion
          removeFromLocalStorage('favorites');

          // Cache the user locally for faster subsequent loads
          saveToLocalStorage('cachedUser', appUser);
          return;
        }
      }

      console.log('⚠️ Not in Telegram or no Telegram user, using demo user');
      // Fallback to demo user (for development/testing)
      const demoUser = loadFromLocalStorage('demoUser') || {
        id: 'demo-1',
        name: 'Demo User',
        username: 'demo_user',
        bonusPoints: 250,
        referralCode: generateReferralCode('Demo User'),
        referrals: 3,
        referredBy: null
      };

      setUser(demoUser);

      // Load demo user favorites from localStorage
      const demoFavorites = normalizeFavorites(loadFromLocalStorage('favorites', []));
      console.log('📥 Loading favorites from localStorage (demo user):', demoFavorites);
      setFavorites(demoFavorites);

      saveToLocalStorage('demoUser', demoUser);
    } catch (err) {
      console.error('❌ Failed to initialize user:', err);
      // Fallback to demo user
      const demoUser = {
        id: 'demo-1',
        name: 'Demo User',
        username: 'demo_user',
        bonusPoints: 250,
        referralCode: generateReferralCode('Demo User'),
        referrals: 3,
        referredBy: null
      };
      setUser(demoUser);
      // Load demo user favorites from localStorage
      const demoFavorites = normalizeFavorites(loadFromLocalStorage('favorites', []));
      setFavorites(demoFavorites);
    } finally {
      setLoading(false);
    }
  };

  const updateBonusPoints = async (points) => {
    if (!user) return;

    try {
      const newPoints = user.bonusPoints + points;

      // Update in Supabase if real user
      if (user.id !== 'demo-1') {
        await usersAPI.updateBonusPoints(user.id, newPoints);
      }

      // Update local state
      setUser(prev => ({
        ...prev,
        bonusPoints: newPoints
      }));

      // Save demo user to localStorage
      if (user.id === 'demo-1') {
        saveToLocalStorage('demoUser', { ...user, bonusPoints: newPoints });
      }
    } catch (err) {
      console.error('Failed to update bonus points:', err);
    }
  };

  const setReferredBy = async (referralCode) => {
    // Only set if user hasn't been referred before
    if (!user?.referredBy) {
      // Update in Supabase if real user
      if (user?.id && user.id !== 'demo-1') {
        try {
          await usersAPI.update(user.id, { referred_by: referralCode });
          console.log('✅ Referred by saved to Supabase:', referralCode);
        } catch (err) {
          console.error('❌ Failed to save referred_by to Supabase:', err);
        }
      }

      setUser(prev => ({
        ...prev,
        referredBy: referralCode
      }));

      // Save to localStorage for demo user
      if (user?.id === 'demo-1') {
        saveToLocalStorage('demoUser', { ...user, referredBy: referralCode });
      }
    }
  };

  const addReferral = async (referredUserId, referredUserName, orderTotal = 0) => {
    if (!user) return;

    try {
      // Get configured commission percentage from localStorage
      const bonusConfig = loadFromLocalStorage('bonusConfig', { referralCommission: 10 });
      const commissionPercentage = bonusConfig?.referralCommission || 10;
      const commissionAmount = Math.round((orderTotal * commissionPercentage) / 100);

      const newReferrals = user.referrals + 1;
      const newBonusPoints = user.bonusPoints + commissionAmount;

      // Update in Supabase if real user
      if (user.id !== 'demo-1') {
        await usersAPI.incrementReferrals(user.id);
        await usersAPI.updateBonusPoints(user.id, newBonusPoints);
        console.log('✅ Referral synced with Supabase');
      }

      // Update local state
      setUser(prev => ({
        ...prev,
        referrals: newReferrals,
        bonusPoints: newBonusPoints
      }));

      // Save to localStorage for demo user
      if (user.id === 'demo-1') {
        saveToLocalStorage('demoUser', {
          ...user,
          referrals: newReferrals,
          bonusPoints: newBonusPoints
        });
      }
    } catch (err) {
      console.error('❌ Failed to add referral:', err);
    }
  };

  const toggleFavorite = useCallback(async (productId) => {
    const normalizedId = normalizeId(productId);
    if (!normalizedId) return;

    setFavorites(prevFavorites => {
      const currentFavorites = normalizeFavorites(prevFavorites);
      const isFav = currentFavorites.includes(normalizedId);
      console.log('🔄 Toggle favorite:', { productId: normalizedId, isFav });

      const updatedFavorites = isFav
        ? currentFavorites.filter(id => id !== normalizedId)
        : [...currentFavorites, normalizedId];

      console.log('✅ Local favorites updated:', updatedFavorites);

      // Sync to Supabase for real users, localStorage for demo users
      if (user?.id && user.id !== 'demo-1') {
        usersAPI.updateFavorites(user.id, updatedFavorites)
          .then(() => console.log('💾 Favorites synced to Supabase'))
          .catch(err => {
            console.error('❌ Failed to sync favorites to Supabase:', err);
            // Save to localStorage as fallback
            saveToLocalStorage('favorites', updatedFavorites);
            console.log('💾 Favorites saved to localStorage as fallback');
          });
      } else {
        // Demo user - save to localStorage
        saveToLocalStorage('favorites', updatedFavorites);
        console.log('💾 Demo user favorites saved to localStorage');
      }

      return updatedFavorites;
    });
  }, [user?.id]); // Only depend on user.id, not entire user object

  const favoritesSet = useMemo(() => new Set(normalizeFavorites(favorites)), [favorites]);

  const isFavorite = useCallback((productId) => {
    const normalizedId = normalizeId(productId);
    if (!normalizedId) return false;
    return favoritesSet.has(normalizedId);
  }, [favoritesSet]);

  const clearUserData = useCallback(() => {
    removeFromLocalStorage('cachedUser');
    removeFromLocalStorage('favorites');
    removeFromLocalStorage('demoUser');
  }, []);


  return (
    <UserContext.Provider value={{
      user,
      setUser,
      updateBonusPoints,
      setReferredBy,
      addReferral,
      favorites,
      toggleFavorite,
      isFavorite,
      loading,
      clearUserData
    }}>
      {children}
    </UserContext.Provider>
  );
};
