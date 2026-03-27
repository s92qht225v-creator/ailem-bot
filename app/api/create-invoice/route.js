import { NextResponse } from 'next/server';
import { rateLimit } from '../../../src/lib/rate-limit';

export async function POST(request) {
  // Rate limit: 10 requests per minute
  const { success: withinLimit } = rateLimit(request, { maxRequests: 10, windowMs: 60_000 });
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Use server-side env var (not NEXT_PUBLIC_ which leaks to browser)
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  const PAYMENT_PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN || '';

  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
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
    } = await request.json();

    if (!title || !description || !payload || !currency || !prices) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const body = {
      title,
      description,
      payload,
      provider_token: PAYMENT_PROVIDER_TOKEN,
      currency,
      prices,
      need_name,
      need_phone_number,
      need_email,
      need_shipping_address,
    };

    if (photo_url) body.photo_url = photo_url;

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to create invoice', details: data.description, telegram_error: data },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, invoiceLink: data.result });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
