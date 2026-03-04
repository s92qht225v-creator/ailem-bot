import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// POST /api/support/admin-reply — admin sends reply from web panel
export async function POST(request) {
  try {
    const { session_id, message } = await request.json();

    if (!session_id || !message?.trim()) {
      return NextResponse.json({ error: 'session_id and message are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('support_messages')
      .insert({ session_id, sender: 'admin', message: message.trim() })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error('Admin reply error:', err);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
  }
}
