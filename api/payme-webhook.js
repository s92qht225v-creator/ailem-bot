// Payme Webhook Handler
// https://developer.help.paycom.uz/protokol-merchant-api

import { supabase } from '../src/lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PAYME_KEY = process.env.PAYME_KEY; // Your Payme Key (login from merchant cabinet)

  // Check authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Basic ${Buffer.from(`Paycom:${PAYME_KEY}`).toString('base64')}`) {
    return res.status(401).json({
      error: {
        code: -32504,
        message: 'Insufficient privileges to perform the operation'
      }
    });
  }

  const { method, params } = req.body;

  try {
    switch (method) {
      case 'CheckPerformTransaction':
        return await checkPerformTransaction(params, res);
      
      case 'CreateTransaction':
        return await createTransaction(params, res);
      
      case 'PerformTransaction':
        return await performTransaction(params, res);
      
      case 'CancelTransaction':
        return await cancelTransaction(params, res);
      
      case 'CheckTransaction':
        return await checkTransaction(params, res);
      
      default:
        return res.json({
          error: {
            code: -32601,
            message: 'Method not found'
          }
        });
    }
  } catch (error) {
    console.error('Payme webhook error:', error);
    return res.json({
      error: {
        code: -32400,
        message: error.message
      }
    });
  }
}

// Check if order exists and can be paid
async function checkPerformTransaction(params, res) {
  const { account } = params;
  const orderId = account.order_id;

  // Check if order exists in database
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderId)
    .single();

  if (error || !order) {
    return res.json({
      error: {
        code: -31050,
        message: 'Order not found'
      }
    });
  }

  // Check if order is already paid
  if (order.status === 'approved' && order.payment_method === 'payme') {
    return res.json({
      error: {
        code: -31051,
        message: 'Order already paid'
      }
    });
  }

  return res.json({
    result: {
      allow: true
    }
  });
}

// Create transaction
async function createTransaction(params, res) {
  const { id, time, amount, account } = params;
  const orderId = account.order_id;

  // Save transaction to database (you should create a payme_transactions table)
  // For now, just return success
  
  return res.json({
    result: {
      create_time: time,
      transaction: id,
      state: 1 // 1 = created
    }
  });
}

// Perform (complete) transaction
async function performTransaction(params, res) {
  const { id } = params;

  // Update order status to approved
  // Extract order_id from transaction (you'd store this in createTransaction)
  
  return res.json({
    result: {
      transaction: id,
      perform_time: Date.now(),
      state: 2 // 2 = completed
    }
  });
}

// Cancel transaction
async function cancelTransaction(params, res) {
  const { id, reason } = params;

  return res.json({
    result: {
      transaction: id,
      cancel_time: Date.now(),
      state: -1 // -1 = cancelled
    }
  });
}

// Check transaction status
async function checkTransaction(params, res) {
  const { id } = params;

  // Look up transaction in your database
  return res.json({
    result: {
      create_time: Date.now(),
      perform_time: 0,
      cancel_time: 0,
      transaction: id,
      state: 1,
      reason: null
    }
  });
}
