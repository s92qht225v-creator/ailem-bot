// Payme Merchant API Webhook Handler
// JSON-RPC 2.0 Protocol
// https://developer.help.paycom.uz/protokol-merchant-api

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Telegram Bot configuration
const TELEGRAM_BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.VITE_ADMIN_CHAT_ID;

// Send Telegram notification
async function sendTelegramNotification(chatId, message) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.log('⚠️ Telegram bot not configured or no chat ID');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (response.ok) {
      console.log('✅ Telegram notification sent to:', chatId);
    } else {
      console.error('❌ Failed to send Telegram notification:', await response.text());
    }
  } catch (error) {
    console.error('❌ Telegram notification error:', error);
  }
}

// Deduct stock for order items
async function deductStock(order) {
  if (!order || !order.items || order.items.length === 0) {
    console.log('⚠️ No items found in order, skipping stock deduction');
    return;
  }

  try {
    for (const item of order.items) {
      // Get product ID - support both 'id' and 'productId' field names
      const productId = item.id || item.productId;
      
      if (!productId) {
        console.error('❌ Item missing product ID:', item);
        continue;
      }

      // Fetch the product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error(`❌ Product not found for ID ${productId}:`, productError);
        continue;
      }

      // Check if product uses variant tracking
      // Support both 'color'/'size' and 'selectedColor'/'selectedSize'
      const itemColor = item.color || item.selectedColor;
      const itemSize = item.size || item.selectedSize;
      
      if (product.variants && product.variants.length > 0 && itemColor && itemSize) {
        // Deduct variant stock - support language-aware matching
        const itemColorLower = itemColor.toLowerCase();
        const itemSizeLower = itemSize.toLowerCase();
        
        const updatedVariants = product.variants.map(v => {
          // Match against both Uzbek and Russian names
          const matchesColor = (
            v.color?.toLowerCase() === itemColorLower ||
            v.color_ru?.toLowerCase() === itemColorLower
          );
          const matchesSize = (
            v.size?.toLowerCase() === itemSizeLower ||
            v.size_ru?.toLowerCase() === itemSizeLower
          );
          
          if (matchesColor && matchesSize) {
            return { ...v, stock: Math.max(0, (v.stock || 0) - item.quantity) };
          }
          return v;
        });

        const { error: updateError } = await supabase
          .from('products')
          .update({ variants: updatedVariants })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Failed to update variant stock for ${product.name}:`, updateError);
        } else {
          console.log(`📦 Deducted ${item.quantity} units from ${itemColor} • ${itemSize} variant of ${product.name}`);
        }
      } else {
        // Deduct regular stock
        const newStock = Math.max(0, (product.stock || 0) - item.quantity);
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Failed to update stock for ${product.name}:`, updateError);
        } else {
          console.log(`📦 Deducted ${item.quantity} units from ${product.name} stock (${product.stock} → ${newStock})`);
        }
      }
    }

    console.log('✅ Stock deduction completed');
  } catch (error) {
    console.error('❌ Failed to deduct stock:', error);
  }
}

