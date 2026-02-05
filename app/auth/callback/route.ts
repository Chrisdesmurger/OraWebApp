import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Auth callback route
 * Handles OAuth redirects (Google) and magic link verification
 * Supabase Auth redirects here after successful authentication
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to admin dashboard after successful auth
  return NextResponse.redirect(new URL('/admin', request.url));
}
