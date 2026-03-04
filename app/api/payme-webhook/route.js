// Payme Merchant API Webhook Handler
// JSON-RPC 2.0 Protocol
// https://developer.help.paycom.uz/protokol-merchant-api

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-init to avoid build-time errors when env vars aren't available
let _supabase;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _supabase;
}

function getTelegramConfig() {
  return {
    botToken: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN,
    adminChatId: process.env.NEXT_PUBLIC_ADMIN_CHAT_ID,
  };
}

// Send Telegram notification
async function sendTelegramNotification(chatId, message) {
  const { botToken: TELEGRAM_BOT_TOKEN } = getTelegramConfig();
  if (!TELEGRAM_BOT_TOKEN || !chatId) return;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  } catch (error) {
    console.error('Telegram notification error:', error);
  }
}

// Deduct stock for order items
async function deductStock(order) {
  if (!order || !order.items || order.items.length === 0) return;

  try {
    for (const item of order.items) {
      const productId = item.id || item.productId || item.product_id;
      if (!productId) continue;

      const { data: product, error: productError } = await getSupabase()
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) continue;

      const itemColor = item.color || item.selectedColor;
      const itemSize = item.size || item.selectedSize;

      if (product.variants && product.variants.length > 0 && itemColor && itemSize) {
        const itemColorLower = itemColor.toLowerCase();
        const itemSizeLower = itemSize.toLowerCase();

        const updatedVariants = product.variants.map((v) => {
          const matchesColor =
            v.color?.toLowerCase() === itemColorLower ||
            v.color_ru?.toLowerCase() === itemColorLower;
          const matchesSize =
            v.size?.toLowerCase() === itemSizeLower ||
            v.size_ru?.toLowerCase() === itemSizeLower;

          if (matchesColor && matchesSize) {
            return { ...v, stock: Math.max(0, (v.stock || 0) - item.quantity) };
          }
          return v;
        });

        await getSupabase().from('products').update({ variants: updatedVariants }).eq('id', product.id);
      } else {
        const newStock = Math.max(0, (product.stock || 0) - item.quantity);
        await getSupabase().from('products').update({ stock: newStock }).eq('id', product.id);
      }
    }

    await checkLowStockAndAlert(order);
  } catch (error) {
    console.error('Failed to deduct stock:', error);
  }
}

async function checkLowStockAndAlert(order) {
  try {
    const { data: settings } = await getSupabase()
      .from('app_settings')
      .select('inventory')
      .eq('id', 1)
      .single();

    const threshold = settings?.inventory?.low_stock_threshold || 10;

    for (const item of order.items) {
      const { data: product } = await getSupabase()
        .from('products')
        .select('*')
        .eq('id', item.productId)
        .single();

      if (!product) continue;

      const hasVariants = product.variants && product.variants.length > 0;
      const currentStock = hasVariants
        ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
        : product.stock || 0;

      if (currentStock === 0) {
        await sendLowStockAlert(product, currentStock, true);
      } else if (currentStock <= threshold) {
        await sendLowStockAlert(product, currentStock, false);
      }
    }
  } catch (error) {
    console.error('Failed to check low stock:', error);
  }
}

async function sendLowStockAlert(product, stock, isOutOfStock) {
  const { adminChatId: ADMIN_CHAT_ID } = getTelegramConfig();
  if (!ADMIN_CHAT_ID) return;

  const message = isOutOfStock
    ? `🚨 <b>OUT OF STOCK ALERT</b>\n\nProduct: <b>${product.name}</b>\nCurrent Stock: <b>${stock} units</b>\n\n❌ This product is now unavailable to customers!\n\nPlease restock immediately to continue selling.`
    : `⚠️ <b>Low Stock Alert</b>\n\nProduct: <b>${product.name}</b>\nCurrent Stock: <b>${stock} units</b>\nStatus: Running low\n\nPlease consider restocking soon to avoid stockouts.`;

  await sendTelegramNotification(ADMIN_CHAT_ID, message);
}

