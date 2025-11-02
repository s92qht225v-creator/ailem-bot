#!/usr/bin/env node

// Check Click orders in Supabase
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkClickOrders() {
  console.log('🔍 Checking Click orders in database...\n');

  // Get all orders with click_order_id
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .not('click_order_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching orders:', error);
    return;
  }

  if (!orders || orders.length === 0) {
    console.log('⚠️  No Click orders found in database');
    console.log('\nPossible reasons:');
    console.log('1. Orders were not created with click_order_id field');
    console.log('2. The field name is different (check database schema)');
    console.log('3. No Click payments have been made yet\n');
    return;
  }

  console.log(`✅ Found ${orders.length} Click orders:\n`);

  orders.forEach((order, idx) => {
    console.log(`${idx + 1}. Order #${order.order_number || order.id}`);
    console.log(`   Click Order ID: ${order.click_order_id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Total: ${order.total} UZS`);
    console.log(`   Click Trans ID: ${order.click_trans_id || 'N/A'}`);
    console.log(`   Click Complete Time: ${order.click_complete_time || 'N/A'}`);
    console.log(`   Created: ${new Date(order.created_at).toLocaleString()}`);
    console.log(`   Items: ${JSON.stringify(order.items?.map(i => i.productName || i.name))}`);
    console.log('');
  });
}

checkClickOrders().catch(console.error);
