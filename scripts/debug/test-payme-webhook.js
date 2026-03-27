// Test Payme Webhook Authentication
// Run with: node test-payme-webhook.js

import 'dotenv/config';

const isTestMode = process.env.VITE_PAYME_TEST_MODE !== 'false';
const candidateKeys = [
  process.env.PAYME_KEY,
  isTestMode ? process.env.PAYME_TEST_KEY : undefined,
];

if (process.env.PAYME_ADDITIONAL_KEYS) {
  candidateKeys.push(
    ...process.env.PAYME_ADDITIONAL_KEYS
      .split(',')
      .map(key => key.trim())
      .filter(Boolean)
  );
}

console.log('\n🔍 Payme Webhook Configuration Check\n');
console.log('Environment:', {
  VITE_PAYME_TEST_MODE: process.env.VITE_PAYME_TEST_MODE,
  isTestMode,
  VITE_PAYME_MERCHANT_ID: process.env.VITE_PAYME_MERCHANT_ID
});

console.log('\n📋 Available Keys:');
console.log('  PAYME_KEY:', process.env.PAYME_KEY ? '✅ Set' : '❌ Not set');
console.log('  PAYME_TEST_KEY:', process.env.PAYME_TEST_KEY ? '✅ Set' : '❌ Not set');
console.log('  PAYME_ADDITIONAL_KEYS:', process.env.PAYME_ADDITIONAL_KEYS ? '✅ Set' : '❌ Not set');

const validKeys = candidateKeys.filter(Boolean);
console.log('\n✅ Valid Keys Count:', validKeys.length);

if (validKeys.length === 0) {
  console.log('\n❌ ERROR: No valid keys configured!');
  console.log('\nTo fix this:');
  if (isTestMode) {
    console.log('1. Add PAYME_TEST_KEY to your .env file');
    console.log('2. Or add PAYME_KEY to your .env file');
  } else {
    console.log('1. Add PAYME_KEY to your .env file');
  }
  process.exit(1);
}

console.log('\n🔐 Expected Authorization Headers:');
validKeys.forEach((key, index) => {
  const authHeader = `Basic ${Buffer.from(`Paycom:${key}`).toString('base64')}`;
  console.log(`\n  Key ${index + 1}:`);
  console.log(`    Raw key: ${key.substring(0, 10)}...`);
  console.log(`    Auth header: ${authHeader.substring(0, 30)}...`);
  console.log(`    Full header: ${authHeader}`);
});

console.log('\n\n📝 Test Request Example:');
console.log('curl -X POST http://localhost:3000/api/payme-webhook \\');
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Authorization: Basic ${Buffer.from(`Paycom:${validKeys[0]}`).toString('base64')}" \\`);
console.log(`  -d '{`);
console.log(`    "jsonrpc": "2.0",`);
console.log(`    "id": 123,`);
console.log(`    "method": "CheckPerformTransaction",`);
console.log(`    "params": {`);
console.log(`      "amount": 10000,`);
console.log(`      "account": { "order_id": "test-123" }`);
console.log(`    }`);
console.log(`  }'`);

console.log('\n\n💡 Troubleshooting:');
console.log('1. If you\'re using test.paycom.uz, set VITE_PAYME_TEST_MODE=true');
console.log('2. Add PAYME_TEST_KEY with your test environment key');
console.log('3. Contact Payme support to get test credentials: support@paycom.uz');
console.log('4. Check Vercel environment variables if deployed');
console.log('\n');