async function awardBonusPoints(order) {
  const userId = order.user_id || order.userId;
  if (!userId) return;

  try {
    let purchaseBonusPercentage = 1;

    const { data: settings, error: settingsError } = await getSupabase()
      .from('app_settings')
      .select('bonus_config')
      .eq('id', 1)
      .single();

    if (!settingsError && settings?.bonus_config?.purchaseBonus) {
      purchaseBonusPercentage = settings.bonus_config.purchaseBonus;
    }

    const bonusBase = order.subtotal || order.total;
    const purchaseBonusPoints = Math.round((bonusBase * purchaseBonusPercentage) / 100);

    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .select('bonus_points, total_orders')
      .eq('id', userId)
      .single();

    if (userError || !user) return;

    const newBonusPoints = (user.bonus_points || 0) + purchaseBonusPoints;
    const newTotalOrders = (user.total_orders || 0) + 1;

    await getSupabase()
      .from('users')
      .update({ bonus_points: newBonusPoints, total_orders: newTotalOrders })
      .eq('id', userId);
  } catch (error) {
    console.error('Failed to award bonus points:', error);
  }
}

function getCourierName(order) {
  if (!order.courier) return 'Yetkazib berish';
  if (typeof order.courier === 'string') {
    try {
      return JSON.parse(order.courier).name || order.courier;
    } catch {
      return order.courier;
    }
  }
  return order.courier?.name || 'Yetkazib berish';
}

export async function POST(request) {
  const isTestMode = process.env.NEXT_PUBLIC_PAYME_TEST_MODE !== 'false';
  const candidateKeys = [process.env.PAYME_KEY, process.env.PAYME_TEST_KEY].filter(Boolean);

  if (process.env.PAYME_ADDITIONAL_KEYS) {
    candidateKeys.push(
      ...process.env.PAYME_ADDITIONAL_KEYS.split(',')
        .map((key) => key.trim())
        .filter(Boolean)
    );
  }

  const merchantId = process.env.NEXT_PUBLIC_PAYME_MERCHANT_ID;
  const validAuthHeaders = [];

  candidateKeys.forEach((key) => {
    validAuthHeaders.push(`Basic ${Buffer.from(`Paycom:${key}`).toString('base64')}`);
    if (merchantId) {
      validAuthHeaders.push(`Basic ${Buffer.from(`${merchantId}:${key}`).toString('base64')}`);
    }
  });

  const body = await request.json();

  if (!validAuthHeaders.length) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: body?.id || null,
      error: { code: -32400, message: 'Payme configuration missing' },
    });
  }

  const authHeader = request.headers.get('authorization')?.trim();

  if (!authHeader || !validAuthHeaders.includes(authHeader)) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: body?.id || null,
      error: { code: -32504, message: 'Insufficient privileges to perform the operation' },
    });
  }

  const { method, params, id: requestId } = body;

  try {
    switch (method) {
      case 'CheckPerformTransaction':
        return await checkPerformTransaction(params, requestId);
      case 'CreateTransaction':
        return await createTransaction(params, requestId);
      case 'PerformTransaction':
        return await performTransaction(params, requestId);
      case 'CancelTransaction':
        return await cancelTransaction(params, requestId);
      case 'CheckTransaction':
        return await checkTransaction(params, requestId);
      default:
        return NextResponse.json({
          jsonrpc: '2.0',
          id: requestId,
          error: { code: -32601, message: 'Method not found' },
        });
    }
  } catch (error) {
    console.error('Payme webhook error:', error);
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -32400, message: error.message },
    });
  }
}

async function checkPerformTransaction(params, requestId) {
  const { account, amount } = params;
  const paymeOrderId = String(account.order_id);

  const { data: order, error: orderError } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('payme_order_id', paymeOrderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -31050, message: `Order not found for Payme ID: ${paymeOrderId}` },
    });
  }

  const expectedAmount = Math.round(Number(order.total) * 100);
  if (Number(amount) !== expectedAmount) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -31001, message: `Incorrect amount. Expected ${expectedAmount} tiyin, got ${amount} tiyin` },
    });
  }

  if (order.status === 'approved' && order.payme_transaction_id) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -31051, message: 'Order already paid' },
    });
  }

  return NextResponse.json({ jsonrpc: '2.0', id: requestId, result: { allow: true } });
}

async function createTransaction(params, requestId) {
  const { id, time, account } = params;
  const paymeOrderId = String(account.order_id);

  const { data: existingOrder } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('payme_transaction_id', id)
    .eq('payme_order_id', paymeOrderId)
    .maybeSingle();

  if (existingOrder) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      result: { create_time: existingOrder.payme_create_time || time, transaction: id, state: existingOrder.payme_state || 1 },
    });
  }

  const { data: order, error: orderError } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('payme_order_id', paymeOrderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -31050, message: 'Order not found' },
    });
  }

  const { data, error } = await getSupabase()
    .from('orders')
    .update({ payme_transaction_id: id, payme_create_time: time, payme_state: 1 })
    .eq('id', order.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -31003, message: 'Failed to create transaction' },
    });
  }

  return NextResponse.json({
    jsonrpc: '2.0',
    id: requestId,
    result: { create_time: time, transaction: id, state: 1 },
  });
}

