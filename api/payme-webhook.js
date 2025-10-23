// Payme Merchant API Webhook Handler
// JSON-RPC 2.0 Protocol
// https://developer.help.paycom.uz/protokol-merchant-api

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PAYME_KEY = process.env.PAYME_KEY;

  // Check authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Basic ${Buffer.from(`Paycom:${PAYME_KEY}`).toString('base64')}`) {
    return res.status(401).json({
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
  const orderId = account.order_id;

  // Check if order exists in database
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderId)
    .single();

  if (error || !order) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -31050,
        message: 'Order not found'
      }
    });
  }

  // Validate amount matches order total (in tiyin)
  const expectedAmount = Math.round(order.total * 100);
  if (amount !== expectedAmount) {
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
  const { id, time, amount, account } = params;
  const orderId = account.order_id;

  // Check if transaction already exists
  const { data: existing } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderId)
    .eq('payme_transaction_id', id)
    .single();

  if (existing) {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      result: {
        create_time: existing.payme_create_time || time,
        transaction: id,
        state: existing.payme_state || 1
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
    .eq('order_number', orderId)
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
