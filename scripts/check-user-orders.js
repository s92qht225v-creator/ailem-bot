// Check order breakdown for a specific user
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkUserOrders() {
  const telegramId = '6461799783';

  console.log(`🔍 Checking orders for Telegram ID: ${telegramId}\n`);

  try {
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (userError || !user) {
      console.error('❌ User not found');
      return;
    }

    console.log(`👤 User: ${user.name}`);
    console.log(`📊 Current total_orders: ${user.total_orders || 0}\n`);

    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, status, total, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Failed to fetch orders:', ordersError);
      return;
    }

    console.log(`📦 Total orders in database: ${orders?.length || 0}\n`);

    // Group by status
    const byStatus = {};
    orders?.forEach(order => {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    });

    console.log('📊 Orders by status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n📋 Recent orders:');
    orders?.slice(0, 10).forEach((order, i) => {
      const date = new Date(order.created_at).toLocaleDateString();
      console.log(`   ${i + 1}. ${order.order_number} - ${order.status} - ${order.total} UZS (${date})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserOrders();
