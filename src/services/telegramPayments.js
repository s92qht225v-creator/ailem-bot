/**
 * Telegram Payments Integration
 *
 * Uses Telegram's built-in payment system with payment providers
 * Works with: Paycom.Uz, Click, and other Telegram-supported providers
 *
 * Advantages:
 * - No redirect needed - payment happens in Telegram
 * - Secure - handled by Telegram
 * - Simple integration
 * - Works perfectly with Mini Apps
 */

import { getTelegramWebApp } from '../utils/telegram';

/**
 * Create invoice and open Telegram payment form
 *
 * @param {Object} params - Invoice parameters
 * @param {string} params.title - Product title
 * @param {string} params.description - Product description
 * @param {string} params.payload - Bot-defined invoice payload (order data)
 * @param {string} params.currency - Three-letter ISO 4217 currency code (UZS)
 * @param {Array} params.prices - Price breakdown
 * @param {Object} params.providerData - JSON-serialized data about the invoice
 * @returns {Promise} Payment result
 */
export const createTelegramInvoice = async (params) => {
  const tg = getTelegramWebApp();

  if (!tg) {
    throw new Error('Telegram WebApp not available');
  }

  const {
    title,
    description,
    payload,
    currency = 'UZS',
    prices,
    providerData = {},
    photoUrl,
    needName = true,
    needPhone = true,
    needEmail = false,
    needShippingAddress = false,
  } = params;

  // Format prices for Telegram
  // Telegram expects prices in the smallest currency unit (tiyin for UZS)
  // 1 UZS = 1 tiyin for Telegram API (no decimals)
  const formattedPrices = prices.map(price => ({
    label: price.label,
    amount: Math.round(price.amount) // Amount in smallest currency unit
  }));

  // Invoice parameters for Telegram
  const invoiceParams = {
    title,
    description,
    payload, // Your internal order ID/data (max 128 bytes)
    provider_token: '', // Empty for Telegram-connected providers
    currency,
    prices: formattedPrices,
    need_name: needName,
    need_phone_number: needPhone,
    need_email: needEmail,
    need_shipping_address: needShippingAddress,
    is_flexible: false, // Set true if shipping depends on address
  };

  // Add optional parameters
  if (photoUrl) {
    invoiceParams.photo_url = photoUrl;
    invoiceParams.photo_width = 640;
    invoiceParams.photo_height = 640;
  }

  if (Object.keys(providerData).length > 0) {
    invoiceParams.provider_data = JSON.stringify(providerData);
  }

  console.log('📱 Creating invoice link...', invoiceParams);

  // Create invoice link from backend
  const invoiceUrl = await createInvoiceUrl(invoiceParams);
  
  console.log('✅ Invoice link created, opening payment form...');

  // Open payment form in Telegram
  return new Promise((resolve, reject) => {
    tg.openInvoice(
      invoiceUrl,
      (status) => {
        console.log('💳 Payment status:', status);

        if (status === 'paid') {
          resolve({
            success: true,
            status: 'paid',
            message: 'Payment successful!'
          });
        } else if (status === 'cancelled') {
          reject({
            success: false,
            status: 'cancelled',
            message: 'Payment cancelled by user'
          });
        } else if (status === 'failed') {
          reject({
            success: false,
            status: 'failed',
            message: 'Payment failed'
          });
        } else {
          reject({
            success: false,
            status: 'pending',
            message: 'Payment pending'
          });
        }
      }
    );
  });
};

/**
 * Create invoice URL from parameters
 * Calls backend API to generate invoice link from Telegram Bot API
 */
const createInvoiceUrl = async (params) => {
  try {
    const response = await fetch('/api/create-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to create invoice');
    }

    return data.invoiceLink;
  } catch (error) {
    console.error('❌ Failed to create invoice link:', error);
    throw error;
  }
};

/**
 * Simplified payment function for your app
 *
 * @param {Object} order - Order details
 * @returns {Promise} Payment result
 */
export const payWithTelegram = async (order) => {
  const {
    orderId,
    items,
    total,
    deliveryFee = 0,
    bonusDiscount = 0,
    customerName,
    customerPhone,
  } = order;

  // Build price breakdown
  // Telegram requires non-negative amounts; pass final total as a single line
  const prices = [
    { label: 'Order Total', amount: Math.round(total) }
  ];

  // Create invoice
  return await createTelegramInvoice({
    title: `Order #${orderId}`,
    description: `${items.length} item(s) from Ailem Store`,
    // Keep payload short (<128 bytes)
    payload: `order:${orderId}`,
    currency: 'UZS',
    prices,
    providerData: {
      receipt: {
        items: items.map(item => ({
          description: item.productName,
          quantity: item.quantity,
          amount: {
            value: item.price,
            currency: 'UZS'
          }
        }))
      }
    },
    photoUrl: items[0]?.image, // Use first item image
    needName: true,
    needPhone: true,
  });
};

/**
 * Handle successful payment
 * This should be called from your webhook/backend
 *
 * @param {Object} paymentData - Payment data from Telegram
 */
export const handleSuccessfulPayment = async (paymentData) => {
  console.log('✅ Payment received:', paymentData);

  // Extract order data from payload
  const payload = JSON.parse(paymentData.invoice_payload);
  const orderId = payload.orderId;

  // Payment details
  const {
    telegram_payment_charge_id,
    provider_payment_charge_id,
    total_amount,
    currency,
  } = paymentData;

  console.log('Payment details:', {
    orderId,
    amount: total_amount,
    currency,
    telegramChargeId: telegram_payment_charge_id,
    providerChargeId: provider_payment_charge_id,
  });

  // Here you would:
  // 1. Update order status in database
  // 2. Send confirmation to customer
  // 3. Notify admin
  // 4. Award bonus points

  return {
    orderId,
    paymentId: provider_payment_charge_id,
    amount: total_amount,
    currency,
    status: 'paid'
  };
};

/**
 * Create a simple test invoice
 * For testing the payment integration
 */
export const createTestInvoice = async () => {
  return await createTelegramInvoice({
    title: 'Test Payment',
    description: 'This is a test payment',
    payload: 'test-payment-' + Date.now(),
    currency: 'UZS',
    prices: [
      {
        label: 'Test Product',
        amount: 10000 // 10,000 UZS
      }
    ],
    needName: true,
    needPhone: true,
  });
};

/**
 * Check if Telegram Payments is available
 */
export const isTelegramPaymentsAvailable = () => {
  const tg = getTelegramWebApp();
  return tg && typeof tg.openInvoice === 'function';
};

/**
 * Format amount for Telegram API
 * UZS doesn't use decimals, so no conversion needed
 */
export const formatAmountForTelegram = (amount) => {
  return Math.round(amount);
};

/**
 * Format amount from Telegram API for display
 */
export const formatAmountFromTelegram = (amount) => {
  return amount;
};

export default {
  createTelegramInvoice,
  payWithTelegram,
  handleSuccessfulPayment,
  createTestInvoice,
  isTelegramPaymentsAvailable,
  formatAmountForTelegram,
  formatAmountFromTelegram,
};
