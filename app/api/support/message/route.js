import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../src/lib/supabase-server';

function generateSessionId() {
  return crypto.randomUUID();
}

export async function POST(request) {
  try {
    const { session_id, message, user_name, user_id } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const sessionId = session_id || generateSessionId();
    const supabase = createServerSupabaseClient();

    // Save user message to DB
    const { data, error } = await supabase
      .from('support_messages')
      .insert({ session_id: sessionId, sender: 'user', message: message.trim() })
      .select('id')
      .single();

    if (error) throw error;

    // Forward to admin via Telegram
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.NEXT_PUBLIC_ADMIN_CHAT_ID;

    if (botToken && adminChatId) {
      const userName = user_name || 'Mehmon';
      const userId = user_id || 'unknown';
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
