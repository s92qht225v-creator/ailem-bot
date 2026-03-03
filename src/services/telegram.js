import { loadFromLocalStorage, saveToLocalStorage } from '../utils/helpers';

/**
 * Telegram Bot Notification Service
 * Sends notifications to users and admins via Telegram Bot API
 */

// Get bot token from environment or localStorage
const getBotToken = () => {
  // First check localStorage for bot token (set by admin)
  const storedToken = loadFromLocalStorage('telegramBotToken');
  if (storedToken) return storedToken;

  // Fallback to environment variable (if using build-time config)
  return import.meta.env.VITE_TELEGRAM_BOT_TOKEN || null;
};

// Get admin chat ID (where to send admin notifications)
const getAdminChatId = () => {
  // First check localStorage
  const storedChatId = loadFromLocalStorage('adminChatId');
  if (storedChatId) return storedChatId;

  // Fallback to environment variable
  return import.meta.env.VITE_ADMIN_CHAT_ID || null;
};

/**
 * Send message via Telegram Bot API
 */
export const sendTelegramMessage = async (chatId, message, options = {}) => {
  const botToken = getBotToken();

  if (!botToken) {
    console.warn('⚠️ Telegram bot token not configured. Skipping notification.');
    return { success: false, error: 'Bot token not configured' };
  }

  if (!chatId) {
    console.warn('⚠️ Chat ID not provided. Skipping notification.');
    return { success: false, error: 'Chat ID not provided' };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML', // Allows HTML formatting
      disable_web_page_preview: true,
      ...options
    };

    console.log('📤 Sending Telegram notification to:', chatId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.description || 'Failed to send Telegram message');
    }

    console.log('✅ Telegram notification sent successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send Telegram notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notify user about order status change
 */
export const notifyUserOrderStatus = async (order, status) => {
  const userId = order.userId;
  const userChatId = order.userTelegramId || userId; // Use Telegram ID from user

  console.log('🔍 Debug notification:', {
    orderId: order.id,
    userId: userId,
    userTelegramId: order.userTelegramId,
    userChatId: userChatId,
    orderKeys: Object.keys(order)
  });

  // Skip notification if no valid Telegram chat ID (e.g., demo users or old orders)
  const chatIdStr = String(userChatId);
  if (!userChatId || chatIdStr.startsWith('demo-') || isNaN(Number(userChatId))) {
    console.warn('⚠️ No valid Telegram chat ID for user. Skipping customer notification.');
    console.warn('Chat ID value:', userChatId, 'Type:', typeof userChatId);
    return { success: false, error: 'No valid Telegram chat ID' };
  }

  let message = '';

  switch (status) {
    case 'approved':
      if (order.deliveryInfo?.type === 'self_pickup') {
        message = `
🎉 <b>Buyurtma tasdiqlandi!</b>

Sizning <b>#${order.id}</b> raqamli buyurtmangiz tasdiqlandi!

📦 Mahsulotlar: ${order.items.length} ta
💰 Jami: ${order.total} so'm

🏪 <b>O'zi olib ketish</b>
📍 Yunusobod-19, 44 dom, Toshkent
🕐 Ish vaqti: 09:00 - 18:00
📞 +998 99 221 11 12

Buyurtmangizni do'kondan olib ketishingiz mumkin. Xarid uchun rahmat! 🛍️
        `.trim();
      } else {
        message = `
🎉 <b>Buyurtma tasdiqlandi!</b>

Sizning <b>#${order.id}</b> raqamli buyurtmangiz tasdiqlandi!

📦 Mahsulotlar: ${order.items.length} ta
💰 Jami: ${order.total} so'm
🚚 Yetkazib beruvchi: ${order.courier}

Buyurtmangiz tez orada jo'natiladi. Xarid uchun rahmat! 🛍️
        `.trim();
      }
      break;

    case 'shipped':
      message = `
📦 <b>Buyurtma jo'natildi!</b>

Sizning <b>#${order.id}</b> raqamli buyurtmangiz yo'lda!

🚚 Yetkazib beruvchi: ${order.courier}
📍 Manzil: ${order.deliveryInfo?.city || 'N/A'}

Buyurtmangizni kuzatib boring. Tez orada yetib keladi! 🚀
      `.trim();
      break;

    case 'delivered':
      message = `
✅ <b>Buyurtma yetkazildi!</b>

Sizning <b>#${order.id}</b> raqamli buyurtmangiz yetkazildi!

Xarid uchun rahmat! 🎉

💬 Iltimos, boshqalarga yordam berish uchun sharh qoldiring!
      `.trim();
      break;

    case 'rejected':
      message = `
❌ <b>Buyurtma bekor qilindi</b>

Kechirasiz, <b>#${order.id}</b> raqamli buyurtmangiz to'lov qilinmagani uchun bekor qilindi.

💰 Summa: ${order.total} so'm

Savollaringiz bo'lsa, @ailem_yordam qo'llab-quvvatlash xizmatiga murojaat qiling.
      `.trim();
      break;

    default:
      return { success: false, error: 'Unknown status' };
  }

  return await sendTelegramMessage(userChatId, message);
};

/**
 * Notify customer about their new order submission
 */
export const notifyUserNewOrder = async (order) => {
  const userId = order.userId;
  const userChatId = order.userTelegramId || userId; // Use Telegram ID from user

  // Skip notification if no valid Telegram chat ID (e.g., demo users or old orders)
  const chatIdStr = String(userChatId);
  if (!userChatId || chatIdStr.startsWith('demo-') || isNaN(Number(userChatId))) {
    console.warn('⚠️ No valid Telegram chat ID for user. Skipping customer notification.');
    return { success: false, error: 'No valid Telegram chat ID' };
  }

  const items = order.items
    .map(item => `  • ${item.productName || item.name} (x${item.quantity})`)
    .join('\n');

  const isSelfPickup = order.deliveryInfo?.type === 'self_pickup';
  const deliveryLine = isSelfPickup
    ? `🏪 <b>O'zi olib ketish:</b> Yunusobod-19, 44 dom, Toshkent`
    : `🚚 <b>Courier:</b> ${order.courier}\n📍 <b>Delivery:</b> ${order.deliveryInfo?.city || 'N/A'}`;

  const message = `
✅ <b>Buyurtma qabul qilindi!</b>

Buyurtmangiz uchun rahmat! 🎉

Buyurtma raqami: <b>#${order.id}</b>

📦 <b>Mahsulotlar:</b>
${items}

💰 <b>Jami:</b> ${order.total} so'm
${deliveryLine}

⏰ Buyurtmangiz tasdiqlanishi kutilmoqda. Tasdiqlangandan so'ng xabar beramiz!
  `.trim();

  return await sendTelegramMessage(userChatId, message);
};

/**
 * Notify admin about new order
 */
export const notifyAdminNewOrder = async (order) => {
  const adminChatId = getAdminChatId();

  if (!adminChatId) {
    console.warn('⚠️ Admin chat ID not configured. Skipping admin notification.');
    return { success: false, error: 'Admin chat ID not configured' };
  }

  const items = order.items
    .map(item => `  • ${item.productName || item.name} (x${item.quantity}) - ${item.price} so'm`)
    .join('\n');

  const isSelfPickupAdmin = order.deliveryInfo?.type === 'self_pickup';
  const deliveryLineAdmin = isSelfPickupAdmin
    ? `🏪 <b>O'zi olib ketish</b>`
    : `🚚 <b>Courier:</b> ${order.courier}\n📍 <b>Location:</b> ${order.deliveryInfo?.city || 'N/A'}`;

  const message = `
🔔 <b>Yangi buyurtma!</b>

Buyurtma raqami: <b>#${order.id}</b>
Mijoz: ${order.userName}
Telefon: ${order.userPhone}

📦 <b>Mahsulotlar:</b>
${items}

💰 <b>Jami:</b> ${order.total} so'm
${deliveryLineAdmin}

⏰ Iltimos, buyurtmani ko'rib chiqing va tasdiqlang.
  `.trim();

  return await sendTelegramMessage(adminChatId, message);
};

/**
 * Notify referrer about earning reward
 */
export const notifyReferrerReward = async (referrer, pointsEarned, totalReferrals) => {
  const referrerChatId = referrer.telegram_id;

  if (!referrerChatId) {
    console.warn('⚠️ Referrer has no Telegram ID. Skipping notification.');
    return { success: false, error: 'No Telegram ID' };
  }

  const message = `
🎁 <b>Referral Reward Earned!</b>

Someone used your referral code and placed an order!

💰 <b>You earned ${pointsEarned} bonus points</b>
📊 Total referrals: ${totalReferrals}

Keep sharing to earn more! 🚀
  `.trim();

  return await sendTelegramMessage(referrerChatId, message);
};

/**
 * Notify admin about low stock products
 */
export const notifyAdminLowStock = async (product) => {
  const adminChatId = getAdminChatId();

  if (!adminChatId) {
    console.warn('⚠️ Admin chat ID not configured. Skipping low stock notification.');
    return { success: false, error: 'Admin chat ID not configured' };
  }

  const stock = product.stock || 0;
  const isOutOfStock = stock === 0;

  const message = isOutOfStock ? `
🚨 <b>OUT OF STOCK ALERT</b>

Product: <b>${product.name}</b>
Current Stock: <b>${stock} units</b>

❌ This product is now unavailable to customers!

Please restock immediately to continue selling.
  `.trim() : `
⚠️ <b>Low Stock Alert</b>

Product: <b>${product.name}</b>
Current Stock: <b>${stock} units</b>
Status: Running low

Please consider restocking soon to avoid stockouts.
  `.trim();

  return await sendTelegramMessage(adminChatId, message);
};

/**
 * Notify admin about multiple low stock products (daily summary)
 */
export const notifyAdminLowStockSummary = async (lowStockProducts, outOfStockProducts) => {
  const adminChatId = getAdminChatId();

  if (!adminChatId) {
    console.warn('⚠️ Admin chat ID not configured. Skipping low stock summary.');
    return { success: false, error: 'Admin chat ID not configured' };
  }

  if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) {
    return { success: false, error: 'No low stock items to report' };
  }

  let message = `
📊 <b>Inventory Alert Summary</b>

`;

  if (outOfStockProducts.length > 0) {
    message += `🚨 <b>OUT OF STOCK (${outOfStockProducts.length}):</b>\n`;
    outOfStockProducts.forEach(p => {
      message += `  • ${p.name}\n`;
    });
    message += `\n`;
  }

  if (lowStockProducts.length > 0) {
    message += `⚠️ <b>LOW STOCK (${lowStockProducts.length}):</b>\n`;
    lowStockProducts.forEach(p => {
      message += `  • ${p.name} (${p.stock} left)\n`;
    });
  }

  message += `\nPlease review your inventory and restock as needed.`;

  return await sendTelegramMessage(adminChatId, message.trim());
};

