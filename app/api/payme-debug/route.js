import { NextResponse } from 'next/server';

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  const body = await request.json();

  const expectedKey = process.env.PAYME_KEY || process.env.PAYME_TEST_KEY;
  const expectedAuth = expectedKey
    ? `Basic ${Buffer.from(`Paycom:${expectedKey}`).toString('base64')}`
    : 'NOT_SET';

  return NextResponse.json({
    received: {
      authorization: authHeader,
      method: request.method,
      body,
    },
    expected: {
      authorization: expectedAuth.substring(0, 30) + '...',
      hasPaymeKey: !!process.env.PAYME_KEY,
      hasTestKey: !!process.env.PAYME_TEST_KEY,
      testMode: process.env.NEXT_PUBLIC_PAYME_TEST_MODE,
    },
    match: authHeader === expectedAuth,
  });
}
