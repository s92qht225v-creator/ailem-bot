import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkData() {
  console.log('🔍 Checking Database State...\n');

  // Check pickup points
  const { data: pickupPoints, error: ppError } = await supabase
    .from('pickup_points')
    .select('*');

  console.log('📍 PICKUP POINTS:');
  console.log(`   Total: ${pickupPoints?.length || 0}`);
  if (ppError) console.error('   Error:', ppError.message);
  if (pickupPoints && pickupPoints.length > 0) {
    console.log('   Sample:');
    console.table(pickupPoints.slice(0, 3).map(p => ({
      courier: p.courier_service,
      state: p.state,
      city: p.city,
      active: p.active
    })));
  }

  // Check shipping rates
  const { data: shippingRates, error: srError } = await supabase
    .from('shipping_rates')
    .select('*');

  console.log('\n💰 SHIPPING RATES:');
  console.log(`   Total: ${shippingRates?.length || 0}`);
  if (srError) console.error('   Error:', srError.message);
  if (shippingRates && shippingRates.length > 0) {
    console.log('   All rates:');
    console.table(shippingRates.map(r => ({
      courier: r.courier,
      state: r.state,
      firstKg: r.first_kg,
      additionalKg: r.additional_kg
    })));
  }

  // Check if columns exist
  console.log('\n🔧 SCHEMA CHECK:');
  const { data: ppSchema } = await supabase
    .from('pickup_points')
    .select('*')
    .limit(1);

  if (ppSchema && ppSchema.length > 0) {
    console.log('   Pickup points columns:', Object.keys(ppSchema[0]).join(', '));
  }
}

checkData().then(() => process.exit(0));
