// Click.uz Webhook Handler
// Handles prepare and complete requests from Click proxy
// Documentation: https://docs.click.uz/

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Click configuration
const CLICK_SERVICE_ID = process.env.CLICK_SERVICE_ID;
const CLICK_SECRET_KEY = process.env.CLICK_SECRET_KEY;

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
  console.log('🔍 deductStock called with order:', order.id || order.order_number);
  console.log('🔍 Order items:', JSON.stringify(order.items, null, 2));
  
  if (!order || !order.items || order.items.length === 0) {
    console.log('⚠️ No items found in order, skipping stock deduction');
    return;
  }

  try {
    for (const item of order.items) {
      console.log('🔍 Processing item:', JSON.stringify(item, null, 2));
      
      // Get product ID - support both 'id' and 'productId' field names
      const productId = item.id || item.productId || item.product_id;
      console.log('🔍 Resolved product ID:', productId);
      
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

    // Check for low stock and send alerts
    await checkLowStockAndAlert(order);
  } catch (error) {
    console.error('❌ Failed to deduct stock:', error);
  }
}

// Check for low stock and send alerts
async function checkLowStockAndAlert(order) {
  try {
    // Get threshold from settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('inventory')
      .eq('id', 1)
      .single();

    const threshold = settings?.inventory?.low_stock_threshold || 10;

    // Check each product in the order
    for (const item of order.items) {
      const productId = item.id || item.productId || item.product_id;
      if (!productId) continue;

      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (!product) continue;

      const hasVariants = product.variants && product.variants.length > 0;
      let currentStock = 0;

      if (hasVariants) {
        // Sum all variant stock
        currentStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      } else {
        currentStock = product.stock || 0;
      }

      // Send alert if out of stock or low stock
      if (currentStock === 0) {
        await sendLowStockAlert(product, currentStock, true);
      } else if (currentStock <= threshold) {
        await sendLowStockAlert(product, currentStock, false);
      }
    }
  } catch (error) {
    console.error('❌ Failed to check low stock:', error);
  }
}

// Send low stock alert to admin
async function sendLowStockAlert(product, stock, isOutOfStock) {
  if (!ADMIN_CHAT_ID) {
    console.log('⚠️ Admin chat ID not configured, skipping low stock alert');
    return;
  }

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

  await sendTelegramNotification(ADMIN_CHAT_ID, message);
  console.log(`📢 Low stock alert sent for: ${product.name} (${stock} units)`);
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

    // Increment total_orders count
    const { data: userData } = await supabase
      .from('users')
      .select('total_orders')
      .eq('id', userId)
      .single();

    const currentTotalOrders = userData?.total_orders || 0;
    const newTotalOrders = currentTotalOrders + 1;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        bonus_points: newBonusPoints,
        total_orders: newTotalOrders
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Failed to update bonus points and order count:', updateError);
      console.error('Update details:', { userId, currentBonus, purchaseBonusPoints, newBonusPoints, newTotalOrders });
    } else {
      console.log(`✅ Purchase bonus awarded: User ${userId} now has ${newBonusPoints} points (was ${currentBonus})`);
      console.log(`✅ Order count updated: User ${userId} now has ${newTotalOrders} orders (was ${currentTotalOrders})`);
    }
  } catch (error) {
    console.error('❌ Failed to award bonus points:', error);
  }
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { method } = req.body;

  console.log('📥 Click webhook received:', { method, body: req.body });
  console.log('🔧 Click config:', {
    serviceId: CLICK_SERVICE_ID,
    hasSecretKey: !!CLICK_SECRET_KEY
  });

  try {
    switch (method) {
      case 'prepare':
        return await handlePrepare(req.body, res);

      case 'complete':
        return await handleComplete(req.body, res);

      default:
        return res.json({
          error: -3,
          error_note: 'Action not found'
        });
    }
  } catch (error) {
    console.error('❌ Click webhook error:', error);
    return res.json({
      error: -9,
      error_note: 'Internal error'
    });
  }
}

