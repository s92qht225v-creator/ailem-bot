import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const orderId = process.argv[2];

if (!orderId) {
  console.error('Usage: node check-order-by-id.js <order_id>');
  process.exit(1);
}

console.log('🔍 Looking for order:', orderId);

// Try both uppercase and lowercase
for (const id of [orderId, orderId.toUpperCase(), orderId.toLowerCase()]) {
  console.log(`\nTrying: ${id}`);

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (data) {
    console.log('\n✅ ORDER FOUND:');
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
    process.exit(0);
  }
}

console.log('\n❌ Order not found with any case variation');
