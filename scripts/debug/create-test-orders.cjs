const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createTestOrders() {
  console.log('📦 Creating test orders for Payme...\n');

  // First, get an existing user or create one
  let userId;
  
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1);
  
  if (users && users.length > 0) {
    userId = users[0].id;
  } else {
    // Create a test user
    const { data: newUser } = await supabase
      .from('users')
      .insert([{
        telegram_id: Date.now(),
        first_name: 'Test',
        last_name: 'User'
      }])
      .select()
      .single();
    userId = newUser.id;
  }

  const testOrders = [
    { amount: 50000, items: [{ name: 'Test Product 1', quantity: 1, price: 50000 }] },
    { amount: 125000, items: [{ name: 'Test Product 2', quantity: 1, price: 125000 }] },
    { amount: 250000, items: [{ name: 'Test Product 3', quantity: 2, price: 125000 }] }
  ];

  const createdOrders = [];

  for (const testOrder of testOrders) {
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        user_id: userId,
        items: testOrder.items,
        total_amount: testOrder.amount,
        status: 'pending',
        delivery_method: 'courier',
        delivery_address: 'Test Address, Tashkent',
        recipient_name: 'Test User',
        recipient_phone: '+998901234567',
        payment_method: 'payme'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error:', error.message);
      continue;
    }

    createdOrders.push({
      order_id: order.id,
      order_number: order.order_number,
      amount: order.total_amount
    });

    console.log(`✅ Order ${order.order_number}: ${order.total_amount} so'm (ID: ${order.id})`);
  }

  console.log('\n📋 Send to Payme Support:\n');
  console.log('Test tranzaksiyalar:\n');
  createdOrders.forEach((order, i) => {
    console.log(`${i + 1}. order_id: ${order.order_id}`);
    console.log(`   amount: ${order.amount}`);
    console.log('');
  });
}

createTestOrders().catch(console.error);
