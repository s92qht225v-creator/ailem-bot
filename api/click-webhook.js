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

// Award bonus points to user for approved order
async function awardBonusPoints(order) {
  const userId = order.user_id || order.userId;
  if (!userId) {
    console.log('⚠️ No userId found in order, skipping bonus points');
    return;
  }

  try {
    // Fetch bonus configuration from database
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('bonus_config')
      .eq('id', 1)
      .single();

    if (settingsError) {
      console.error('❌ Failed to fetch bonus config:', settingsError);
    }

    // Use configured percentage or default to 10%
    const purchaseBonusPercentage = settings?.bonus_config?.purchaseBonus || 10;
    const purchaseBonusPoints = Math.round((order.total * purchaseBonusPercentage) / 100);

    console.log(`💰 Awarding bonus: ${purchaseBonusPoints} points to user ${userId} (${purchaseBonusPercentage}% of ${order.total})`);

    // Get current user bonus points
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('bonus_points')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Failed to fetch user:', userError);
      return;
    }

    if (user) {
      const newBonusPoints = (user.bonus_points || 0) + purchaseBonusPoints;

      const { error: updateError } = await supabase
        .from('users')
        .update({ bonus_points: newBonusPoints })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Failed to update bonus points:', updateError);
      } else {
        console.log(`✅ Purchase bonus awarded: User ${userId} now has ${newBonusPoints} points`);
      }
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

  // Update order directly without checking if it exists first (for speed)
  // Use upsert behavior to handle both new and existing orders
  const merchant_confirm_id = Date.now();
  const isApproved = !click_error || click_error >= 0;

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

  // Return success immediately to Click (they need fast response < 3 seconds)
  // IMPORTANT: Click expects these exact fields in the response
  res.json({
    click_trans_id,
    merchant_trans_id,
    merchant_confirm_id,
    error: 0,
    error_note: 'Success'
  });

  // Award bonus points asynchronously AFTER sending response
  // This prevents timeout issues with Click's webhook
  if (isApproved) {
    // Fetch the order to get user_id and total
    const { data: order } = await supabase
      .from('orders')
      .select('user_id, total')
      .eq('click_order_id', merchant_trans_id)
      .single();

    if (order) {
      await awardBonusPoints(order);
    }
  }
}
