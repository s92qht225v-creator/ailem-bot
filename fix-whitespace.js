#!/usr/bin/env node

/**
 * Fix whitespace in pickup_points and shipping_rates
 * Trims all state and city names
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixWhitespace() {
  console.log('🔧 Fixing whitespace in database...\n');

  try {
    // Fix pickup points
    console.log('📍 Fixing pickup_points...');
    const { data: pickupPoints } = await supabase
      .from('pickup_points')
      .select('*');

    let ppFixed = 0;
    for (const point of pickupPoints || []) {
      const updates = {};
      let needsUpdate = false;

      if (point.state && point.state !== point.state.trim()) {
        updates.state = point.state.trim();
        needsUpdate = true;
      }
      if (point.city && point.city !== point.city.trim()) {
        updates.city = point.city.trim();
        needsUpdate = true;
      }
      if (point.address && point.address !== point.address.trim()) {
        updates.address = point.address.trim();
        needsUpdate = true;
      }

      if (needsUpdate) {
        await supabase
          .from('pickup_points')
          .update(updates)
          .eq('id', point.id);
        ppFixed++;
        console.log(`   Fixed: ${point.courier_service} - "${point.state}" → "${updates.state || point.state}"`);
      }
    }
    console.log(`   ✅ Fixed ${ppFixed} pickup points\n`);

    // Fix shipping rates
    console.log('💰 Fixing shipping_rates...');
    const { data: shippingRates } = await supabase
      .from('shipping_rates')
      .select('*');

    let srFixed = 0;
    for (const rate of shippingRates || []) {
      const updates = {};
      let needsUpdate = false;

      if (rate.state && rate.state !== rate.state.trim()) {
        updates.state = rate.state.trim();
        needsUpdate = true;
      }

      if (needsUpdate) {
        await supabase
          .from('shipping_rates')
          .update(updates)
          .eq('id', rate.id);
        srFixed++;
        console.log(`   Fixed: ${rate.courier} - "${rate.state}" → "${updates.state}"`);
      }
    }
    console.log(`   ✅ Fixed ${srFixed} shipping rates\n`);

    console.log('✅ Whitespace cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixWhitespace().then(() => process.exit(0));
