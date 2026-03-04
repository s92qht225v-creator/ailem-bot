import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../src/lib/supabase-server';

function generateReferralCode(name) {
  const prefix = (name || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${suffix}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = body;

    if (!id || !hash || !auth_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Reject if auth_date is older than 24 hours
    const now = Math.floor(Date.now() / 1000);
    if (now - auth_date > 86400) {
      return NextResponse.json({ error: 'Auth data expired' }, { status: 401 });
    }

    // Verify HMAC-SHA256 hash per Telegram Login Widget docs
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    // Build data-check-string: alphabetically sorted key=value pairs (excluding hash)
    const checkData = Object.entries(body)
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const hmac = crypto.createHmac('sha256', secretKey).update(checkData).digest('hex');

    if (hmac !== hash) {
      return NextResponse.json({ error: 'Invalid hash' }, { status: 401 });
    }

    // Auth verified — upsert user in Supabase
    const supabaseAdmin = createServerSupabaseClient();
    const telegramId = id.toString();
    const fullName = `${first_name || ''} ${last_name || ''}`.trim();

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    let dbUser;

    if (existingUser) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          name: fullName || existingUser.name,
          username: username || existingUser.username,
          photo_url: photo_url || existingUser.photo_url,
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update user:', updateError);
        dbUser = existingUser;
      } else {
        dbUser = updated;
      }
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([
          {
            telegram_id: telegramId,
            name: fullName || username || `User ${id}`,
            username: username || `user${id}`,
            photo_url: photo_url || '',
            referral_code: generateReferralCode(first_name || username || id.toString()),
            bonus_points: 0,
            total_orders: 0,
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user:', createError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      dbUser = newUser;
    }

    // Return user object in app format
    const appUser = {
      id: dbUser.id,
      telegramId: dbUser.telegram_id,
      name: dbUser.name,
      username: dbUser.username,
      phone: dbUser.phone || '',
      photoUrl: dbUser.photo_url || '',
      bonusPoints: dbUser.bonus_points || 0,
      referralCode: dbUser.referral_code,
      referrals: dbUser.referrals || 0,
      referredBy: dbUser.referred_by,
      totalOrders: dbUser.total_orders || 0,
      role: dbUser.role || 'customer',
      favorites: dbUser.favorites || [],
      cart: dbUser.cart || [],
    };

    return NextResponse.json({ user: appUser });
  } catch (error) {
    console.error('Telegram login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
