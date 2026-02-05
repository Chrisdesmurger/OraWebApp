/**
 * GET /api/auth/magic-link/verify
 *
 * Verify a magic link token and authenticate the user.
 * This endpoint is PUBLIC - the token itself provides authentication.
 *
 * Uses Supabase Auth native OTP verification.
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return apiError('Token and email are required', 400);
    }

    // Verify the OTP token via Supabase
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'magiclink',
    });

    if (error || !data.user) {
      return apiError(error?.message || 'Invalid or expired token', 401);
    }

    const user = data.user;

    // Check if this is a new user (no profile yet)
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    const isNewUser = !profile;

    console.log(`[MagicLink] Verified token for user: ${user.id}`);

    return apiSuccess({
      success: true,
      email: user.email,
      uid: user.id,
      isNewUser,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify token';
    console.error('[API] GET /api/auth/magic-link/verify error:', errorMessage);
    return apiError('Failed to verify login link. Please request a new one.', 500);
  }
}
