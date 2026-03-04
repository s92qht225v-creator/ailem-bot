import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../src/lib/supabase-server';

export async function POST(request) {
  try {
    const update = await request.json();
    console.log('Webhook update:', JSON.stringify(update, null, 2));

    const msg = update?.message;
    if (!msg || !msg.reply_to_message) {
      console.log('No reply_to_message, ignoring. msg keys:', msg ? Object.keys(msg) : 'no msg');
      return NextResponse.json({ ok: true });
    }

    const replyText = msg.text;
    const originalText = msg.reply_to_message.text;
    console.log('Reply to message, originalText:', originalText?.substring(0, 100));

    if (!replyText || !originalText) {
      return NextResponse.json({ ok: true });
    }

    // Extract session_id from original forwarded message
    const match = originalText.match(/Session: ([\w-]+)/);
    if (!match) {
      return NextResponse.json({ ok: true });
    }

    const sessionId = match[1];
    const supabase = createServerSupabaseClient();

    await supabase.from('support_messages').insert({
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