// PREPARE: Check if transaction can be performed
async function handlePrepare(params, res) {
  const {
    click_trans_id,
    service_id,
    merchant_trans_id, // Our order ID
    amount,
    action,
    sign_time
  } = params;

  console.log('🔍 PREPARE request for order:', merchant_trans_id);

  // Verify service ID
  if (service_id.toString() !== CLICK_SERVICE_ID) {
    console.log('❌ Invalid service ID');
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -5,
      error_note: 'Service ID is invalid'
    });
  }

  // Find order by click_order_id
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('click_order_id', merchant_trans_id)
    .single();

  if (orderError || !order) {
    console.log('❌ Order not found:', merchant_trans_id);
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -5,
      error_note: `Order not found: ${merchant_trans_id}`
    });
  }

  // Validate amount (Click sends in UZS)
  const expectedAmount = Math.round(Number(order.total));
  if (Number(amount) !== expectedAmount) {
    console.log('❌ Amount mismatch:', { expected: expectedAmount, received: amount });
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -2,
      error_note: `Incorrect amount. Expected ${expectedAmount} UZS, got ${amount} UZS`
    });
  }

  // Check if order is already paid
  if (order.status === 'approved' && order.click_trans_id) {
    console.log('❌ Order already paid');
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -4,
      error_note: 'Order already paid'
    });
  }

  console.log('✅ PREPARE successful');

  // Return success
  return res.json({
    click_trans_id,
    merchant_trans_id,
    merchant_prepare_id: Date.now(), // Use timestamp as prepare ID
    error: 0,
    error_note: 'Success'
  });
}

// COMPLETE: Complete the transaction
async function handleComplete(params, res) {
  const {
    click_trans_id,
    service_id,
    click_paydoc_id, // Required in response
    merchant_trans_id, // Our order ID
    merchant_prepare_id,
    amount,
    action,
    sign_time,
    error: click_error
  } = params;

  console.log('💰 COMPLETE request for order:', merchant_trans_id);

  // Verify service ID
  if (service_id.toString() !== CLICK_SERVICE_ID) {
    console.log('❌ Invalid service ID');
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: 0,
      error: -5,
      error_note: 'Service ID is invalid'
    });
  }

  // Fetch order FIRST to get items for stock deduction
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('click_order_id', merchant_trans_id)
    .single();

  if (fetchError || !order) {
    console.error('❌ Order not found for complete:', merchant_trans_id);
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: Date.now(),
      error: -5,
      error_note: 'Order not found'
    });
  }

  const merchant_confirm_id = Date.now();
  const isApproved = !click_error || click_error >= 0;

  // Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: isApproved ? 'approved' : 'rejected',
      click_trans_id,
      click_complete_time: Date.now(),
      click_error: click_error || null
    })
    .eq('click_order_id', merchant_trans_id);

  if (updateError) {
    console.error('❌ Failed to update order:', updateError);
  }

  console.log('✅ COMPLETE successful, order updated');

  // FINAL SOLUTION: Run background tasks with minimum 2s delay for user experience
  // This ensures: tasks complete + user sees success page
  if (isApproved) {
    console.log('🔄 Running background tasks before responding...');

    const startTime = Date.now();

    // Run all tasks in parallel
    await Promise.all([
      deductStock(order).catch(e => console.error('❌ Stock deduction failed:', e)),
      awardBonusPoints(order).catch(e => console.error('❌ Bonus points failed:', e)),
      (async () => {
        const userChatId = order.user_telegram_id;
        if (userChatId && !String(userChatId).startsWith('demo-')) {
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

📦 Mahsulotlar: ${order.items?.length || 0} ta
💰 Jami: ${order.total.toLocaleString()} UZS
🚚 Yetkazib berish: ${courierName}

Buyurtmangiz tez orada yetkazib beriladi. Xarid uchun rahmat! 🛍️
          `.trim();
          await sendTelegramNotification(userChatId, notificationMessage);
        }
      })().catch(e => console.error('❌ Customer notification failed:', e)),
      (async () => {
        if (ADMIN_CHAT_ID) {
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
      })().catch(e => console.error('❌ Admin notification failed:', e))
    ]).catch(e => console.error('❌ Background tasks failed:', e));

    const elapsed = Date.now() - startTime;
    console.log(`✅ Background tasks completed in ${elapsed}ms`);

    // Ensure minimum 2 second delay so user sees success page
    if (elapsed < 2000) {
      const remaining = 2000 - elapsed;
      console.log(`⏱️ Waiting ${remaining}ms more for user experience...`);
      await new Promise(resolve => setTimeout(resolve, remaining));
    }
  }

  // Now respond to Click
  return res.json({
    click_trans_id,
    merchant_trans_id,
    merchant_confirm_id,
    merchant_prepare_id: merchant_prepare_id || 0,
    click_paydoc_id, // REQUIRED: Must return this or payment stays "Processing"
    error: 0,
    error_note: 'Success'
  });
}
