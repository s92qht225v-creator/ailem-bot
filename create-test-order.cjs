const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createTestOrder() {
  const { data: users } = await supabase.from('users').select('id, name, telegram_id').limit(1);
  
  if (!users?.length) {
    console.error('❌ No users found');
    return;
  }

  const user = users[0];
  const uuid = crypto.randomUUID();

  const { data: order, error } = await supabase
    .from('orders')
    .insert([{
      id: uuid,
      order_number: 'TEST-001',
      user_id: user.id,
      user_name: user.name || 'Test User',
      user_phone: '+998901234567',
      user_telegram_id: user.telegram_id,
      items: [{ name: 'Test Product', quantity: 1, price: 50000 }],
      delivery_info: { method: 'courier', address: 'Test Address' },
      subtotal: 50000,
      delivery_fee: 0,
      total: 50000,
      status: 'pending'
    }])
    .select()
    .single();

  if (error) {
    console.error('❌', error.message);
    return;
  }

  console.log('✅ Order created: TEST-001 (50,000 so\'m)');
  console.log('🎯 Go to the HTML page and click "Open Payment Page"');
}

createTestOrder();
