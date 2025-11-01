// Telegram Web App utilities

// Wait for Telegram WebApp to be ready
export const waitForTelegramWebApp = () => {
  return new Promise((resolve) => {
    if (window.Telegram?.WebApp) {
      resolve(window.Telegram.WebApp);
    } else {
      // Wait up to 3 seconds for Telegram script to load
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.Telegram?.WebApp) {
          clearInterval(checkInterval);
          resolve(window.Telegram.WebApp);
        } else if (attempts > 30) {
          // After 3 seconds, give up
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 100);
    }
  });
};

// Get Telegram WebApp instance
export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

// Initialize Telegram WebApp
export const initTelegramWebApp = async () => {
  const tg = await waitForTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
    return tg;
  }
  return null;
};

// Get Telegram user data
export const getTelegramUser = () => {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user) {
    return {
      id: tg.initDataUnsafe.user.id,
      firstName: tg.initDataUnsafe.user.first_name,
      lastName: tg.initDataUnsafe.user.last_name,
      username: tg.initDataUnsafe.user.username,
      photoUrl: tg.initDataUnsafe.user.photo_url,
      languageCode: tg.initDataUnsafe.user.language_code
    };
  }
  return null;
};

// Check if running in Telegram
export const isInTelegram = () => {
  return getTelegramWebApp() !== null;
};

// Show main button
export const showMainButton = (text, onClick) => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.MainButton.text = text;
    tg.MainButton.onClick(onClick);
    tg.MainButton.show();
  }
};

// Hide main button
export const hideMainButton = () => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.MainButton.hide();
  }
};

// Show back button
export const showBackButton = (onClick) => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.BackButton.onClick(onClick);
    tg.BackButton.show();
  }
};

// Hide back button
export const hideBackButton = () => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.BackButton.hide();
  }
};

// Send data to bot
export const sendDataToBot = (data) => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.sendData(JSON.stringify(data));
  }
};

// Close WebApp
export const closeTelegramWebApp = () => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.close();
  }
};

// Show confirm dialog
export const showTelegramConfirm = (message, callback) => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.showConfirm(message, callback);
  } else {
    const result = window.confirm(message);
    callback(result);
  }
};

// Show alert
export const showTelegramAlert = (message, callback) => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.showAlert(message, callback);
  } else {
    window.alert(message);
    if (callback) callback();
  }
};

// Show popup
export const showTelegramPopup = (params, callback) => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.showPopup(params, callback);
  } else {
    window.alert(params.message);
    if (callback) callback();
  }
};

// Enable closing confirmation
export const enableClosingConfirmation = () => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.enableClosingConfirmation();
  }
};

// Disable closing confirmation
export const disableClosingConfirmation = () => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.disableClosingConfirmation();
  }
};

// Haptic feedback
export const hapticFeedback = (type = 'medium') => {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    switch (type) {
      case 'light':
        tg.HapticFeedback.impactOccurred('light');
        break;
      case 'medium':
        tg.HapticFeedback.impactOccurred('medium');
        break;
      case 'heavy':
        tg.HapticFeedback.impactOccurred('heavy');
        break;
      case 'success':
        tg.HapticFeedback.notificationOccurred('success');
        break;
      case 'warning':
        tg.HapticFeedback.notificationOccurred('warning');
        break;
      case 'error':
        tg.HapticFeedback.notificationOccurred('error');
        break;
      default:
        tg.HapticFeedback.impactOccurred('medium');
    }
  }
};

// Get theme colors
export const getTelegramTheme = () => {
  const tg = getTelegramWebApp();
  if (tg) {
    return {
      bgColor: tg.backgroundColor,
      textColor: tg.themeParams.text_color,
      hintColor: tg.themeParams.hint_color,
      linkColor: tg.themeParams.link_color,
      buttonColor: tg.themeParams.button_color,
      buttonTextColor: tg.themeParams.button_text_color,
      secondaryBgColor: tg.themeParams.secondary_bg_color
    };
  }
  return null;
};

// Open link
export const openTelegramLink = (url, options = {}) => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.openLink(url, options);
  } else {
    window.open(url, '_blank');
  }
};

// Open Telegram link
export const openTgLink = (url) => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
};

// Share to Telegram story
export const shareToStory = (mediaUrl, params = {}) => {
  const tg = getTelegramWebApp();
  if (tg?.shareToStory) {
    tg.shareToStory(mediaUrl, params);
  }
};

// Get start parameter
export const getStartParam = () => {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.start_param) {
    return tg.initDataUnsafe.start_param;
  }
  return null;
};

// Check if start parameter is a referral code
export const getReferralCode = () => {
  const startParam = getStartParam();
  if (startParam && startParam.startsWith('ref_')) {
    return startParam.replace('ref_', '');
  }
  return null;
};

// Generate referral link for sharing
// botUsername should be your Telegram bot username (e.g., 'AilemBot')
export const generateReferralLink = (referralCode, botUsername = 'ailemuz_bot') => {
  // Telegram deep link format: https://t.me/BotUsername?start=ref_CODE
  return `https://t.me/${botUsername}?start=ref_${referralCode}`;
};

// Share referral link via Telegram
export const shareReferralLink = (referralCode, botUsername = 'ailemuz_bot', userName = 'someone') => {
  const referralLink = generateReferralLink(referralCode, botUsername);
  const message = `🎁 Join Ailem and start earning bonus points!\n\n👉 ${referralLink}\n\nUse my referral code: ${referralCode}`;

  const tg = getTelegramWebApp();
  if (tg) {
    // Use Telegram's native share with switchInlineQuery
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`;
    tg.openTelegramLink(shareUrl);
  } else {
    // Fallback to Web Share API
    if (navigator.share) {
      navigator.share({
        title: 'Ailem Referral',
        text: message,
        url: referralLink
      }).catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(referralLink);
      alert('Referral link copied to clipboard!');
    }
  }
};

// Platform detection
export const getPlatform = () => {
  const tg = getTelegramWebApp();
  return tg?.platform || 'unknown';
};

// Get Telegram version
export const getTelegramVersion = () => {
  const tg = getTelegramWebApp();
  return tg?.version || 'unknown';
};

// Check if feature is available
export const isFeatureAvailable = (feature) => {
  const tg = getTelegramWebApp();
  return tg?.isVersionAtLeast && tg.isVersionAtLeast(feature);
};
