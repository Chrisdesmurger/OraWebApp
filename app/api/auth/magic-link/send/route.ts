/**
 * POST /api/auth/magic-link/send
 *
 * Send a magic link email for passwordless authentication.
 * This endpoint is PUBLIC - no authentication required.
 *
 * Uses Supabase Auth native magic link (OTP) support.
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

interface SendMagicLinkRequest {
  email: string;
  language?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendMagicLinkRequest = await request.json();
    const { email } = body;

    if (!email) {
      return apiError('Email is required', 400);
    }

    // Use Supabase Admin to send magic link OTP
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (error) {
      console.error('[MagicLink] Failed to generate magic link:', error.message);
      return apiError('Failed to send login link. Please try again.', 500);
    }

    console.log(`[MagicLink] Sent magic link to ${email}`);

    return apiSuccess({
      success: true,
      message: 'If an account exists with this email, a login link has been sent.',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
    console.error('[API] POST /api/auth/magic-link/send error:', errorMessage);
    return apiError('An error occurred. Please try again.', 500);
  }
}
