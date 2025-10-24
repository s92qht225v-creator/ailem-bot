const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createPaymeTestOrder() {
  // Generate a Payme-style order ID (13 digits)
  const paymeOrderId = Date.now().toString().substring(0, 13);
  const orderNumber = `PAYME-${paymeOrderId.substring(7)}`;
  const testAmount = 80000; // 80,000 UZS

  console.log('\n🔍 Creating Payme test order...\n');

  // Get first user or create a test user
  let { data: users } = await supabase.from('users').select('id, name, telegram_id').limit(1);

  if (!users?.length) {
    console.log('📝 No users found, creating test user...');
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([{
        telegram_id: 123456789,
        name: 'Test User',
        phone: '+998901234567',
        role: 'user'
      }])
      .select()
      .single();

    if (userError) {
      console.error('❌ Failed to create user:', userError.message);
      return;
    }
    users = [newUser];
  }

  const user = users[0];
  const uuid = crypto.randomUUID();

  const { data: order, error } = await supabase
    .from('orders')
    .insert([{
      id: uuid,
      order_number: orderNumber,
      user_id: user.id,
      user_name: user.name || 'Test User',
      user_phone: '+998901234567',
      user_telegram_id: user.telegram_id,
      items: [
        { name: 'Test Product 1', quantity: 1, price: 50000 },
        { name: 'Test Product 2', quantity: 1, price: 30000 }
      ],
      delivery_info: {
        method: 'courier',
        address: 'Tashkent, Test Street 123',
        payme_order_id: paymeOrderId
      },
      subtotal: testAmount,
      delivery_fee: 0,
      total: testAmount,
      status: 'pending',
      payme_order_id: paymeOrderId,
      payme_state: 0
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create order:', error.message);
    return;
  }

  console.log('✅ Payme test order created successfully!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('📋 USE THESE VALUES IN PAYME TEST INTERFACE:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Номер заказа (order_id): ${paymeOrderId}`);
  console.log(`Сумма оплаты (amount):   ${testAmount * 100} tiyin (${testAmount.toLocaleString()} so'm)`);
  console.log('═══════════════════════════════════════════════════\n');
  console.log('📦 Order details:');
  console.log(`   Order Number: ${orderNumber}`);
  console.log(`   UUID: ${uuid}`);
  console.log(`   Status: pending`);
  console.log(`   Total: ${testAmount.toLocaleString()} UZS\n`);
  console.log('🧪 Test flow:');
  console.log('   1. Copy the order_id and amount above');
  console.log('   2. Paste into Payme test interface');
  console.log('   3. Click "Запустить тест"');
  console.log('   4. Check the response - should succeed!\n');
}

createPaymeTestOrder();
