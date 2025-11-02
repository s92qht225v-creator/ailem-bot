// Script to check and manually award bonus points for an order
// Usage: node scripts/check-bonus.js ORDER_NUMBER

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const orderNumber = process.argv[2] || 'ORD-1762074286979-45';

async function checkAndAwardBonus() {
  console.log(`\n🔍 Checking order: ${orderNumber}\n`);

  // 1. Get the order - try both id and order_number fields
  let order, orderError;
  
  // Try by id first
  const { data: orderById, error: errorById } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderNumber)
    .maybeSingle();
  
  if (orderById) {
    order = orderById;
  } else {
    // Try by order_number
    const { data: orderByNum, error: errorByNum } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .maybeSingle();
    
    if (orderByNum) {
      order = orderByNum;
    } else {
      orderError = errorByNum || errorById;
    }
  }

  if (orderError || !order) {
    console.error('❌ Order not found:', orderError);
    return;
  }

  console.log('📦 Order found:');
  console.log(`  - Order ID: ${order.id}`);
  console.log(`  - Status: ${order.status}`);
  console.log(`  - Total: ${order.total} UZS`);
  console.log(`  - User ID: ${order.user_id}`);
  console.log(`  - Payme Transaction: ${order.payme_transaction_id || 'None'}`);
  console.log('');

  if (!order.user_id) {
    console.error('❌ Order has no user_id - cannot award bonus');
    return;
  }

  // 2. Get the user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', order.user_id)
    .single();

  if (userError || !user) {
    console.error('❌ User not found:', userError);
    console.error('   User ID:', order.user_id);
    return;
  }

  console.log('👤 User found:');
  console.log(`  - Name: ${user.name}`);
  console.log(`  - Current bonus: ${user.bonus_points || 0} points`);
  console.log('');

  // 3. Calculate bonus
  const bonusPercentage = 3; // Default 3%
  const bonusPoints = Math.round((order.total * bonusPercentage) / 100);

  console.log('💰 Bonus calculation:');
  console.log(`  - Order total: ${order.total} UZS`);
  console.log(`  - Bonus rate: ${bonusPercentage}%`);
  console.log(`  - Bonus points: ${bonusPoints}`);
  console.log('');

  // 4. Check if already awarded
  if (order.status === 'approved' && user.bonus_points > 0) {
    console.log('⚠️  Order is approved and user has bonus points.');
    console.log('    Bonus may have already been awarded.');
    console.log('    Would you like to award additional bonus? (manual decision needed)');
    console.log('');
  }

  // 5. Award bonus
  const newBonusPoints = (user.bonus_points || 0) + bonusPoints;

  console.log('🎁 Awarding bonus...');
  const { error: updateError } = await supabase
    .from('users')
    .update({ bonus_points: newBonusPoints })
    .eq('id', user.id);

  if (updateError) {
    console.error('❌ Failed to update bonus:', updateError);
  } else {
    console.log(`✅ SUCCESS! User ${user.name} now has ${newBonusPoints} bonus points`);
    console.log(`   (was ${user.bonus_points || 0}, added ${bonusPoints})`);
  }
}

checkAndAwardBonus().catch(console.error);
