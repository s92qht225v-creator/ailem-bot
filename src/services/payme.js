/**
 * Payme Payment Gateway Integration
 *
 * Payme is a popular payment gateway in Uzbekistan
 * Supports payments via cards, Payme app, and HUMO cards
 *
 * Integration Methods:
 * 1. Merchant API (Server-side) - Recommended for production
 * 2. Payment Link (Simple) - Quick start
 * 3. Payme Button (Widget) - Easy integration
 */

import { loadFromLocalStorage } from '../utils/helpers';

// Get Payme credentials from environment or localStorage
const getPaymeConfig = () => {
  return {
    merchantId: import.meta.env.VITE_PAYME_MERCHANT_ID || loadFromLocalStorage('paymeMerchantId'),
    apiKey: import.meta.env.VITE_PAYME_API_KEY || loadFromLocalStorage('paymeApiKey'),
    testMode: import.meta.env.VITE_PAYME_TEST_MODE !== 'false', // Default to test mode
    returnUrl: import.meta.env.VITE_APP_URL || window.location.origin,
  };
};

/**
 * Method 1: Generate Payme Payment Link
 * This is the simplest method - creates a payment link that redirects to Payme
 *
 * @param {Object} params - Payment parameters
 * @param {string} params.orderId - Unique order ID
 * @param {number} params.amount - Amount in UZS (in tiyin: 1 UZS = 100 tiyin)
 * @param {string} params.description - Payment description
 * @param {Object} params.account - Account details
 * @param {string} params.returnUrl - Optional return URL after payment (supports :transaction and :account.* placeholders)
 * @returns {string} Payment URL
 */
export const generatePaymeLink = ({ orderId, amount, description, account = {}, returnUrl = null }) => {
  const config = getPaymeConfig();

  if (!config.merchantId) {
    throw new Error('Payme Merchant ID not configured');
  }

  // Amount must be in tiyin (1 UZS = 100 tiyin)
  const amountInTiyin = Math.round(amount * 100);

  // Build payment parameters string (semicolon-separated)
  let paramsString = `m=${config.merchantId}`;
  paramsString += `;ac.order_id=${orderId}`;
  paramsString += `;a=${amountInTiyin}`;

  // Add return URL if provided (c = callback parameter)
  if (returnUrl) {
    paramsString += `;c=${encodeURIComponent(returnUrl)}`;
    // Add 2 second delay before redirect to show Payme success screen
    paramsString += `;ct=2000`;
  }

  // Add custom account parameters
  Object.entries(account).forEach(([key, value]) => {
    if (key !== 'order_id') { // order_id already added
      paramsString += `;ac.${key}=${value}`;
    }
  });

  // Base64 encode the entire params string
  const paramsBase64 = btoa(paramsString);

  // Return full payment URL with base64 params
  const baseUrl = config.testMode
    ? 'https://checkout.test.paycom.uz'
    : 'https://checkout.paycom.uz';

  return `${baseUrl}/${paramsBase64}`;
};

/**
 * Method 2: Create Payme Invoice via API
 * This creates an invoice through Payme's Merchant API
 * Requires server-side implementation for security
 *
 * @param {Object} invoiceData - Invoice details
 * @returns {Promise<Object>} Invoice response
 */
export const createPaymeInvoice = async (invoiceData) => {
  const config = getPaymeConfig();

  if (!config.merchantId || !config.apiKey) {
    throw new Error('Payme credentials not configured');
  }

  const endpoint = config.testMode
    ? 'https://checkout.test.paycom.uz/api'
    : 'https://checkout.paycom.uz/api';

  // This should be called from your backend server for security
  // Frontend should never expose API keys
  console.warn('⚠️ Payme API should be called from backend for security!');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth': `${config.merchantId}:${config.apiKey}`,
    },
    body: JSON.stringify({
      method: 'invoices.create',
      params: invoiceData,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Failed to create invoice');
  }

  return data.result;
};

/**
 * Method 3: Initialize Payme Payment Button
 * Embeds Payme checkout directly in your page
 *
 * @param {string} containerId - Container element ID
 * @param {Object} paymentData - Payment details
 */
