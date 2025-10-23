// Quick script to create test orders for Payme testing
// Run with: node test-orders-for-payme.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createTestOrders() {
  console.log('📦 Creating test orders for Payme...\n');

  const testOrders = [
    {
      amount: 50000, // 50,000 so'm
      items: [{ name: 'Test Product 1', quantity: 1, price: 50000 }]
    },
    {
      amount: 125000, // 125,000 so'm
      items: [{ name: 'Test Product 2', quantity: 1, price: 125000 }]
    },
    {
      amount: 250000, // 250,000 so'm
      items: [{ name: 'Test Product 3', quantity: 2, price: 125000 }]
    }
  ];

  const createdOrders = [];

  for (const testOrder of testOrders) {
    try {
      // Get or create demo user
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', 999999)
        .single();

      if (!user) {
        const { data: newUser } = await supabase
          .from('users')
          .insert([{
            telegram_id: 999999,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser'
          }])
          .select()
          .single();
        user = newUser;
      }

      // Create order
      const { data: order, error } = await supabase
        .from('orders')
        .insert([{
          user_id: user.id,
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

      if (error) throw error;

      createdOrders.push({
        order_id: order.id,
        order_number: order.order_number,
        amount: order.total_amount
      });

      console.log(`✅ Created order: ${order.order_number}`);
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Amount: ${order.total_amount} so'm\n`);
    } catch (error) {
      console.error('❌ Error creating order:', error.message);
    }
  }

  console.log('\n📋 Test Orders Summary for Payme:');
  console.log('════════════════════════════════════════\n');
  
  createdOrders.forEach((order, index) => {
    console.log(`Test ${index + 1}:`);
    console.log(`  order_id: ${order.order_id}`);
    console.log(`  order_number: ${order.order_number}`);
    console.log(`  amount: ${order.amount}`);
    console.log('');
  });

  console.log('\n✉️  Send this to Payme support:');
  console.log('════════════════════════════════════════\n');
  console.log('Test order IDs va amounts:\n');
  createdOrders.forEach((order, index) => {
    console.log(`${index + 1}. order_id: ${order.order_id}, amount: ${order.amount}`);
  });
}

createTestOrders().catch(console.error);
