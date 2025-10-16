// Safe localStorage wrapper for Telegram Desktop compatibility
// Telegram Desktop disables localStorage in WebView, causing DOMException
const safeLocalStorage = (() => {
  try {
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return window.localStorage;
  } catch {
    console.warn('⚠️ localStorage not available (Telegram Desktop), using in-memory fallback');
    // In-memory fallback for Telegram Desktop
    const storage = {};
    return {
      getItem: (key) => storage[key] || null,
      setItem: (key, value) => { storage[key] = value; },
      removeItem: (key) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(key => delete storage[key]); }
    };
  }
})();

// Format price to display with currency (UZS - Uzbek Som)
export const formatPrice = (price) => {
  return `${Math.round(price).toLocaleString()} UZS`;
};

// Calculate discount percentage
export const calculateDiscountPercentage = (originalPrice, currentPrice) => {
  if (!originalPrice || originalPrice <= currentPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
};

// Calculate discounted price
export const calculateDiscountedPrice = (price, discountPercentage) => {
  if (!discountPercentage || discountPercentage <= 0) return price;
  return price - (price * (discountPercentage / 100));
};

// Generate unique order number
export const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

// Generate unique referral code
export const generateReferralCode = (userName) => {
  const cleanName = userName.replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${random}`;
};

// Calculate time remaining for countdown
export const calculateTimeRemaining = (endDate) => {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const difference = end - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
    expired: false
  };
};

// Format date to readable string
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Calculate bonus points earned based on configured percentage
// Bonus points = percentage of order total (e.g., 10% of 50,000 = 5,000 bonus points)
export const calculateBonusPoints = (amount) => {
  // Get configured bonus percentage from localStorage
  const bonusConfig = JSON.parse(safeLocalStorage.getItem('bonusConfig') || '{"purchaseBonus": 10}');
  const bonusPercentage = bonusConfig.purchaseBonus || 10;

  // Calculate bonus as percentage of order total
  // Example: 50,000 UZS order with 10% bonus = 5,000 bonus points
  const bonusPoints = Math.round((amount * bonusPercentage) / 100);

  console.log(`💰 Bonus calculation: ${amount} UZS × ${bonusPercentage}% = ${bonusPoints} bonus points`);

  return bonusPoints;
};

// Calculate max bonus points that can be used (20% of order)
export const calculateMaxBonusUsage = (orderTotal) => {
  // Get configured point value from localStorage
  const bonusConfig = JSON.parse(safeLocalStorage.getItem('bonusConfig') || '{"pointValue": 1000}');
  const pointValue = bonusConfig.pointValue || 1000;

  const maxDiscount = orderTotal * 0.2; // 20% of order
  return Math.floor(maxDiscount / pointValue); // Convert currency to points
};

// Convert bonus points to currency value
export const bonusPointsToDollars = (points) => {
  // Get configured point value from localStorage
  const bonusConfig = JSON.parse(safeLocalStorage.getItem('bonusConfig') || '{"pointValue": 1000}');
  const pointValue = bonusConfig.pointValue || 1000;

  return points * pointValue;
};

// Save to localStorage
export const saveToLocalStorage = (key, data) => {
  try {
    safeLocalStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Load from localStorage
export const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = safeLocalStorage.getItem(key);
    if (item === null || item === undefined || item === '') {
      return defaultValue;
    }

    try {
      return JSON.parse(item);
    } catch {
      // Value was stored without JSON.stringify, return as-is
      return item;
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

// Remove from localStorage
export const removeFromLocalStorage = (key) => {
  try {
    safeLocalStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// Validate email
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate phone number
export const validatePhone = (phone) => {
  const re = /^\+?[\d\s\-()]+$/;
  return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

// Get status badge color
export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-warning text-white',
    approved: 'bg-success text-white',
    rejected: 'bg-error text-white',
    shipped: 'bg-accent text-white',
    delivered: 'bg-primary text-white'
  };
  return colors[status.toLowerCase()] || 'bg-gray-500 text-white';
};

// Debounce function for search
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        textArea.remove();
        return true;
      } catch (error) {
        console.error('Fallback copy failed:', error);
        textArea.remove();
        return false;
      }
    }
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

// Truncate text
export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
