import { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usersAPI } from '../services/api';
import { generateReferralCode, saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage } from '../utils/helpers';

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
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]); // Start empty, load from Supabase
  const [loading, setLoading] = useState(true);

  // Use ref to avoid recreating callbacks when user changes
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Initialize user — check for cached session or default to guest
  useEffect(() => {
    initializeUser();
  }, []);

  // Save favorites to localStorage only for guest users
  useEffect(() => {
    if (user?.isGuest) {
      saveToLocalStorage('favorites', favorites);
    }
  }, [favorites, user?.isGuest]);

  const initializeUser = async () => {
    try {
      setLoading(true);

      // Check for cached logged-in user
      const cachedUser = loadFromLocalStorage('cachedUser');
      if (cachedUser && cachedUser.telegramId) {
        console.log('🔵 Restoring cached user session:', cachedUser.name);
        setUser(cachedUser);

        // Load favorites from Supabase for logged-in users
        try {
          const dbUser = await usersAPI.getById(cachedUser.id);
          const dbFavorites = normalizeFavorites(dbUser.favorites || []);
          setFavorites(dbFavorites);
          removeFromLocalStorage('favorites');

          // Update cached user with latest data from DB
          const updatedUser = {
            ...cachedUser,
            bonusPoints: dbUser.bonus_points ?? cachedUser.bonusPoints,
            referrals: dbUser.referrals ?? cachedUser.referrals,
            referredBy: dbUser.referred_by ?? cachedUser.referredBy,
            totalOrders: dbUser.total_orders ?? cachedUser.totalOrders,
            phone: dbUser.phone || cachedUser.phone,
            role: dbUser.role || cachedUser.role
          };
          setUser(updatedUser);
          saveToLocalStorage('cachedUser', updatedUser);
        } catch (err) {
          console.error('Failed to refresh user data from Supabase:', err);
          // Use cached favorites as fallback
          const cachedFavs = normalizeFavorites(loadFromLocalStorage('favorites', []));
          setFavorites(cachedFavs);
        }
        return;
      }

      // Default to guest user
      console.log('👤 Starting as guest user');
      const guestUser = {
        id: 'guest-' + Date.now(),
        name: 'Mehmon',
        username: 'guest',
        isGuest: true,
        bonusPoints: 0,
        referralCode: null,
        referrals: 0,
        referredBy: null,
        role: 'customer'
      };

      setUser(guestUser);

      // Load guest favorites from localStorage
      const guestFavorites = normalizeFavorites(loadFromLocalStorage('favorites', []));
      setFavorites(guestFavorites);

    } catch (err) {
      console.error('Failed to initialize user:', err);
      // Fallback to guest user
      const guestUser = {
        id: 'guest-' + Date.now(),
        name: 'Mehmon',
        username: 'guest',
        isGuest: true,
        bonusPoints: 0,
        referralCode: null,
        referrals: 0,
        referredBy: null,
        role: 'customer'
      };
      setUser(guestUser);
      const guestFavorites = normalizeFavorites(loadFromLocalStorage('favorites', []));
      setFavorites(guestFavorites);
    } finally {
      setLoading(false);
    }
  };

  // Login via Telegram Login Widget
  const loginWithTelegram = useCallback(async (telegramData) => {
    try {
      const response = await fetch('/api/auth/telegram-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const { user: appUser } = await response.json();

      // Merge guest cart before switching user
      const guestCart = loadFromLocalStorage('cart', []);

      const loggedInUser = {
        ...appUser,
        isGuest: false
      };

      setUser(loggedInUser);
      saveToLocalStorage('cachedUser', loggedInUser);

      // Load favorites from server response or fetch from DB
      const dbFavorites = normalizeFavorites(appUser.favorites || []);
      setFavorites(dbFavorites);
      removeFromLocalStorage('favorites');

      // Merge guest cart with server cart
      if (guestCart.length > 0) {
        try {
          const dbCart = appUser.cart || [];
          const mergedCart = [...dbCart];

          for (const guestItem of guestCart) {
            const existing = mergedCart.find(
              item => item.id === guestItem.id &&
                item.selectedColor === guestItem.selectedColor &&
                item.selectedSize === guestItem.selectedSize
            );
            if (existing) {
              existing.quantity += guestItem.quantity;
            } else {
              mergedCart.push(guestItem);
            }
          }

          await usersAPI.updateCart(appUser.id, mergedCart);
          saveToLocalStorage('cart', mergedCart);
        } catch (err) {
          console.error('Failed to merge carts:', err);
        }
      }

      return loggedInUser;
    } catch (err) {
      console.error('Telegram login failed:', err);
      throw err;
    }
  }, []);

  // Logout — revert to guest
  const logout = useCallback(() => {
    removeFromLocalStorage('cachedUser');
    removeFromLocalStorage('favorites');
    removeFromLocalStorage('cart');

    const guestUser = {
      id: 'guest-' + Date.now(),
      name: 'Mehmon',
      username: 'guest',
      isGuest: true,
      bonusPoints: 0,
      referralCode: null,
      referrals: 0,
      referredBy: null,
      role: 'customer'
    };

    setUser(guestUser);
    setFavorites([]);
  }, []);

  const updateBonusPoints = useCallback(async (points) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.isGuest) return;

    try {
      const newPoints = currentUser.bonusPoints + points;

      await usersAPI.updateBonusPoints(currentUser.id, newPoints);

      setUser(prev => ({
        ...prev,
        bonusPoints: newPoints
      }));

      // Update cache
      saveToLocalStorage('cachedUser', { ...currentUser, bonusPoints: newPoints });
    } catch (err) {
      console.error('Failed to update bonus points:', err);
    }
  }, []);

  const setReferredBy = useCallback(async (referralCode) => {
    const currentUser = userRef.current;
    if (!currentUser?.referredBy && currentUser && !currentUser.isGuest) {
      try {
        await usersAPI.update(currentUser.id, { referred_by: referralCode });
        console.log('Referred by saved to Supabase:', referralCode);
      } catch (err) {
        console.error('Failed to save referred_by to Supabase:', err);
      }

      setUser(prev => ({
        ...prev,
        referredBy: referralCode
      }));

      saveToLocalStorage('cachedUser', { ...currentUser, referredBy: referralCode });
    }
  }, []);

  const addReferral = useCallback(async (referredUserId, referredUserName, orderTotal = 0) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.isGuest) return;

    try {
      // Get configured commission percentage from localStorage
      const bonusConfig = loadFromLocalStorage('bonusConfig', { referralCommission: 3 });
      const commissionPercentage = bonusConfig?.referralCommission || 3;
      const commissionAmount = Math.round((orderTotal * commissionPercentage) / 100);

      const newReferrals = currentUser.referrals + 1;
      const newBonusPoints = currentUser.bonusPoints + commissionAmount;

      await usersAPI.incrementReferrals(currentUser.id);
      await usersAPI.updateBonusPoints(currentUser.id, newBonusPoints);

      setUser(prev => ({
        ...prev,
        referrals: newReferrals,
        bonusPoints: newBonusPoints
      }));

      saveToLocalStorage('cachedUser', { ...currentUser, referrals: newReferrals, bonusPoints: newBonusPoints });
    } catch (err) {
      console.error('Failed to add referral:', err);
    }
  }, []);

  const toggleFavorite = useCallback(async (productId) => {
    const normalizedId = normalizeId(productId);
    if (!normalizedId) return;

    setFavorites(prevFavorites => {
      const currentFavorites = normalizeFavorites(prevFavorites);
      const isFav = currentFavorites.includes(normalizedId);

      const updatedFavorites = isFav
        ? currentFavorites.filter(id => id !== normalizedId)
        : [...currentFavorites, normalizedId];

      // Sync to Supabase for logged-in users, localStorage for guests
      const currentUser = userRef.current;
      if (currentUser?.id && !currentUser.isGuest) {
        usersAPI.updateFavorites(currentUser.id, updatedFavorites)
          .catch(err => {
            console.error('Failed to sync favorites to Supabase:', err);
            saveToLocalStorage('favorites', updatedFavorites);
          });
      } else {
        saveToLocalStorage('favorites', updatedFavorites);
      }

      return updatedFavorites;
    });
  }, []);

  const favoritesSet = useMemo(() => new Set(normalizeFavorites(favorites)), [favorites]);

  const isFavorite = useCallback((productId) => {
    const normalizedId = normalizeId(productId);
    if (!normalizedId) return false;
    return favoritesSet.has(normalizedId);
  }, [favoritesSet]);

  const clearUserData = useCallback(() => {
    removeFromLocalStorage('cachedUser');
    removeFromLocalStorage('favorites');
  }, []);

  const contextValue = {
    user,
    setUser,
    updateBonusPoints,
    setReferredBy,
    addReferral,
    favorites,
    toggleFavorite,
    isFavorite,
    loading,
    clearUserData,
    loginWithTelegram,
    logout
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};