// Award bonus points to user for approved order
async function awardBonusPoints(order) {
  const userId = order.user_id || order.userId;
  if (!userId) {
    console.log('⚠️ No userId found in order, skipping bonus points');
    return;
  }

  try {
    // Fetch bonus configuration from database
    // If bonus_config column doesn't exist yet, we'll use 1% as default
    let purchaseBonusPercentage = 1; // Default fallback

    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('bonus_config')
      .eq('id', 1)
      .single();

    if (settingsError) {
      console.error('❌ Failed to fetch bonus config (column may not exist yet):', settingsError);
      console.log('ℹ️ Using default 1% bonus percentage');
    } else if (settings?.bonus_config?.purchaseBonus) {
      purchaseBonusPercentage = settings.bonus_config.purchaseBonus;
      console.log(`ℹ️ Using configured bonus: ${purchaseBonusPercentage}%`);
    }
    const purchaseBonusPoints = Math.round((order.total * purchaseBonusPercentage) / 100);

    console.log(`💰 Awarding bonus: ${purchaseBonusPoints} points to user ${userId} (${purchaseBonusPercentage}% of ${order.total})`);

    // Get current user bonus points
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('bonus_points')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Failed to fetch user for bonus points:', userError);
      console.error('User ID:', userId, 'Type:', typeof userId);
      return;
    }

    if (!user) {
      console.error('❌ User not found for bonus points:', userId);
      return;
    }

    const currentBonus = user.bonus_points || 0;
    const newBonusPoints = currentBonus + purchaseBonusPoints;

    console.log(`💰 Updating bonus: ${currentBonus} + ${purchaseBonusPoints} = ${newBonusPoints}`);

    const { error: updateError } = await supabase
      .from('users')
      .update({ bonus_points: newBonusPoints })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Failed to update bonus points:', updateError);
      console.error('Update details:', { userId, currentBonus, purchaseBonusPoints, newBonusPoints });
    } else {
      console.log(`✅ Purchase bonus awarded: User ${userId} now has ${newBonusPoints} points (was ${currentBonus})`);
    }
  } catch (error) {
    console.error('❌ Failed to award bonus points:', error);
  }
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isTestMode = process.env.VITE_PAYME_TEST_MODE !== 'false';
  // Accept both test and production passwords for flexibility
  const candidateKeys = [
    process.env.PAYME_KEY,
    process.env.PAYME_TEST_KEY,
  ].filter(Boolean);

  if (process.env.PAYME_ADDITIONAL_KEYS) {
    candidateKeys.push(
      ...process.env.PAYME_ADDITIONAL_KEYS
        .split(',')
        .map(key => key.trim())
        .filter(Boolean)
    );
  }

  // Payme sends auth as: Basic base64(MerchantID:KEY)
  // But they also accept: Basic base64(Paycom:KEY)
  // We'll check both formats
  const merchantId = process.env.VITE_PAYME_MERCHANT_ID;
  const validAuthHeaders = [];

  candidateKeys.filter(Boolean).forEach(key => {
    // Format 1: Paycom:KEY (standard)
    validAuthHeaders.push(`Basic ${Buffer.from(`Paycom:${key}`).toString('base64')}`);
    // Format 2: MerchantID:KEY (alternative)
    if (merchantId) {
      validAuthHeaders.push(`Basic ${Buffer.from(`${merchantId}:${key}`).toString('base64')}`);
    }
  });

  if (!validAuthHeaders.length) {
    console.error('Payme webhook misconfiguration: PAYME_KEY / PAYME_TEST_KEY not set');
    console.error('Environment check:', {
      hasPaymeKey: !!process.env.PAYME_KEY,
      hasTestKey: !!process.env.PAYME_TEST_KEY,
      isTestMode,
      hasAdditionalKeys: !!process.env.PAYME_ADDITIONAL_KEYS
    });
    return res.json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32400,
        message: 'Payme configuration missing'
      }
    });
  }

  // Check authorization
  const authHeader = req.headers.authorization?.trim();

  console.log('=== PAYME AUTH DEBUG ===');
  console.log('Received auth:', authHeader);
  console.log('Valid auth headers:', validAuthHeaders);
  console.log('Match found:', validAuthHeaders.includes(authHeader));
  console.log('========================');

  if (!authHeader || !validAuthHeaders.includes(authHeader)) {
    console.error('Payme auth failed:', {
      receivedAuth: authHeader ? `${authHeader.substring(0, 20)}...` : 'none',
      receivedFull: authHeader,
      expectedCount: validAuthHeaders.length,
      expectedHeaders: validAuthHeaders,
      isTestMode,
      method: req.body?.method
    });
    return res.json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32504,
        message: 'Insufficient privileges to perform the operation'
      }
    });
  }

  const { method, params, id: requestId } = req.body;

  try {
    switch (method) {
      case 'CheckPerformTransaction':
        return await checkPerformTransaction(params, res, requestId);
      
      case 'CreateTransaction':
        return await createTransaction(params, res, requestId);
      
      case 'PerformTransaction':
        return await performTransaction(params, res, requestId);
      
      case 'CancelTransaction':
        return await cancelTransaction(params, res, requestId);
      
      case 'CheckTransaction':
        return await checkTransaction(params, res, requestId);
      
      default:
        return res.json({
          jsonrpc: '2.0',
          id: requestId,
          error: {
            code: -32601,
            message: 'Method not found'
          }
        });
    }
  } catch (error) {
    console.error('Payme webhook error:', error);
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32400,
        message: error.message
      }
    });
  }
}

