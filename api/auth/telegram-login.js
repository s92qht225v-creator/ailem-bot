import crypto from 'crypto';
import { supabaseAdmin } from '../_lib/supabase-admin.js';

function generateReferralCode(name) {
  const prefix = (name || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${suffix}`;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;

    if (!id || !hash || !auth_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Reject if auth_date is older than 24 hours
    const now = Math.floor(Date.now() / 1000);
    if (now - auth_date > 86400) {
      return res.status(401).json({ error: 'Auth data expired' });
    }

    // Verify HMAC-SHA256 hash per Telegram Login Widget docs
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    // Build data-check-string: alphabetically sorted key=value pairs (excluding hash)
    const checkData = Object.entries(req.body)
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const hmac = crypto.createHmac('sha256', secretKey).update(checkData).digest('hex');

    if (hmac !== hash) {
      return res.status(401).json({ error: 'Invalid hash' });
    }

    // Auth verified — upsert user in Supabase
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
      // Update existing user with latest Telegram data
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          name: fullName || existingUser.name,
          username: username || existingUser.username,
          photo_url: photo_url || existingUser.photo_url
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
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([{
          telegram_id: telegramId,
          name: fullName || username || `User ${id}`,
          username: username || `user${id}`,
          photo_url: photo_url || '',
          referral_code: generateReferralCode(first_name || username || id.toString()),
          bonus_points: 0,
          total_orders: 0
        }])
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
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
      cart: dbUser.cart || []
    };

    return res.status(200).json({ user: appUser });
  } catch (error) {
    console.error('Telegram login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
