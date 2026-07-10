import { NextResponse } from 'next/server';

const CANONICAL_HOST = 'www.ailem.uz';

export function middleware(request) {
  const { nextUrl } = request;
  const host = (request.headers.get('host') || '').toLowerCase();

  // Canonicalize the bare apex (ailem.uz) → www.ailem.uz.
  // The site is served on BOTH hosts, but the Telegram Login Widget only accepts
  // ONE domain registered in BotFather (www.ailem.uz) — so a visitor on the apex
  // host gets "Bot domain invalid". Forcing a single host keeps the widget domain
  // consistent. /api is excluded so payment/Telegram webhooks are never redirected
  // (a redirect would drop the POST body).
  if (host === 'ailem.uz' && !nextUrl.pathname.startsWith('/api')) {
    const url = nextUrl.clone();
    url.protocol = 'https:';
    url.host = CANONICAL_HOST;
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  // Redirect ?admin=true to /admin
  if (nextUrl.searchParams.get('admin') === 'true') {
    const url = nextUrl.clone();
    url.pathname = '/admin';
    url.searchParams.delete('admin');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all page routes so canonicalization covers /login etc.
  // Exclude API (webhooks), Next internals, and static asset files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
