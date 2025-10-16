import { createContext, useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { generateReferralCode, saveToLocalStorage, loadFromLocalStorage } from '../utils/helpers';
import { getTelegramUser, isInTelegram } from '../utils/telegram';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize user from Telegram WebApp or create demo user
  useEffect(() => {
    initializeUser();
  }, []);

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
          const telegramUserData = {
            telegramId: tgUser.id.toString(),
            name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Telegram User',
            username: tgUser.username || `user${tgUser.id}`,
            photoUrl: tgUser.photo_url || '',
            referralCode: generateReferralCode(tgUser.first_name || tgUser.username || tgUser.id.toString()),
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
            totalOrders: dbUser.total_orders || 0,
            isAdmin: false // Can be toggled with button
          };

          setUser(appUser);
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
        referredBy: null,
        isAdmin: false
      };

      setUser(demoUser);
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
        referredBy: null,
        isAdmin: false
      };
      setUser(demoUser);
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

  const toggleAdminMode = () => {
    setUser(prev => ({
      ...prev,
      isAdmin: !prev.isAdmin
    }));
  };

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      updateBonusPoints,
      setReferredBy,
      addReferral,
      toggleAdminMode,
      loading
    }}>
      {children}
    </UserContext.Provider>
  );
};
