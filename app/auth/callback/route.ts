import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Auth callback route
 * Handles OAuth redirects (Google) and magic link verification
 * Supabase Auth redirects here after successful authentication
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/admin';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Code exchange failed - check if user already has a session
      // (happens on browser retries where the first call already consumed the code)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin));
      }
    }

    // Success (or session already exists from a previous exchange)
    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';

    if (isLocalEnv) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } else if (forwardedHost) {
      return NextResponse.redirect(new URL(next, `https://${forwardedHost}`));
    } else {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
