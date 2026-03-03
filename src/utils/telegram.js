// Web-native replacements for Telegram WebApp utilities
// All Telegram SDK dependencies have been removed.
// These functions maintain the same exports for backward compatibility.

export const waitForTelegramWebApp = () => Promise.resolve(null);

export const getTelegramWebApp = () => null;

export const initTelegramWebApp = async () => null;

export const getTelegramUser = () => null;

export const isInTelegram = () => false;

export const showMainButton = () => {};

export const hideMainButton = () => {};

export const showBackButton = () => {};

export const hideBackButton = () => {};

export const sendDataToBot = () => {};

export const closeTelegramWebApp = () => {};

export const showTelegramConfirm = (message, callback) => {
  const result = window.confirm(message);
  if (callback) callback(result);
};

export const showTelegramAlert = (message, callback) => {
  window.alert(message);
  if (callback) callback();
};

export const showTelegramPopup = (params, callback) => {
  window.alert(params.message);
  if (callback) callback();
};

export const enableClosingConfirmation = () => {};

export const disableClosingConfirmation = () => {};

export const hapticFeedback = () => {};

export const getTelegramTheme = () => null;

export const openTelegramLink = (url) => {
  window.open(url, '_blank');
};

export const openTgLink = (url) => {
  window.open(url, '_blank');
};

export const shareToStory = () => {};

export const getStartParam = () => null;

// Read referral code from URL query param ?ref=CODE
export const getReferralCode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || null;
};

// Generate web-based referral link
export const generateReferralLink = (referralCode) => {
  return `https://www.ailem.uz?ref=${referralCode}`;
};

// Share referral link using Web Share API with clipboard fallback
export const shareReferralLink = (referralCode, _botUsername, userName = 'someone') => {
  const referralLink = generateReferralLink(referralCode);
  const message = `🎁 Ailem do'koniga qo'shiling va bonus ball oling!\n\n👉 ${referralLink}\n\nReferral kodim: ${referralCode}`;

  if (navigator.share) {
    navigator.share({
      title: 'Ailem Referral',
      text: message,
      url: referralLink
    }).catch(err => console.error('Error sharing:', err));
  } else {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link nusxalandi!');
  }
};

export const getPlatform = () => 'web';

export const getTelegramVersion = () => 'N/A';

export const isFeatureAvailable = () => false;

export const disableVerticalSwipes = () => {};

export const enableVerticalSwipes = () => {};

export const isVerticalSwipesEnabled = () => true;
