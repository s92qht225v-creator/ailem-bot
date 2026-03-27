import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const paymeOrderId = process.argv[2];

if (!paymeOrderId) {
  console.error('Usage: node check-order.js <payme_order_id>');
  process.exit(1);
}

console.log('🔍 Looking for order with Payme ID:', paymeOrderId);

const { data, error } = await supabase
  .from('orders')
  .select('*')
  .eq('payme_order_id', paymeOrderId)
  .single();

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

if (!data) {
  console.log('❌ Order not found');
  process.exit(1);
}

console.log('\n📦 ORDER FOUND:');
console.log('================');
console.log('Order ID:', data.id);
console.log('Payme Order ID:', data.payme_order_id);
console.log('Status:', data.status);
console.log('Total:', data.total, 'so\'m');
console.log('Payment Method:', data.payment_method);
console.log('Created:', data.created_at);
console.log('\nPayme Transaction Info:');
console.log('Transaction ID:', data.payme_transaction_id || '(none)');
console.log('State:', data.payme_state || '(none)');
console.log('Create Time:', data.payme_create_time || '(none)');
console.log('Perform Time:', data.payme_perform_time || '(none)');
console.log('\n================');
