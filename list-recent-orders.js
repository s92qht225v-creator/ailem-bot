import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 Fetching recent orders...\n');

const { data, error } = await supabase
  .from('orders')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log('❌ No orders found');
  process.exit(1);
}

console.log(`Found ${data.length} recent orders:\n`);
console.log('=====================================');

data.forEach((order, index) => {
  console.log(`\n${index + 1}. Order ID: ${order.id}`);
  console.log(`   Payme Order ID: ${order.payme_order_id || '(none)'}`);
  console.log(`   Status: ${order.status}`);
  console.log(`   Total: ${order.total} so'm`);
  console.log(`   Payment: ${order.payment_method}`);
  console.log(`   Created: ${order.created_at}`);
  console.log(`   Payme State: ${order.payme_state || '(none)'}`);
  console.log(`   Payme TX: ${order.payme_transaction_id || '(none)'}`);
});

console.log('\n=====================================');
