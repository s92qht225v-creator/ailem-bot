require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();

// Minimal logging middleware - only log errors
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration
const CONFIG = {
  CLICK_SERVICE_ID: process.env.CLICK_SERVICE_ID,
  CLICK_SECRET_KEY: process.env.CLICK_SECRET_KEY,
  VERCEL_API_URL: process.env.VERCEL_API_URL || 'https://www.ailem.uz/api/click-webhook',
  PORT: process.env.PORT || 3000
};

// Create persistent axios instance with optimized settings
const axiosInstance = axios.create({
  timeout: 15000, // 15 second timeout (increased from 3s)
  headers: {
    'Content-Type': 'application/json'
  },
  // Keep connections alive for reuse
  httpAgent: new (require('http').Agent)({ keepAlive: true }),
  httpsAgent: new (require('https').Agent)({ keepAlive: true })
});

// Verify Click signature
function verifyClickSignature(params, action) {
  const {
    click_trans_id,
    service_id,
    merchant_trans_id,
    merchant_prepare_id,
    amount,
    sign_time,
    sign_string
  } = params;

  let signString;

  if (action === '1' && merchant_prepare_id) {
    signString = `${click_trans_id}${service_id}${CONFIG.CLICK_SECRET_KEY}${merchant_trans_id}${merchant_prepare_id}${amount}${action}${sign_time}`;
  } else {
    signString = `${click_trans_id}${service_id}${CONFIG.CLICK_SECRET_KEY}${merchant_trans_id}${amount}${action}${sign_time}`;
  }

  const calculatedSign = crypto.createHash('md5').update(signString).digest('hex');
  return calculatedSign === sign_string;
}

// PREPARE method
app.post('/click/prepare', async (req, res) => {
  const params = { ...req.body, ...req.query };
  const { click_trans_id, merchant_trans_id, action } = params;

  // Verify signature
  if (!verifyClickSignature(params, action)) {
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -1,
      error_note: 'Invalid signature'
    });
  }

  try {
    // Forward to Vercel
    const response = await axiosInstance.post(CONFIG.VERCEL_API_URL, {
      method: 'prepare',
      ...params
    });

    console.log('✅ PREPARE successful:', response.data);
    return res.json(response.data);
  } catch (error) {
    console.error('PREPARE error:', error.message);
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -9,
      error_note: 'Internal error'
    });
  }
});

// COMPLETE method - OPTIMIZED FOR SPEED
app.post('/click/complete', async (req, res) => {
  const params = { ...req.body, ...req.query };
  const { click_trans_id, merchant_trans_id, action, click_paydoc_id } = params;

  // Verify signature
  if (!verifyClickSignature(params, action)) {
    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: 0,
      error: -1,
      error_note: 'Invalid signature'
    });
  }

  try {
    // Forward to Vercel with minimal delay
    const response = await axiosInstance.post(CONFIG.VERCEL_API_URL, {
      method: 'complete',
      ...params
    });

    // CRITICAL: Ensure click_paydoc_id and numeric fields formatting in response
    const completeResponse = {
      ...response.data,
      click_trans_id: Number(response.data.click_trans_id || click_trans_id),
      merchant_confirm_id: Number(response.data.merchant_confirm_id || Date.now()),
      merchant_prepare_id: Number(response.data.merchant_prepare_id || params.merchant_prepare_id || 0),
      click_paydoc_id: Number(click_paydoc_id || response.data.click_paydoc_id)
    };

    console.log('✅ COMPLETE successful:', completeResponse);
    return res.json(completeResponse);
  } catch (error) {
    console.error('COMPLETE error:', error.message);
    
    // Even on error, include click_paydoc_id if available
    return res.json({
      click_trans_id: Number(click_trans_id),
      merchant_trans_id,
      merchant_confirm_id: 0,
      merchant_prepare_id: Number(params.merchant_prepare_id || 0),
      click_paydoc_id: Number(click_paydoc_id || 0),
      error: -9,
      error_note: 'Internal error'
    });
  }
});

// Health check
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

app.listen(CONFIG.PORT, '0.0.0.0', () => {
  console.log(`🚀 Click Proxy Server (Optimized) running on port ${CONFIG.PORT}`);
  console.log(`📍 Service ID: ${CONFIG.CLICK_SERVICE_ID}`);
  console.log(`🔗 Forwarding to: ${CONFIG.VERCEL_API_URL}`);
});
