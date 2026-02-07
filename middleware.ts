import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Middleware to:
 * 1. Refresh Supabase auth session on every request
 * 2. Protect /admin routes (redirect to login if not authenticated)
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  console.log(`[MW] ${request.method} ${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`);

  // If an auth code lands on a non-callback route, redirect to /auth/callback
  if (searchParams.get('code') && !pathname.startsWith('/auth/callback')) {
    console.log('[MW] Stray code detected, redirecting to /auth/callback');
    const callbackUrl = new URL('/auth/callback', request.url);
    callbackUrl.search = request.nextUrl.search;
    return NextResponse.redirect(callbackUrl);
  }

  // Skip session refresh for /auth/callback to preserve PKCE code verifier cookie
  if (pathname.startsWith('/auth/callback')) {
    console.log('[MW] /auth/callback - skipping updateSession');
    return NextResponse.next();
  }

  // Refresh Supabase session
  const response = await updateSession(request);

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    const allCookies = request.cookies.getAll();
    const authCookies = allCookies.filter(
      (cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
    );
    console.log(`[MW] /admin - auth cookies found: ${authCookies.length} (${authCookies.map(c => c.name).join(', ')})`);

    if (authCookies.length === 0) {
      console.log('[MW] No auth cookies → redirecting to /login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