async function performTransaction(params, requestId) {
  const { id } = params;
  const performTime = Date.now();

  const { data: order } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('payme_transaction_id', id)
    .single();

  if (!order) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -31003, message: 'Transaction not found' },
    });
  }

  const { error } = await getSupabase()
    .from('orders')
    .update({ status: 'approved', payme_perform_time: performTime, payme_state: 2 })
    .eq('payme_transaction_id', id);

  if (error) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -31008, message: 'Failed to perform transaction' },
    });
  }

  const startTime = Date.now();
  const courierName = getCourierName(order);

  await Promise.all([
    deductStock(order).catch((e) => console.error('Stock deduction failed:', e)),
    awardBonusPoints(order).catch((e) => console.error('Bonus points failed:', e)),
    (async () => {
      const userChatId = order.user_telegram_id;
      if (userChatId && !String(userChatId).startsWith('demo-')) {
        const msg = `🎉 <b>To'lov muvaffaqiyatli!</b>\n\nSizning buyurtmangiz <b>#${order.order_number || order.id}</b> tasdiqlandi!\n\n📦 Mahsulotlar: ${order.items?.length || 0} ta\n💰 Jami: ${order.total.toLocaleString()} UZS\n🚚 Yetkazib berish: ${courierName}\n\nBuyurtmangiz tez orada yetkazib beriladi. Xarid uchun rahmat! 🛍️`;
        await sendTelegramNotification(userChatId, msg);
      }
    })().catch((e) => console.error('Customer notification failed:', e)),
    (async () => {
      const { adminChatId: ADMIN_CHAT_ID } = getTelegramConfig();
      if (ADMIN_CHAT_ID) {
        const itemsList =
          order.items && order.items.length > 0
            ? order.items
                .map((item) => {
                  const itemName = item.productName || item.name || 'Mahsulot';
                  const itemPrice = (item.price || 0).toLocaleString();
                  return `  • ${itemName} (x${item.quantity}) - ${itemPrice} UZS`;
                })
                .join('\n')
            : '  • Mahsulotlar mavjud emas';
        const adminMessage = `🔔 <b>Yangi buyurtma to'lovi!</b>\n\nBuyurtma: <b>#${order.order_number || order.id}</b>\nMijoz: ${order.user_name || "Noma'lum"}\nTelefon: ${order.user_phone || "Noma'lum"}\n\n📦 <b>Mahsulotlar:</b>\n${itemsList}\n\n💰 <b>Jami:</b> ${order.total.toLocaleString()} UZS\n🚚 <b>Yetkazib berish:</b> ${courierName}\n📍 <b>Manzil:</b> ${order.delivery_info?.city || order.delivery_info?.address || "Noma'lum"}\n\n✅ To'lov tasdiqlandi. Buyurtmani yetkazib bering.`;
        await sendTelegramNotification(ADMIN_CHAT_ID, adminMessage);
      }
    })().catch((e) => console.error('Admin notification failed:', e)),
  ]).catch((e) => console.error('Background tasks failed:', e));

  const elapsed = Date.now() - startTime;
  if (elapsed < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
  }

  return NextResponse.json({
    jsonrpc: '2.0',
    id: requestId,
    result: { transaction: id, perform_time: performTime, state: 2 },
  });
}

async function cancelTransaction(params, requestId) {
  const { id, reason } = params;
  const cancelTime = Date.now();

  await getSupabase()
    .from('orders')
    .update({ status: 'rejected', payme_cancel_time: cancelTime, payme_state: -1, payme_cancel_reason: reason })
    .eq('payme_transaction_id', id);

  return NextResponse.json({
    jsonrpc: '2.0',
    id: requestId,
    result: { transaction: id, cancel_time: cancelTime, state: -1 },
  });
}

async function checkTransaction(params, requestId) {
  const { id } = params;

  const { data: order } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('payme_transaction_id', id)
    .single();

  if (!order) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -31003, message: 'Transaction not found' },
    });
  }

  return NextResponse.json({
    jsonrpc: '2.0',
    id: requestId,
    result: {
      create_time: order.payme_create_time || 0,
      perform_time: order.payme_perform_time || 0,
      cancel_time: order.payme_cancel_time || 0,
      transaction: id,
      state: order.payme_state || 1,
      reason: order.payme_cancel_reason || null,
    },
  });
}