// Check if order exists and can be paid
async function checkPerformTransaction(params, res, requestId) {
  const { account, amount } = params;
  const paymeOrderId = String(account.order_id);

  // Look up order by Payme order ID stored in delivery_info.payme_order_id
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('payme_order_id', paymeOrderId)
    .single();

  if (orderError || !order) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -31050,
        message: `Order not found for Payme ID: ${paymeOrderId}`
      }
    });
  }

  // Validate amount matches order total (in tiyin)
  const expectedAmount = Math.round(Number(order.total) * 100);
  if (Number(amount) !== expectedAmount) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -31001,
        message: `Incorrect amount. Expected ${expectedAmount} tiyin, got ${amount} tiyin`
      }
    });
  }

  // Check if order is already paid
  if (order.status === 'approved' && order.payme_transaction_id) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -31051,
        message: 'Order already paid'
      }
    });
  }

  return res.json({
    jsonrpc: '2.0',
    id: requestId,
    result: {
      allow: true
    }
  });
}

// Create transaction
async function createTransaction(params, res, requestId) {
  const { id, time, account } = params;
  const paymeOrderId = String(account.order_id);

  // Check if transaction already exists for this order
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('*')
    .eq('payme_transaction_id', id)
    .eq('payme_order_id', paymeOrderId)
    .maybeSingle();

  if (existingOrder) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      result: {
        create_time: existingOrder.payme_create_time || time,
        transaction: id,
        state: existingOrder.payme_state || 1
      }
    });
  }

  // Find order by Payme order ID
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('payme_order_id', paymeOrderId)
    .single();
  
  if (orderError || !order) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -31050,
        message: 'Order not found'
      }
    });
  }
  
  // Save transaction info to order
  const { data, error } = await supabase
    .from('orders')
    .update({
      payme_transaction_id: id,
      payme_create_time: time,
      payme_state: 1
    })
    .eq('id', order.id)
    .select()
    .single();
  
  if (error || !data) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -31003,
        message: 'Failed to create transaction'
      }
    });
  }
  
  return res.json({
    jsonrpc: '2.0',
    id: requestId,
    result: {
      create_time: time,
      transaction: id,
      state: 1
    }
  });
}