/**
 * Test notification (for setup)
 */
export const sendTestNotification = async (chatId) => {
  const message = `
✅ <b>Test Notification</b>

Your Telegram bot is configured correctly!
You will receive order notifications here.

🤖 Bot is ready to send notifications.
  `.trim();

  return await sendTelegramMessage(chatId, message);
};

/**
 * Save bot configuration to localStorage
 */
export const saveBotConfig = (botToken, adminChatId) => {
  if (botToken) {
    saveToLocalStorage('telegramBotToken', botToken);
  }
  if (adminChatId) {
    saveToLocalStorage('adminChatId', adminChatId);
  }
};

/**
 * Get bot configuration
 */
export const getBotConfig = () => {
  return {
    botToken: getBotToken(),
    adminChatId: getAdminChatId(),
    isConfigured: !!getBotToken() && !!getAdminChatId()
  };
};

/**
 * Send photo via Telegram Bot API
 */
export const sendTelegramPhoto = async (chatId, photoUrl, caption, options = {}) => {
  const botToken = getBotToken();

  if (!botToken) {
    return { success: false, error: 'Bot token not configured' };
  }

  if (!chatId) {
    return { success: false, error: 'Chat ID not provided' };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

    const payload = {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
      ...options
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.description || 'Failed to send Telegram photo');
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send Telegram photo:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notify all users about a new product (image + price)
 */
export const notifyAllUsersNewProduct = async (product, users) => {
  const price = Number(product.price).toLocaleString('uz-UZ').replace(/,/g, ' ');
  const caption = `🆕 <b>Yangi mahsulot!</b>\n\n<b>${product.name}</b>\n💰 ${price} so'm`;

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const chatId = user.telegramId;
    if (!chatId || isNaN(Number(chatId))) continue;

    const result = await sendTelegramPhoto(chatId, product.image, caption);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Small delay to respect Telegram rate limits (~30 msgs/sec)
    await new Promise(r => setTimeout(r, 50));
  }

  return { sent, failed, total: users.length };
};
