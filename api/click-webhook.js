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

  // IMPORTANT: Respond to Click IMMEDIATELY to avoid timeout
  // Then update database asynchronously
  const merchant_confirm_id = Date.now();

  // Send immediate response to Click
  res.json({
    click_trans_id,
    merchant_trans_id,
    merchant_confirm_id,
    error: 0,
    error_note: 'Success'
  });

  console.log('✅ COMPLETE response sent to Click immediately');

  // Update database asynchronously (don't await - fire and forget)
  supabase
    .from('orders')
    .update({
      status: click_error && click_error < 0 ? 'rejected' : 'approved',
      click_trans_id,
      click_complete_time: Date.now(),
      click_error: click_error || null
    })
    .eq('click_order_id', merchant_trans_id)
    .then(({ error: updateError }) => {
      if (updateError) {
        console.error('❌ Failed to update order:', updateError);
      } else {
        console.log('✅ Order updated successfully:', merchant_trans_id);
      }
    })
    .catch((err) => {
      console.error('❌ Database update error:', err);
    });
}
