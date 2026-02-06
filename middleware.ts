import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Middleware to:
 * 1. Refresh Supabase auth session on every request
 * 2. Protect /admin routes (redirect to login if not authenticated)
 */
export async function middleware(request: NextRequest) {
  // Refresh Supabase session
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

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