// Perform (complete) transaction
async function performTransaction(params, res, requestId) {
  const { id } = params;
  const performTime = Date.now();

  // Find order by transaction ID
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('payme_transaction_id', id)
    .single();

  if (!order) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -31003,
        message: 'Transaction not found'
      }
    });
  }

  // Update order: approve and mark as completed
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'approved',
      payme_perform_time: performTime,
      payme_state: 2
    })
    .eq('payme_transaction_id', id);

  if (error) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -31008,
        message: 'Failed to perform transaction'
      }
    });
  }

  // Deduct stock and award bonus points BEFORE sending response (critical!)
  // In serverless functions, code after res.json() may not execute
  try {
    await deductStock(order);
    console.log('✅ Stock deducted successfully');
  } catch (stockError) {
    console.error('❌ Failed to deduct stock:', stockError);
    // Continue anyway - don't fail the transaction
  }

  try {
    await awardBonusPoints(order);
    console.log('✅ Bonus points awarded successfully');
  } catch (bonusError) {
    console.error('❌ Failed to award bonus points:', bonusError);
    // Continue anyway - don't fail the transaction
  }

  // Send Telegram notification to customer
  try {
    const userChatId = order.user_telegram_id;
    if (userChatId && !String(userChatId).startsWith('demo-')) {
      const items = order.items?.length || 0;
      // Extract courier name if it's an object or JSON string
      let courierName = 'Yetkazib berish';
      if (order.courier) {
        if (typeof order.courier === 'string') {
          try {
            const parsed = JSON.parse(order.courier);
            courierName = parsed.name || order.courier;
          } catch {
            courierName = order.courier;
          }
        } else if (typeof order.courier === 'object') {
          courierName = order.courier?.name || 'Yetkazib berish';
        }
      }

      const notificationMessage = `
🎉 <b>To'lov muvaffaqiyatli!</b>

Sizning buyurtmangiz <b>#${order.order_number || order.id}</b> tasdiqlandi!

📦 Mahsulotlar: ${items} ta
💰 Jami: ${order.total.toLocaleString()} UZS
🚚 Yetkazib berish: ${courierName}

Buyurtmangiz tez orada yetkazib beriladi. Xarid uchun rahmat! 🛍️
      `.trim();

      await sendTelegramNotification(userChatId, notificationMessage);
    }
  } catch (notifError) {
    console.error('❌ Failed to send notification:', notifError);
    // Continue anyway - don't fail the transaction
  }

  // Send Telegram notification to admin
  try {
    if (ADMIN_CHAT_ID) {
      // Extract courier name if it's an object or JSON string
      let courierName = 'Yetkazib berish';
      if (order.courier) {
        if (typeof order.courier === 'string') {
          try {
            const parsed = JSON.parse(order.courier);
            courierName = parsed.name || order.courier;
          } catch {
            courierName = order.courier;
          }
        } else if (typeof order.courier === 'object') {
          courierName = order.courier?.name || 'Yetkazib berish';
        }
      }

      const itemsList = order.items && order.items.length > 0
        ? order.items.map(item => {
            const itemName = item.productName || item.name || 'Mahsulot';
            const itemPrice = (item.price || 0).toLocaleString();
            return `  • ${itemName} (x${item.quantity}) - ${itemPrice} UZS`;
          }).join('\n')
        : '  • Mahsulotlar mavjud emas';

      const adminMessage = `
🔔 <b>Yangi buyurtma to'lovi!</b>

Buyurtma: <b>#${order.order_number || order.id}</b>
Mijoz: ${order.user_name || 'Noma\'lum'}
Telefon: ${order.user_phone || 'Noma\'lum'}

📦 <b>Mahsulotlar:</b>
${itemsList}

💰 <b>Jami:</b> ${order.total.toLocaleString()} UZS
🚚 <b>Yetkazib berish:</b> ${courierName}
📍 <b>Manzil:</b> ${order.delivery_info?.city || order.delivery_info?.address || 'Noma\'lum'}

✅ To'lov tasdiqlandi. Buyurtmani yetkazib bering.
      `.trim();

      await sendTelegramNotification(ADMIN_CHAT_ID, adminMessage);
    }
  } catch (adminNotifError) {
    console.error('❌ Failed to send admin notification:', adminNotifError);
    // Continue anyway - don't fail the transaction
  }

  // Send response to Payme
  return res.json({
    jsonrpc: '2.0',
    id: requestId,
    result: {
      transaction: id,
      perform_time: performTime,
      state: 2
    }
  });
}

// Cancel transaction
async function cancelTransaction(params, res, requestId) {
  const { id, reason } = params;
  const cancelTime = Date.now();

  // Get order before cancelling
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('payme_transaction_id', id)
    .single();

  // Cancel order
  await supabase
    .from('orders')
    .update({
      status: 'rejected',
      payme_cancel_time: cancelTime,
      payme_state: -1,
      payme_cancel_reason: reason
    })
    .eq('payme_transaction_id', id);

  return res.json({
    jsonrpc: '2.0',
    id: requestId,
    result: {
      transaction: id,
      cancel_time: cancelTime,
      state: -1
    }
  });
}

// Check transaction status
async function checkTransaction(params, res, requestId) {
  const { id } = params;

  // Look up transaction in database
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('payme_transaction_id', id)
    .single();

  if (!order) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -31003,
        message: 'Transaction not found'
      }
    });
  }

  return res.json({
    jsonrpc: '2.0',
    id: requestId,
    result: {
      create_time: order.payme_create_time || 0,
      perform_time: order.payme_perform_time || 0,
      cancel_time: order.payme_cancel_time || 0,
      transaction: id,
      state: order.payme_state || 1,
      reason: order.payme_cancel_reason || null
    }
  });
}
