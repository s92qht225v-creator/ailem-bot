// Vercel Serverless Function to create Telegram invoice links
// https://core.telegram.org/bots/api#createinvoicelink

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN;
  // Use PAYMENT_PROVIDER_TOKEN if set, otherwise empty string for BotFather-connected providers
  const PAYMENT_PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN || '';

  if (!BOT_TOKEN) {
    console.error('❌ VITE_TELEGRAM_BOT_TOKEN not configured');
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  try {
    const {
      title,
      description,
      payload,
      currency,
      prices,
      photo_url,
      need_name = true,
      need_phone_number = true,
      need_email = false,
      need_shipping_address = false,
    } = req.body;

    console.log('📱 Creating invoice with:', { title, description, payload, currency, prices });

    // Validate required fields
    if (!title || !description || !payload || !currency || !prices) {
      console.error('❌ Missing required fields:', { title, description, payload, currency, prices });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Call Telegram Bot API to create invoice link
    // Build request body and include optional fields only when provided
    const body = {
      title,
      description,
      payload,
      provider_token: PAYMENT_PROVIDER_TOKEN, // From env or empty for BotFather-connected
      currency,
      prices,
      need_name,
      need_phone_number,
      need_email,
      need_shipping_address,
    };

    console.log('🔑 Using provider_token:', PAYMENT_PROVIDER_TOKEN ? 'SET' : 'EMPTY');

    // Only add photo_url if provided
    if (photo_url) body.photo_url = photo_url;

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Telegram API error:', JSON.stringify(data, null, 2));
      console.error('❌ Request body was:', JSON.stringify(body, null, 2));
      return res.status(400).json({
        success: false,
        error: 'Failed to create invoice',
        details: data.description,
        telegram_error: data,
      });
    }

    console.log('✅ Invoice link created:', data.result);

    // Return the invoice link
    return res.status(200).json({
      success: true,
      invoiceLink: data.result,
    });
  } catch (error) {
    console.error('❌ Error creating invoice:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
