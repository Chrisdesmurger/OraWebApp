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

  // If an auth code lands on a non-callback route, redirect to /auth/callback
  // This happens when Supabase redirects to the Site URL (root) instead of /auth/callback
  // because the preview/deploy URL isn't in the allowed redirect URLs list
  if (searchParams.get('code') && !pathname.startsWith('/auth/callback')) {
    const callbackUrl = new URL('/auth/callback', request.url);
    callbackUrl.search = request.nextUrl.search;
    return NextResponse.redirect(callbackUrl);
  }

  // Refresh Supabase session
  const response = await updateSession(request);

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Check for Supabase auth cookies (includes chunked cookies like sb-xxx-auth-token.0)
    const hasAuthCookies = request.cookies.getAll().some(
      (cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
    );

    if (!hasAuthCookies) {
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
