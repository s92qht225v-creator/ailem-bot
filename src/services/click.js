/**
 * Click.uz Payment Gateway Integration
 *
 * Click is a popular payment gateway in Uzbekistan
 * Supports payments via Uzcard, Humo, and Visa/Mastercard
 *
 * Official Documentation: https://docs.click.uz/
 */

import { loadFromLocalStorage } from '../utils/helpers';

// Get Click credentials from environment or localStorage
const getClickConfig = () => {
  // Use production URL for Telegram Mini App
  const appUrl = import.meta.env.VITE_APP_URL || 'https://www.ailem.uz';
  
  return {
    merchantId: import.meta.env.VITE_CLICK_MERCHANT_ID || loadFromLocalStorage('clickMerchantId'),
    serviceId: import.meta.env.VITE_CLICK_SERVICE_ID || loadFromLocalStorage('clickServiceId'),
    secretKey: import.meta.env.VITE_CLICK_SECRET_KEY || loadFromLocalStorage('clickSecretKey'),
    testMode: import.meta.env.VITE_CLICK_TEST_MODE !== 'false', // Default to test mode
    returnUrl: appUrl,
  };
};

/**
 * Generate Click Payment Link
 * Creates a payment link that redirects to Click.uz checkout
 *
 * @param {Object} params - Payment parameters
 * @param {string} params.orderId - Unique order ID (merchant_trans_id)
 * @param {number} params.amount - Amount in UZS
 * @param {string} params.description - Payment description (optional)
 * @returns {string} Payment URL
 */
export const generateClickLink = ({ orderId, amount, description = '' }) => {
  const config = getClickConfig();

  if (!config.merchantId || !config.serviceId) {
    throw new Error('Click Merchant ID or Service ID not configured');
  }

  // Click expects amount in UZS (not tiyin like Payme)
  const amountInUZS = Math.round(amount);

  // Build payment URL parameters
  const params = new URLSearchParams({
    service_id: config.serviceId,
    merchant_id: config.merchantId,
    amount: amountInUZS,
    transaction_param: orderId, // Your order ID (merchant_trans_id)
    return_url: `${config.returnUrl}/#/profile`,
  });

  // merchant_trans_id is same as transaction_param
  if (description) {
    params.append('merchant_trans_id', orderId);
  }

  // Return full payment URL
  const baseUrl = config.testMode
    ? 'https://my.click.uz/services/pay'
    : 'https://my.click.uz/services/pay';

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Open Click Payment in Telegram WebView
 * Best method for Telegram Mini Apps - keeps user in Telegram
 *
 * @param {Object} params - Payment parameters
 * @param {string} params.orderId - Order ID
 * @param {number} params.amount - Amount in UZS
 * @param {string} params.description - Payment description
 * @param {Function} params.onSuccess - Success callback
 * @param {Function} params.onCancel - Cancel callback
 */
export const openClickInTelegram = ({ orderId, amount, description, onSuccess, onCancel }) => {
  const paymentUrl = generateClickLink({ orderId, amount, description });

  console.log('💳 Opening Click payment:', {
    orderId,
    amount,
    url: paymentUrl
  });

  // Check if running in Telegram
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;

    // Open payment URL in Telegram's in-app browser
    tg.openLink(paymentUrl);

    console.log('✅ Click payment opened in Telegram browser');
    console.log('⏳ Waiting for webhook confirmation...');
  } else {
    // Fallback: redirect in current window
    window.location.href = paymentUrl;
  }
};

/**
 * Verify Click Payment Status
 * This should be done via webhook, not frontend
 *
 * @param {string} transactionId - Click transaction ID
 * @returns {Promise<boolean>} Payment status
 */
export const verifyClickPayment = async (transactionId) => {
  console.warn('⚠️ Payment verification MUST be done via webhook!');
  console.log('Transaction ID:', transactionId);

  // Frontend cannot verify payments securely
  // The webhook will handle verification
  return false;
};

/**
 * Format amount for display
 * Click uses UZS directly (not tiyin)
 */
export const formatClickAmount = (amountInUZS) => {
  return amountInUZS.toLocaleString('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
  });
};

/**
 * Save Click configuration
 */
export const saveClickConfig = (config) => {
  if (config.merchantId) {
    localStorage.setItem('clickMerchantId', config.merchantId);
  }
  if (config.serviceId) {
    localStorage.setItem('clickServiceId', config.serviceId);
  }
  if (config.secretKey) {
    localStorage.setItem('clickSecretKey', config.secretKey);
  }
  if (config.testMode !== undefined) {
    localStorage.setItem('clickTestMode', config.testMode.toString());
  }
};

/**
 * Get Click test credentials
 * For development and testing
 */
export const getClickTestCredentials = () => {
  return {
    merchantId: 'YOUR_TEST_MERCHANT_ID',
    serviceId: 'YOUR_TEST_SERVICE_ID',
    testCards: [
      {
        number: '8600 1234 5678 9012',
        expiry: '03/99',
        sms_code: '666666',
        description: 'Successful payment',
      },
      {
        number: '8600 1234 5678 9013',
        expiry: '03/99',
        sms_code: '666666',
        description: 'Insufficient funds',
      },
    ],
    note: 'Use these cards in test mode to simulate different scenarios',
  };
};

/**
 * Click Error Codes
 * Reference for webhook responses
 */
export const CLICK_ERROR_CODES = {
  SUCCESS: 0,
  SIGN_CHECK_FAILED: -1,
  INVALID_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  USER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  BAD_REQUEST: -8,
  TRANSACTION_CANCELLED: -9,
};

/**
 * Click Transaction Actions
 */
export const CLICK_ACTIONS = {
  PREPARE: 0,
  COMPLETE: 1,
};

export default {
  generateClickLink,
  openClickInTelegram,
  verifyClickPayment,
  formatClickAmount,
  saveClickConfig,
  getClickTestCredentials,
  CLICK_ERROR_CODES,
  CLICK_ACTIONS,
};
