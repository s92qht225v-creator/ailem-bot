#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Import the translation functions
const LOCATION_TRANSLATIONS = {
  states: {
    'Tashkent Region': {
      uz: 'Toshkent viloyati',
      ru: 'Ташкентская область',
      en: 'Tashkent Region'
    },
    'Samarkand Region': {
      uz: 'Samarqand viloyati',
      ru: 'Самаркандская область',
      en: 'Samarkand Region'
    }
  }
};

function normalizeLocationToEnglish(locationName, type = 'state') {
  if (!locationName) return null;

  const locations = LOCATION_TRANSLATIONS[type === 'state' ? 'states' : 'cities'];
  const lowerName = locationName.toLowerCase();

  if (locations[locationName]) {
    return locationName;
  }

  for (const [englishName, translations] of Object.entries(locations)) {
    if (translations.uz === locationName || translations.ru === locationName) {
      return englishName;
    }

    if (translations.en.toLowerCase() === lowerName) {
      return englishName;
    }

    const uzLower = translations.uz.toLowerCase();
    const ruLower = translations.ru.toLowerCase();
    if (uzLower === lowerName || ruLower === lowerName) {
      return englishName;
    }
  }

  return locationName;
}

async function testShippingCalculation() {
  console.log('🧪 Testing Shipping Calculation Flow\n');

  // Get shipping rates
  const { data: shippingRates } = await supabase
    .from('shipping_rates')
    .select('*');

  console.log('📊 Shipping Rates in Database:');
  console.table(shippingRates);

  // Test scenarios
  const testCases = [
    { courier: 'Starex', state: 'Samarqand viloyat', lang: 'uz', weight: 1 },
    { courier: 'Starex', state: 'Самаркандская область', lang: 'ru', weight: 1 },
    { courier: 'Starex', state: 'Samarkand Region', lang: 'en', weight: 1 },
    { courier: 'Starex', state: 'Samarqand region', lang: 'db', weight: 1 },
  ];

  console.log('\n🧪 Test Cases:\n');

  for (const test of testCases) {
    const normalized = normalizeLocationToEnglish(test.state, 'state');

    console.log(`Test: ${test.lang.toUpperCase()} - ${test.courier} - ${test.state}`);
    console.log(`  Normalized: "${normalized}"`);

    // Try to find matching rate
    const rate = shippingRates?.find(r => {
      if (r.courier !== test.courier) return false;

      const rStateLower = r.state?.toLowerCase();
      const normalizedLower = normalized?.toLowerCase();
      const stateLower = test.state?.toLowerCase();

      const match = rStateLower === normalizedLower ||
                    rStateLower === stateLower ||
                    r.state === normalized ||
                    r.state === test.state;

      console.log(`    Comparing: "${r.state}" (${rStateLower}) vs "${normalized}" (${normalizedLower}) OR "${test.state}" (${stateLower})`);
      console.log(`    Match: ${match}`);

      return match;
    });

    if (rate) {
      const cost = test.weight <= 1 ? rate.first_kg : rate.first_kg + (Math.ceil(test.weight - 1) * rate.additional_kg);
      console.log(`  ✅ Found Rate: ${cost} UZS`);
    } else {
      console.log(`  ❌ No rate found`);
    }
    console.log('');
  }

  // Check what states exist in pickup points
  console.log('\n📍 States in Pickup Points:');
  const { data: pickupPoints } = await supabase
    .from('pickup_points')
    .select('state, language, courier_service')
    .order('language');

  const statesByLang = {};
  pickupPoints?.forEach(p => {
    if (!statesByLang[p.language]) statesByLang[p.language] = new Set();
    statesByLang[p.language].add(p.state);
  });

  Object.entries(statesByLang).forEach(([lang, states]) => {
    console.log(`\n${lang}:`);
    [...states].forEach(state => {
      const normalized = normalizeLocationToEnglish(state, 'state');
      console.log(`  "${state}" → normalized: "${normalized}"`);
    });
  });
}

testShippingCalculation();
