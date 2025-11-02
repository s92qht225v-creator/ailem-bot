#!/usr/bin/env node

// Check specific Click order details
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkOrder() {
  // Get the most recent Click order
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .not('click_order_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !orders || orders.length === 0) {
    console.error('❌ No orders found');
    return;
  }

  const order = orders[0];

  console.log('📋 Most Recent Click Order Details:\n');
  console.log('Order Number:', order.order_number);
  console.log('Click Order ID:', order.click_order_id);
  console.log('Status:', order.status);
  console.log('User ID:', order.user_id);
  console.log('Total:', order.total);
  console.log('\n📦 Items:');
  console.log(JSON.stringify(order.items, null, 2));
  console.log('\n👤 User ID:', order.user_id);

  // Check user's bonus points
  if (order.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('bonus_points, telegram_id, name')
      .eq('id', order.user_id)
      .single();

    if (user) {
      console.log('\n💰 User Bonus Points:', user.bonus_points);
      console.log('User Name:', user.name);
      console.log('Telegram ID:', user.telegram_id);
    }
  }

  // Check product stock
  if (order.items && order.items.length > 0) {
    console.log('\n📊 Product Stock Check:');
    for (const item of order.items) {
      const { data: product } = await supabase
        .from('products')
        .select('name, stock, variants')
        .eq('id', item.id || item.productId)
        .single();

      if (product) {
        console.log(`\n  Product: ${product.name}`);
        console.log(`  Regular Stock: ${product.stock || 0}`);
        if (product.variants && product.variants.length > 0) {
          console.log(`  Has Variants: Yes (${product.variants.length} variants)`);
          const totalVariantStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
          console.log(`  Total Variant Stock: ${totalVariantStock}`);
        }
      }
    }
  }
}

checkOrder().catch(console.error);
