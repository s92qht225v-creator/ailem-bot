import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../../src/lib/rate-limit';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function generateSessionId() {
  return crypto.randomUUID();
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;

export async function POST(request) {
  // Rate limit: 15 messages per minute
  const { success: withinLimit } = rateLimit(request, { maxRequests: 15, windowMs: 60_000 });
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { session_id, message, user_name, user_id } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` }, { status: 400 });
    }

    // Validate session_id format if provided
    if (session_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(session_id)) {
        return NextResponse.json({ error: 'Invalid session_id format' }, { status: 400 });
      }
    }

    const sessionId = session_id || generateSessionId();
    const supabase = getSupabase();

    // Save user message to DB
    const { data, error } = await supabase
      .from('support_messages')
      .insert({ session_id: sessionId, sender: 'user', message: message.trim() })
      .select('id')
      .single();

    if (error) throw error;

    // Forward to admin via Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.NEXT_PUBLIC_ADMIN_CHAT_ID;

    if (botToken && adminChatId) {
      const userName = typeof user_name === 'string' ? user_name.slice(0, MAX_NAME_LENGTH) : 'Mehmon';
      const userId = typeof user_id === 'string' ? user_id.slice(0, 50) : 'unknown';
      const text = `💬 Sayt orqali xabar\n👤 ${userName} (ID: ${userId})\n🔑 Session: ${sessionId}\n\n${message.trim()}`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: adminChatId, text }),
      });
    }

    return NextResponse.json({ session_id: sessionId, id: data.id });
  } catch (err) {
    console.error('Support message error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
