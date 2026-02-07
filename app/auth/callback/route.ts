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

  console.log(`[CALLBACK] code=${code ? code.substring(0, 8) + '...' : 'null'}, next=${next}`);

  if (code) {
    const cookieStore = await cookies();

    // Log existing cookies before exchange
    const existingCookies = cookieStore.getAll();
    const pkceVerifier = existingCookies.find(c => c.name.includes('code-verifier'));
    console.log(`[CALLBACK] Cookies before exchange: ${existingCookies.length} total, PKCE verifier: ${pkceVerifier ? 'PRESENT' : 'MISSING'}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            console.log(`[CALLBACK] setAll called with ${cookiesToSet.length} cookies: ${cookiesToSet.map(c => c.name).join(', ')}`);
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    console.log(`[CALLBACK] exchangeCodeForSession: ${error ? 'ERROR: ' + error.message : 'SUCCESS'}`);

    if (error) {
      const { data: { user } } = await supabase.auth.getUser();
      console.log(`[CALLBACK] Fallback getUser: ${user ? 'user found (' + user.email + ')' : 'NO USER'}`);
      if (!user) {
        console.log('[CALLBACK] → Redirecting to /login?error=auth_callback_error');
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin));
      }
    }

    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';
    const redirectUrl = isLocalEnv
      ? new URL(next, requestUrl.origin)
      : forwardedHost
        ? new URL(next, `https://${forwardedHost}`)
        : new URL(next, requestUrl.origin);

    console.log(`[CALLBACK] → Redirecting to ${redirectUrl.toString()}`);
    return NextResponse.redirect(redirectUrl);
  }

  console.log('[CALLBACK] No code → redirecting to /login');
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
