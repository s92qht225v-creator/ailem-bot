#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkData() {
  console.log('🔍 Checking Shipping Data...\n');

  // Check pickup points
  console.log('📍 PICKUP POINTS:');
  const { data: pickupPoints } = await supabase
    .from('pickup_points')
    .select('courier_service, state, city, language')
    .order('language')
    .order('courier_service');

  if (pickupPoints) {
    console.log('\nUnique states by language:');
    const statesByLang = pickupPoints.reduce((acc, p) => {
      if (!acc[p.language]) acc[p.language] = new Set();
      acc[p.language].add(p.state);
      return acc;
    }, {});

    Object.entries(statesByLang).forEach(([lang, states]) => {
      console.log(`\n${lang.toUpperCase()}:`);
      [...states].forEach(state => console.log(`  - ${state}`));
    });
  }

  // Check shipping rates
  console.log('\n\n💰 SHIPPING RATES:');
  const { data: shippingRates } = await supabase
    .from('shipping_rates')
    .select('*')
    .order('courier')
    .order('state');

  if (shippingRates && shippingRates.length > 0) {
    console.table(shippingRates.map(r => ({
      courier: r.courier,
      state: r.state,
      firstKg: r.first_kg,
      additionalKg: r.additional_kg
    })));
  } else {
    console.log('⚠️  No shipping rates found in database!');
    console.log('   Using default rates from ShippingRatesContext');
  }

  console.log('\n\n🔧 DIAGNOSIS:');

  // Check if states match
  if (pickupPoints && shippingRates) {
    const pickupStates = new Set(pickupPoints.map(p => p.state));
    const rateStates = new Set(shippingRates.map(r => r.state));

    console.log('\nStates in pickup_points:', [...pickupStates]);
    console.log('States in shipping_rates:', [...rateStates]);

    const missingRates = [...pickupStates].filter(s => !rateStates.has(s));
    if (missingRates.length > 0) {
      console.log('\n⚠️  WARNING: These states have pickup points but NO shipping rates:');
      missingRates.forEach(s => console.log(`  - ${s}`));
      console.log('\n💡 Solution: Add shipping rates for these states in admin panel');
    }
  }
}

checkData();
