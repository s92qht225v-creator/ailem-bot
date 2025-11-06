#!/usr/bin/env node

/**
 * Language Migration Script
 * Duplicates all Uzbek pickup points with Russian translations
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Translation mappings
const STATE_TRANSLATIONS = {
  'Toshkent viloyati': 'Ташкентская область',
  'Tashkent Region': 'Ташкентская область',
  'Samarqand viloyati': 'Самаркандская область',
  'Samarkand Region': 'Самаркандская область',
  'Buxoro viloyati': 'Бухарская область',
  'Bukhara Region': 'Бухарская область',
  'Farg\'ona viloyati': 'Ферганская область',
  'Fergana Region': 'Ферганская область',
  'Andijon viloyati': 'Андижанская область',
  'Andijan Region': 'Андижанская область',
  'Namangan viloyati': 'Наманганская область',
  'Namangan Region': 'Наманганская область',
  'Qashqadaryo viloyati': 'Кашкадарьинская область',
  'Kashkadarya Region': 'Кашкадарьинская область',
  'Surxondaryo viloyati': 'Сурхандарьинская область',
  'Surkhandarya Region': 'Сурхандарьинская область',
  'Jizzax viloyati': 'Джизакская область',
  'Jizzakh Region': 'Джизакская область',
  'Sirdaryo viloyati': 'Сырдарьинская область',
  'Sirdaryo Region': 'Сырдарьинская область',
  'Xorazm viloyati': 'Хорезмская область',
  'Khorezm Region': 'Хорезмская область',
  'Navoiy viloyati': 'Навоийская область',
  'Navoi Region': 'Навоийская область',
  'Qoraqalpog\'iston Respublikasi': 'Республика Каракалпакстан',
  'Karakalpakstan': 'Республика Каракалпакстан',
  'Toshkent shahri': 'город Ташкент',
  'Tashkent': 'город Ташкент'
};

const CITY_TRANSLATIONS = {
  'Toshkent': 'Ташкент',
  'Tashkent': 'Ташкент',
  'Samarqand': 'Самарканд',
  'Samarkand': 'Самарканд',
  'Buxoro': 'Бухара',
  'Bukhara': 'Бухара',
  'Farg\'ona': 'Фергана',
  'Fergana': 'Фергана',
  'Andijon': 'Андижан',
  'Andijan': 'Андижан',
  'Namangan': 'Наманган',
  'Qarshi': 'Карши',
  'Karshi': 'Карши',
  'Nukus': 'Нукус',
  'Urganch': 'Ургенч',
  'Urgench': 'Ургенч',
  'Jizzax': 'Джизак',
  'Jizzakh': 'Джизак',
  'Navoiy': 'Навои',
  'Navoi': 'Навои',
  'Termiz': 'Термез',
  'Termez': 'Термез',
  'Guliston': 'Гулистан',
  'Gulistan': 'Гулистан'
};

async function runMigration() {
  console.log('🚀 Starting language migration...\n');

  try {
    // Step 1: Update existing points to have 'uz' language
    console.log('📝 Step 1: Marking existing points as Uzbek...');
    const { error: updateError } = await supabase
      .from('pickup_points')
      .update({ language: 'uz' })
      .or('language.is.null,language.eq.uz');

    if (updateError) {
      console.error('❌ Error updating existing points:', updateError);
      throw updateError;
    }
    console.log('✅ Existing points marked as Uzbek\n');

    // Step 2: Fetch all Uzbek points
    console.log('📝 Step 2: Fetching Uzbek pickup points...');
    const { data: uzbekPoints, error: fetchError } = await supabase
      .from('pickup_points')
      .select('*')
      .eq('language', 'uz');

    if (fetchError) {
      console.error('❌ Error fetching Uzbek points:', fetchError);
      throw fetchError;
    }

    console.log(`✅ Found ${uzbekPoints.length} Uzbek pickup points\n`);

    // Step 3: Check for existing Russian points
    console.log('📝 Step 3: Checking for existing Russian translations...');
    const { data: existingRussian, error: checkError } = await supabase
      .from('pickup_points')
      .select('id, courier_service, address')
      .eq('language', 'ru');

    if (checkError) {
      console.error('❌ Error checking Russian points:', checkError);
      throw checkError;
    }

    const existingAddresses = new Set(
      existingRussian.map(p => `${p.courier_service}:${p.address}`)
    );
    console.log(`ℹ️  Found ${existingRussian.length} existing Russian entries\n`);

    // Step 4: Create Russian translations
    console.log('📝 Step 4: Creating Russian translations...');
    let created = 0;
    let skipped = 0;

    for (const point of uzbekPoints) {
      // Check if Russian version already exists
      const key = `${point.courier_service}:${point.address}`;
      if (existingAddresses.has(key)) {
        skipped++;
        continue;
      }

      // Translate state and city
      const translatedState = STATE_TRANSLATIONS[point.state] || point.state;
      const translatedCity = CITY_TRANSLATIONS[point.city] || point.city;

      // Create Russian version
      const russianPoint = {
        courier_service: point.courier_service,
        state: translatedState,
        city: translatedCity,
        address: point.address, // Keep in Latin
        working_hours: point.working_hours,
        phone: point.phone,
        active: point.active,
        language: 'ru'
      };

      const { error: insertError } = await supabase
        .from('pickup_points')
        .insert([russianPoint]);

      if (insertError) {
        console.error(`❌ Error creating Russian version for ${point.courier_service} - ${point.address}:`, insertError.message);
        continue;
      }

      created++;
      if (created % 10 === 0) {
        console.log(`   Created ${created} Russian entries...`);
      }
    }

    console.log(`✅ Created ${created} new Russian entries`);
    if (skipped > 0) {
      console.log(`ℹ️  Skipped ${skipped} existing entries\n`);
    }

    // Step 5: Summary
    console.log('📊 Migration Summary:');
    const { data: summary, error: summaryError } = await supabase
      .from('pickup_points')
      .select('language');

    if (!summaryError) {
      const counts = summary.reduce((acc, p) => {
        acc[p.language] = (acc[p.language] || 0) + 1;
        return acc;
      }, {});

      console.log('\nTotal pickup points by language:');
      Object.entries(counts).forEach(([lang, count]) => {
        console.log(`  ${lang}: ${count}`);
      });
    }

    // Step 6: Show examples
    console.log('\n📝 Sample translations:');
    const { data: samples } = await supabase
      .from('pickup_points')
      .select('courier_service, state, city, address, language')
      .order('courier_service')
      .order('language')
      .limit(6);

    if (samples) {
      console.table(samples);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test checkout in Uzbek language');
    console.log('   2. Test checkout in Russian language');
    console.log('   3. Verify shipping fees calculate correctly');
    console.log('   4. Deploy frontend changes: vercel --prod --yes\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   Pickup Points Language Migration - Uzbek/Russian    ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

runMigration().then(() => {
  console.log('Done!');
  process.exit(0);
});
