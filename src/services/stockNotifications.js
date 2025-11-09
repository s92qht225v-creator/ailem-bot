// Stock Notification Service
// Sends Telegram notifications when out-of-stock products become available

import { stockNotificationsAPI } from './api';

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;

/**
 * Send Telegram message to a user
 */
async function sendTelegramMessage(chatId, message, productUrl = null) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ Telegram bot token not configured');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    };

    // Add inline button if product URL provided
    if (productUrl) {
      payload.reply_markup = {
        inline_keyboard: [[
          {
            text: '🛒 Mahsulotni ko\'rish',
            url: productUrl
          }
        ]]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`✅ Telegram notification sent to chat ${chatId}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to send Telegram notification: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Telegram notification error:', error);
    return false;
  }
}

/**
 * Notify all users waiting for a product when it's back in stock
 */
export async function notifyProductBackInStock(product, variantColor = null, variantSize = null) {
  try {
    console.log(`📢 Checking subscribers for product: ${product.name}`);

    // Get all users waiting for this product/variant
    const subscribers = await stockNotificationsAPI.getSubscribersForProduct(
      product.id,
      variantColor,
      variantSize
    );

    if (!subscribers || subscribers.length === 0) {
      console.log('ℹ️ No subscribers found for this product');
      return { success: true, notified: 0 };
    }

    console.log(`📬 Found ${subscribers.length} subscriber(s)`);

    let notifiedCount = 0;
    const notificationIds = [];

    for (const subscription of subscribers) {
      const telegramId = subscription.user?.telegram_id;

      if (!telegramId) {
        console.warn(`⚠️ No Telegram ID for user ${subscription.user_id}`);
        continue;
      }

      // Build notification message
      let message = `🎉 <b>Yaxshi yangilik!</b>\n\n`;
      message += `"${product.name}" endi omborda mavjud!\n\n`;

      if (variantColor || variantSize) {
        message += `📦 <b>Variant:</b>\n`;
        if (variantColor) message += `Rang: ${variantColor}\n`;
        if (variantSize) message += `O'lcham: ${variantSize}\n`;
        message += `\n`;
      }

      message += `💰 <b>Narx:</b> ${product.price.toLocaleString('uz-UZ')} UZS\n\n`;
      message += `⏰ Tez buyurtma bering, omborda cheklangan miqdorda!`;

      // Send notification without button (button URL was causing errors)
      const sent = await sendTelegramMessage(telegramId, message);

      if (sent) {
        notifiedCount++;
        notificationIds.push(subscription.id);
      }
    }

    // Mark all notifications as sent
    if (notificationIds.length > 0) {
      await stockNotificationsAPI.markAsNotified(notificationIds);
      console.log(`✅ Marked ${notificationIds.length} notifications as sent`);
    }

    console.log(`📊 Stock alert summary: ${notifiedCount}/${subscribers.length} users notified`);

    return {
      success: true,
      total: subscribers.length,
      notified: notifiedCount
    };
  } catch (error) {
    console.error('❌ Error sending stock notifications:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
