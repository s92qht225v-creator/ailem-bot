// Script to fix total_orders count for all users
// Run this once to migrate existing data
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixUserOrderCounts() {
  console.log('🔧 Starting user order count fix...\n');

  try {
    // 1. Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, name, total_orders');

    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError);
      return;
    }

    console.log(`📊 Found ${users.length} users\n`);

    // 2. For each user, count their orders
    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Count orders that are approved, shipped, or delivered
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['approved', 'shipped', 'delivered']);

      if (ordersError) {
        console.error(`❌ Failed to fetch orders for user ${user.id}:`, ordersError);
        continue;
      }

      const actualOrderCount = orders?.length || 0;
      const currentCount = user.total_orders || 0;

      // Only update if counts don't match
      if (actualOrderCount !== currentCount) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ total_orders: actualOrderCount })
          .eq('id', user.id);

        if (updateError) {
          console.error(`❌ Failed to update user ${user.id}:`, updateError);
        } else {
          console.log(`✅ ${user.name} (${user.telegram_id}): ${currentCount} → ${actualOrderCount} orders`);
          updatedCount++;
        }
      } else {
        skippedCount++;
        if (actualOrderCount > 0) {
          console.log(`⏭️  ${user.name}: ${actualOrderCount} orders (already correct)`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped (already correct): ${skippedCount}`);
    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
fixUserOrderCounts();
