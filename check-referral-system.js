import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkReferralSystem() {
  console.log('🔍 Checking Referral System...\n');

  // Check users table for referral fields
  const { data: users } = await supabase.from('users').select('*').limit(1);
  if (users && users.length > 0) {
    console.log('👥 Users table columns:', Object.keys(users[0]).join(', '));
    console.log('    Has referred_by?', 'referred_by' in users[0] ? '✅' : '❌');
    console.log('    Has referral_code?', 'referral_code' in users[0] ? '✅' : '❌');
    console.log('    Has bonus_points?', users[0].bonus_points !== undefined ? '✅' : '❌');
  }

  // Check for referrals table
  const { data: referrals, error: refError } = await supabase.from('referrals').select('*').limit(1);
  if (refError) {
    console.log('\n📋 Referrals table: ❌ Does not exist');
    console.log('    Error:', refError.message);
  } else {
    console.log('\n📋 Referrals table: ✅ Exists');
    if (referrals && referrals.length > 0) {
      console.log('    Columns:', Object.keys(referrals[0]).join(', '));
    }

    // Get count
    const { count } = await supabase.from('referrals').select('*', { count: 'exact', head: true });
    console.log('    Total referrals:', count || 0);
  }

  // Check orders table for referral tracking
  const { data: orders } = await supabase.from('orders').select('*').limit(1);
  if (orders && orders.length > 0) {
    const hasReferralTracking = 'referral_id' in orders[0] || 'referred_by' in orders[0];
    console.log('\n📦 Orders table has referral tracking?', hasReferralTracking ? '✅' : '❌');
    if (hasReferralTracking) {
      console.log('    Referral field:', 'referral_id' in orders[0] ? 'referral_id' : 'referred_by');
    }
  }

  // Check if ReferralsPage exists
  console.log('\n📄 Frontend Components:');
  const fs = await import('fs');
  const referralsPageExists = fs.existsSync('./src/components/pages/ReferralsPage.jsx');
  console.log('    ReferralsPage.jsx:', referralsPageExists ? '✅ Exists' : '❌ Not found');
}

checkReferralSystem().then(() => process.exit(0));
