// Vercel Serverless Function to create Telegram invoice links
// https://core.telegram.org/bots/api#createinvoicelink

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured');
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  try {
    const {
      title,
      description,
      payload,
      currency,
      prices,
      provider_token = '', // Empty for Telegram-connected providers (Paycom)
      photo_url,
      need_name = true,
      need_phone_number = true,
      need_email = false,
      need_shipping_address = false,
    } = req.body;

    // Validate required fields
    if (!title || !description || !payload || !currency || !prices) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Call Telegram Bot API to create invoice link
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          payload,
          provider_token,
          currency,
          prices,
          photo_url,
          need_name,
          need_phone_number,
          need_email,
          need_shipping_address,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Telegram API error:', data);
      return res.status(400).json({
        error: 'Failed to create invoice',
        details: data.description,
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
