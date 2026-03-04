import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function POST(request) {
  try {
    const update = await request.json();
    const msg = update?.message;
    if (!msg || !msg.text) {
      return NextResponse.json({ ok: true });
    }

    const adminChatId = process.env.NEXT_PUBLIC_ADMIN_CHAT_ID;
    const fromId = String(msg.from?.id || msg.chat?.id);

    // Only process messages from admin
    if (fromId !== String(adminChatId)) {
      return NextResponse.json({ ok: true });
    }

    const msgText = msg.text;

    // Try reply_to_message first (admin replied to forwarded message)
    let sessionId = null;
    if (msg.reply_to_message?.text) {
      const match = msg.reply_to_message.text.match(/Session: ([\w-]+)/);
      if (match) sessionId = match[1];
    }

    // Fallback: message starts with session ID on first line
    // Format: "<session-id>\nreply text"
    if (!sessionId) {
      const lines = msgText.split('\n');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (lines.length >= 2 && uuidRegex.test(lines[0].trim())) {
        sessionId = lines[0].trim();
      }
    }

    if (!sessionId) {
      return NextResponse.json({ ok: true });
    }

    const replyText = msg.reply_to_message ? msgText : msgText.split('\n').slice(1).join('\n').trim();
    if (!replyText) {
      return NextResponse.json({ ok: true });
    }
    const supabase = getSupabase();

    const { error: insertError } = await supabase.from('support_messages').insert({
      session_id: sessionId,
      sender: 'admin',
      message: replyText,
      telegram_message_id: msg.message_id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Support webhook error:', err);
    // Always return 200 to Telegram
    return NextResponse.json({ ok: true });
  }
}
