import { NextResponse } from 'next/server';

export function middleware(request) {
  const { searchParams } = request.nextUrl;

  // Redirect ?admin=true to /admin
  if (searchParams.get('admin') === 'true') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.searchParams.delete('admin');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
