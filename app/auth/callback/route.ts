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

    if (!error) {
      // Use x-forwarded-host for deployments behind a proxy (Vercel)
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
  }

  // Auth failed - redirect to login with error
  return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin));
}