export const initPaymeButton = (containerId, paymentData) => {
  const config = getPaymeConfig();

  if (!config.merchantId) {
    throw new Error('Payme Merchant ID not configured');
  }

  // Load Payme checkout script
  const script = document.createElement('script');
  script.src = config.testMode
    ? 'https://checkout.test.paycom.uz/checkout.js'
    : 'https://checkout.paycom.uz/checkout.js';

  script.onload = () => {
    // Initialize Payme checkout
    if (window.PaycomCheckout) {
      window.PaycomCheckout.init({
        merchant: config.merchantId,
        amount: Math.round(paymentData.amount * 100), // Convert to tiyin
        account: {
          order_id: paymentData.orderId,
          ...paymentData.account,
        },
        lang: 'uz', // uz, ru, en
        container: containerId,
        callback: (transaction) => {
          console.log('Payment completed:', transaction);
          if (paymentData.onSuccess) {
            paymentData.onSuccess(transaction);
          }
        },
      });
    }
  };

  document.body.appendChild(script);
};

/**
 * Open Payme in Telegram WebView
 * Best method for Telegram Mini Apps - keeps user in Telegram
 */
export const openPaymeInTelegram = ({ orderId, amount, description, onSuccess, onCancel }) => {
  const paymentUrl = generatePaymeLink({ orderId, amount, description });

  // Check if running in Telegram
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;

    // Open payment URL in Telegram's in-app browser
    tg.openLink(paymentUrl, { try_instant_view: true });

    // Listen for app returning (user completed or cancelled payment)
    // Note: Telegram doesn't provide a direct callback,
    // you need to verify payment status via webhook or polling
    console.log('💳 Payment opened in Telegram browser');
    console.log('🔄 Verify payment status via webhook or polling');
  } else {
    // Fallback: open in new window
    window.open(paymentUrl, '_blank');
  }
};

/**
 * Verify Payme Payment Status
 * Check if a payment was successful
 * Should be called from backend for security
 *
 * @param {string} transactionId - Payme transaction ID
 * @returns {Promise<Object>} Transaction status
 */
export const verifyPaymePayment = async (transactionId) => {
  const config = getPaymeConfig();

  if (!config.merchantId || !config.apiKey) {
    throw new Error('Payme credentials not configured');
  }

  const endpoint = config.testMode
    ? 'https://checkout.test.paycom.uz/api'
    : 'https://checkout.paycom.uz/api';

  // This MUST be called from backend
  console.warn('⚠️ Payment verification MUST be done from backend!');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth': `${config.merchantId}:${config.apiKey}`,
    },
    body: JSON.stringify({
      method: 'invoices.check',
      params: {
        id: transactionId,
      },
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Failed to verify payment');
  }

  return data.result;
};

/**
 * Format amount for display
 * Converts tiyin to UZS
 */
export const formatPaymeAmount = (amountInTiyin) => {
  return (amountInTiyin / 100).toLocaleString('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
  });
};

/**
 * Payme webhook handler
 * Handle payment callbacks from Payme
 * MUST be implemented on backend
 */
export const handlePaymeWebhook = (webhookData) => {
  console.warn('⚠️ Payme webhooks MUST be handled on backend!');
  console.log('Webhook data:', webhookData);

  // Webhook methods from Payme:
  // - CheckPerformTransaction: Check if order exists
  // - CreateTransaction: Create transaction
  // - PerformTransaction: Complete transaction
  // - CancelTransaction: Cancel transaction
  // - CheckTransaction: Check transaction status
  // - GetStatement: Get transactions report

  return {
    error: {
      code: -32601,
      message: 'Webhooks must be handled on backend',
    },
  };
};

/**
 * Save Payme configuration
 */
export const savePaymeConfig = (config) => {
  if (config.merchantId) {
    localStorage.setItem('paymeMerchantId', config.merchantId);
  }
  if (config.apiKey) {
    localStorage.setItem('paymeApiKey', config.apiKey);
  }
  if (config.testMode !== undefined) {
    localStorage.setItem('paymeTestMode', config.testMode);
  }
};

/**
 * Get Payme test credentials
 * For development and testing
 */
export const getPaymeTestCredentials = () => {
  return {
    merchantId: 'YOUR_TEST_MERCHANT_ID',
    testCards: [
      {
        number: '8600 0000 0000 0000',
        expiry: '03/99',
        sms_code: '666666',
        description: 'Successful payment',
      },
      {
        number: '8600 0000 0000 0001',
        expiry: '03/99',
        sms_code: '666666',
        description: 'Insufficient funds',
      },
    ],
    note: 'Use these cards in test mode to simulate different scenarios',
  };
};

export default {
  generatePaymeLink,
  createPaymeInvoice,
  initPaymeButton,
  openPaymeInTelegram,
  verifyPaymePayment,
  formatPaymeAmount,
  handlePaymeWebhook,
  savePaymeConfig,
  getPaymeTestCredentials,
};
