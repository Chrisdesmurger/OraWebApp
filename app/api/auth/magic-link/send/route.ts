/**
 * POST /api/auth/magic-link/send
 *
 * Send a magic link email for passwordless authentication.
 * This endpoint is PUBLIC - no authentication required.
 *
 * Rate limited to prevent abuse.
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/send-email';
import {
  createMagicLinkToken,
  generateMagicLinkUrl,
  getExpiryString,
  checkRateLimit,
} from '@/lib/email/magic-link';
import { getBaseUrl, isValidEmail } from '@/lib/email/resend';
import type { SupportedLanguage } from '@/lib/firestore/conversions';

interface SendMagicLinkRequest {
  email: string;
  language?: SupportedLanguage;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: SendMagicLinkRequest = await request.json();
    const { email, language = 'fr' } = body;

    // Validate email
    if (!email) {
      return apiError('Email is required', 400);
    }

    if (!isValidEmail(email)) {
      return apiError('Invalid email address', 400);
    }

    // Get client info for logging and security
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Check rate limit
    const rateLimit = await checkRateLimit(email);
    if (!rateLimit.allowed) {
      return apiError(
        'Too many requests. Please try again later.',
        429
      );
    }

    // Check if user exists in the system (optional - depends on your requirements)
    // If you want to allow magic links only for existing users, uncomment this:
    /*
    const firestore = getFirestore();
    const userSnapshot = await firestore
      .collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      // Don't reveal if user exists or not for security
      // Just pretend we sent the email
      return apiSuccess({
        success: true,
        message: 'If an account exists with this email, a login link has been sent.',
      });
    }
    */

    // Create magic link token
    const tokenResult = await createMagicLinkToken(
      email,
      language,
      ipAddress,
      userAgent
    );

    if (!tokenResult.success || !tokenResult.token) {
      console.error('[MagicLink] Failed to create token:', tokenResult.error);
      return apiError('Failed to create login link. Please try again.', 500);
    }

    // Generate magic link URL
    const baseUrl = getBaseUrl();
    const magicLinkUrl = generateMagicLinkUrl(tokenResult.token, baseUrl);
    const expiresIn = getExpiryString(language);

    // Send email
    const emailResult = await sendEmail({
      emailType: 'magic_link',
      recipientEmail: email,
      language,
      variables: {
        magicLinkUrl,
        expiresIn,
        ipAddress,
        userAgent,
      },
      priority: 'high',
      triggeredBy: 'user',
      ipAddress,
      userAgent,
    });

    if (!emailResult.success) {
      console.error('[MagicLink] Failed to send email:', emailResult.error);
      return apiError(
        'Failed to send login link. Please try again.',
        500
      );
    }

    console.log(`[MagicLink] Sent magic link to ${email}`);

    // Don't reveal too much info for security
    return apiSuccess({
      success: true,
      message: 'If an account exists with this email, a login link has been sent.',
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send magic link';
    console.error('[API] POST /api/auth/magic-link/send error:', errorMessage);
    return apiError('An error occurred. Please try again.', 500);
  }
}
