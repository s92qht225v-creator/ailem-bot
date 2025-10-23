const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configuration
const CONFIG = {
  CLICK_SERVICE_ID: process.env.CLICK_SERVICE_ID, // From Click merchant cabinet
  CLICK_SECRET_KEY: process.env.CLICK_SECRET_KEY, // From Click merchant cabinet
  VERCEL_API_URL: process.env.VERCEL_API_URL || 'https://www.ailem.uz/api/click-webhook',
  PORT: process.env.PORT || 3000
};

// Verify Click signature
function verifyClickSignature(params) {
  const {
    click_trans_id,
    service_id,
    click_paydoc_id,
    merchant_trans_id,
    amount,
    action,
    sign_time,
    sign_string
  } = params;

  // Build sign string according to Click specification
  const signString = `${click_trans_id}${service_id}${CONFIG.CLICK_SECRET_KEY}${merchant_trans_id}${amount}${action}${sign_time}`;
  const calculatedSign = crypto.createHash('md5').update(signString).digest('hex');

  return calculatedSign === sign_string;
}

// PREPARE method - Check if order can be paid
app.post('/click/prepare', async (req, res) => {
  console.log('📥 PREPARE request:', req.body);

  const {
    click_trans_id,
    service_id,
    click_paydoc_id,
    merchant_trans_id,
    merchant_prepare_id,
    amount,
    action,
    error,
    error_note,
    sign_time,
    sign_string
  } = req.body;

  // Verify signature
  if (!verifyClickSignature(req.body)) {
    console.log('❌ Invalid signature');
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -1,
      error_note: 'Invalid signature'
    });
  }

  try {
    // Forward to Vercel API
    const response = await axios.post(CONFIG.VERCEL_API_URL, {
      method: 'prepare',
      ...req.body
    }, {
      timeout: 5000
    });

    console.log('✅ PREPARE successful:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ PREPARE error:', error.message);
    res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -9,
      error_note: 'Internal error'
    });
  }
});

// COMPLETE method - Complete transaction
app.post('/click/complete', async (req, res) => {
  console.log('📥 COMPLETE request:', req.body);

  const {
    click_trans_id,
    service_id,
    click_paydoc_id,
    merchant_trans_id,
    merchant_confirm_id,
    amount,
    action,
    error,
    error_note,
    sign_time,
    sign_string
  } = req.body;

  // Verify signature
  if (!verifyClickSignature(req.body)) {
    console.log('❌ Invalid signature');
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: 0,
      error: -1,
      error_note: 'Invalid signature'
    });
  }

  try {
    // Forward to Vercel API
    const response = await axios.post(CONFIG.VERCEL_API_URL, {
      method: 'complete',
      ...req.body
    }, {
      timeout: 5000
    });

    console.log('✅ COMPLETE successful:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ COMPLETE error:', error.message);
    res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: 0,
      error: -9,
      error_note: 'Internal error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      service_id: CONFIG.CLICK_SERVICE_ID,
      vercel_url: CONFIG.VERCEL_API_URL
    }
  });
});

// Start server
app.listen(CONFIG.PORT, '0.0.0.0', () => {
  console.log(`🚀 Click Proxy Server running on port ${CONFIG.PORT}`);
  console.log(`📍 Service ID: ${CONFIG.CLICK_SERVICE_ID}`);
  console.log(`🔗 Forwarding to: ${CONFIG.VERCEL_API_URL}`);
});
