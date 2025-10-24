// Debug endpoint to see what Payme is sending
export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  const allHeaders = req.headers;

  console.log('=== PAYME DEBUG ===');
  console.log('Method:', req.method);
  console.log('Authorization header:', authHeader);
  console.log('All headers:', JSON.stringify(allHeaders, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));

  const expectedKey = process.env.PAYME_KEY || process.env.PAYME_TEST_KEY;
  const expectedAuth = expectedKey ? `Basic ${Buffer.from(`Paycom:${expectedKey}`).toString('base64')}` : 'NOT_SET';

  console.log('Expected auth:', expectedAuth);
  console.log('Match:', authHeader === expectedAuth);

  return res.json({
    received: {
      authorization: authHeader,
      method: req.method,
      body: req.body
    },
    expected: {
      authorization: expectedAuth.substring(0, 30) + '...',
      hasPaymeKey: !!process.env.PAYME_KEY,
      hasTestKey: !!process.env.PAYME_TEST_KEY,
      testMode: process.env.VITE_PAYME_TEST_MODE
    },
    match: authHeader === expectedAuth
  });
}
