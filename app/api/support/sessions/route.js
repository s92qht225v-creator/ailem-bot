import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// GET /api/support/sessions — list all unique sessions with last message preview
export async function GET() {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('support_messages')
      .select('session_id, sender, message, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by session_id, keeping the latest message per session
    const sessionsMap = new Map();
    for (const msg of data || []) {
      if (!sessionsMap.has(msg.session_id)) {
        sessionsMap.set(msg.session_id, {
          session_id: msg.session_id,
          last_message: msg.message,
          last_sender: msg.sender,
          last_at: msg.created_at,
          unread: 0,
        });
      }
      // Count unread user messages (no admin reply after them)
      const session = sessionsMap.get(msg.session_id);
      if (msg.sender === 'user') session.unread += 1;
    }

    // For each session, subtract user messages that already have admin replies after them
    // Simple heuristic: if last sender is 'admin', unread = 0
    const sessions = Array.from(sessionsMap.values()).map(s => ({
      ...s,
      unread: s.last_sender === 'admin' ? 0 : s.unread,
    }));

    // Sort by last message time descending
    sessions.sort((a, b) => new Date(b.last_at) - new Date(a.last_at));

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('Support sessions fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
