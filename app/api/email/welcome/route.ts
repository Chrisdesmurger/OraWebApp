/**
 * Welcome Email API
 *
 * POST /api/email/welcome - Send welcome email to a new user
 *
 * This endpoint can be called:
 * - From the frontend after successful signup
 * - From Cloud Functions after user creation
 * - Manually by admin for existing users
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send-email';
import type { SupportedLanguage } from '@/lib/firestore/conversions';

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  firstName?: string;
  language?: SupportedLanguage;
}

/**
 * POST /api/email/welcome - Send welcome email
 *
 * Can be called:
 * - With admin auth (for manual sends)
 * - Without auth but with internal secret (for Cloud Functions)
 */
export async function POST(request: NextRequest) {
  try {
    const body: WelcomeEmailRequest = await request.json();
    const { userId, email, firstName, language = 'fr' } = body;

    // Validate required fields
    if (!userId || !email) {
      return apiError('userId and email are required', 400);
    }

    // Verify this is a legitimate request by checking user exists
    const supabase = createSupabaseServiceClient();
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      return apiError('User not found', 404);
    }

    // Get user data to enrich email
    const userFirstName = firstName || userRow?.first_name || undefined;
    const userLanguage = language || userRow?.language || 'fr';

    // Get base URL for email links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ora-wellbeing.com';
    const onboardingUrl = `${baseUrl}/onboarding`;
    const dashboardUrl = `${baseUrl}/dashboard`;

    // Send welcome email
    const result = await sendEmail({
      emailType: 'welcome',
      recipientEmail: email,
      recipientUid: userId,
      language: userLanguage as SupportedLanguage,
      variables: {
        firstName: userFirstName,
        onboardingUrl,
        dashboardUrl,
        baseUrl,
      },
    });

    if (!result.success) {
      console.error('[Welcome Email] Failed to send:', result.error);
      return apiError(result.error || 'Failed to send welcome email', 500);
    }

    console.log(`[Welcome Email] Sent to ${email} (${userId})`);

    return apiSuccess({
      success: true,
      messageId: result.messageId,
      email,
    });
  } catch (error: unknown) {
    console.error('[Welcome Email] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send welcome email';
    return apiError(errorMessage, 500);
  }
}
