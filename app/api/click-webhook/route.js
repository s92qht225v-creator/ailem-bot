// Click.uz Webhook Handler
// Handles prepare and complete requests from Click proxy

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

function getClickServiceId() {
  return process.env.CLICK_SERVICE_ID;
}

function getTelegramConfig() {
  return {
    botToken: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN,
    adminChatId: process.env.NEXT_PUBLIC_ADMIN_CHAT_ID,
  };
}

async function sendTelegramNotification(chatId, message) {
  const { botToken } = getTelegramConfig();
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  } catch (error) {
    console.error('Telegram notification error:', error);
  }
}

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
          const matchesColor = v.color?.toLowerCase() === itemColorLower || v.color_ru?.toLowerCase() === itemColorLower;
          const matchesSize = v.size?.toLowerCase() === itemSizeLower || v.size_ru?.toLowerCase() === itemSizeLower;
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
      const productId = item.id || item.productId || item.product_id;
      if (!productId) continue;

      const { data: product } = await getSupabase().from('products').select('*').eq('id', productId).single();
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
  const { adminChatId } = getTelegramConfig();
  if (!adminChatId) return;
  const message = isOutOfStock
    ? `🚨 <b>OUT OF STOCK ALERT</b>\n\nProduct: <b>${product.name}</b>\nCurrent Stock: <b>${stock} units</b>\n\n❌ This product is now unavailable to customers!`
    : `⚠️ <b>Low Stock Alert</b>\n\nProduct: <b>${product.name}</b>\nCurrent Stock: <b>${stock} units</b>\nStatus: Running low`;
  await sendTelegramNotification(adminChatId, message);
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

    const purchaseBonusPoints = Math.round((order.total * purchaseBonusPercentage) / 100);
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .select('bonus_points, total_orders')
      .eq('id', userId)
      .single();

    if (userError || !user) return;

    await getSupabase()
      .from('users')
      .update({
        bonus_points: (user.bonus_points || 0) + purchaseBonusPoints,
        total_orders: (user.total_orders || 0) + 1,
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Failed to award bonus points:', error);
  }
}

function getCourierName(order) {
  if (!order.courier) return 'Yetkazib berish';
  if (typeof order.courier === 'string') {
    try { return JSON.parse(order.courier).name || order.courier; } catch { return order.courier; }
  }
  return order.courier?.name || 'Yetkazib berish';
}

export async function POST(request) {
  const body = await request.json();
  const { method } = body;

  try {
    switch (method) {
      case 'prepare':
        return await handlePrepare(body);
      case 'complete':
        return await handleComplete(body);
      default:
        return NextResponse.json({ error: -3, error_note: 'Action not found' });
    }
  } catch (error) {
    console.error('Click webhook error:', error);
    return NextResponse.json({ error: -9, error_note: 'Internal error' });
  }
}

async function handlePrepare(params) {
  const { click_trans_id, service_id, merchant_trans_id, amount } = params;

  if (service_id.toString() !== getClickServiceId()) {
    return NextResponse.json({
      click_trans_id, merchant_trans_id, merchant_prepare_id: 0,
      error: -5, error_note: 'Service ID is invalid',
    });
  }

  const { data: order, error: orderError } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('click_order_id', merchant_trans_id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({
      click_trans_id, merchant_trans_id, merchant_prepare_id: 0,
      error: -5, error_note: `Order not found: ${merchant_trans_id}`,
    });
  }

  const expectedAmount = Math.round(Number(order.total));
  if (Number(amount) !== expectedAmount) {
    return NextResponse.json({
      click_trans_id, merchant_trans_id, merchant_prepare_id: 0,
      error: -2, error_note: `Incorrect amount. Expected ${expectedAmount} UZS, got ${amount} UZS`,
    });
  }

  if (order.status === 'approved' && order.click_trans_id) {
    return NextResponse.json({
      click_trans_id, merchant_trans_id, merchant_prepare_id: 0,
      error: -4, error_note: 'Order already paid',
    });
  }

  return NextResponse.json({
    click_trans_id, merchant_trans_id, merchant_prepare_id: Date.now(),
    error: 0, error_note: 'Success',
  });
}

async function handleComplete(params) {
  const { click_trans_id, service_id, click_paydoc_id, merchant_trans_id, merchant_prepare_id, error: click_error } = params;

  if (service_id.toString() !== getClickServiceId()) {
    return NextResponse.json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 0,
      error: -5, error_note: 'Service ID is invalid',
    });
  }

  const { data: order, error: fetchError } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('click_order_id', merchant_trans_id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: Date.now(),
      error: -5, error_note: 'Order not found',
    });
  }

  const merchant_confirm_id = Date.now();
  const isApproved = !click_error || click_error >= 0;

  await getSupabase()
    .from('orders')
    .update({
      status: isApproved ? 'approved' : 'rejected',
      click_trans_id,
      click_complete_time: Date.now(),
      click_error: click_error || null,
    })
    .eq('click_order_id', merchant_trans_id);

  if (isApproved) {
    const startTime = Date.now();
    const courierName = getCourierName(order);
    const { adminChatId } = getTelegramConfig();

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
        if (adminChatId) {
          const itemsList = order.items && order.items.length > 0
            ? order.items.map((item) => `  • ${item.productName || item.name || 'Mahsulot'} (x${item.quantity}) - ${(item.price || 0).toLocaleString()} UZS`).join('\n')
            : '  • Mahsulotlar mavjud emas';
          const adminMessage = `🔔 <b>Yangi buyurtma to'lovi!</b>\n\nBuyurtma: <b>#${order.order_number || order.id}</b>\nMijoz: ${order.user_name || "Noma'lum"}\nTelefon: ${order.user_phone || "Noma'lum"}\n\n📦 <b>Mahsulotlar:</b>\n${itemsList}\n\n💰 <b>Jami:</b> ${order.total.toLocaleString()} UZS\n🚚 <b>Yetkazib berish:</b> ${courierName}\n📍 <b>Manzil:</b> ${order.delivery_info?.city || order.delivery_info?.address || "Noma'lum"}\n\n✅ To'lov tasdiqlandi. Buyurtmani yetkazib bering.`;
          await sendTelegramNotification(adminChatId, adminMessage);
        }
      })().catch((e) => console.error('Admin notification failed:', e)),
    ]).catch((e) => console.error('Background tasks failed:', e));

    const elapsed = Date.now() - startTime;
    if (elapsed < 2000) {
      await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
    }
  }

  return NextResponse.json({
    click_trans_id, merchant_trans_id, merchant_confirm_id,
    merchant_prepare_id: merchant_prepare_id || 0,
    click_paydoc_id,
    error: 0, error_note: 'Success',
  });
}
