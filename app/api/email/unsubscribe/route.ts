/**
 * Email Unsubscribe API
 *
 * POST /api/email/unsubscribe - Unsubscribe from emails using signed token
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/auth-middleware';
import {
  verifyUnsubscribeToken,
  unsubscribeFromAll,
  updateUserEmailPreferences,
} from '@/lib/email/preferences';

interface UnsubscribeRequest {
  token: string;
  reason?: string;
  unsubscribeType?: 'all' | 'marketing' | 'engagement' | 'digest';
}

/**
 * POST /api/email/unsubscribe - Process unsubscribe request
 *
 * This is a public endpoint that uses signed tokens for authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body: UnsubscribeRequest = await request.json();
    const { token, reason, unsubscribeType = 'all' } = body;

    if (!token) {
      return apiError('Token is required', 400);
    }

    // Verify the token
    const tokenResult = verifyUnsubscribeToken(token);

    if (!tokenResult.valid || !tokenResult.userId) {
      return apiError('Invalid or expired unsubscribe link', 400);
    }

    const { userId, email } = tokenResult;

    // Process unsubscribe based on type
    switch (unsubscribeType) {
      case 'all':
        await unsubscribeFromAll(userId, reason);
        break;
      case 'marketing':
        await updateUserEmailPreferences(userId, {
          marketingEmails: false,
          newContentNotifications: false,
          programRecommendations: false,
        });
        break;
      case 'engagement':
        await updateUserEmailPreferences(userId, {
          engagementEmails: false,
          streakReminders: false,
          inactivityReminders: false,
        });
        break;
      case 'digest':
        await updateUserEmailPreferences(userId, {
          weeklyDigest: false,
          digestFrequency: 'never',
        });
        break;
      default:
        await unsubscribeFromAll(userId, reason);
    }

    console.log(`[Unsubscribe] User ${userId} (${email}) unsubscribed from ${unsubscribeType}`);

    return apiSuccess({
      success: true,
      message: 'Successfully unsubscribed',
      unsubscribeType,
    });
  } catch (error: unknown) {
    console.error('[Unsubscribe] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process unsubscribe';
    return apiError(errorMessage, 500);
  }
}

/**
 * GET /api/email/unsubscribe - Verify token and get unsubscribe options
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return apiError('Token is required', 400);
    }

    // Verify the token
    const tokenResult = verifyUnsubscribeToken(token);

    if (!tokenResult.valid) {
      return apiError('Invalid or expired unsubscribe link', 400);
    }

    return apiSuccess({
      valid: true,
      email: tokenResult.email,
      options: [
        { type: 'all', label: 'Unsubscribe from all emails (except account security)' },
        { type: 'marketing', label: 'Unsubscribe from marketing emails only' },
        { type: 'engagement', label: 'Unsubscribe from engagement reminders only' },
        { type: 'digest', label: 'Unsubscribe from weekly digest only' },
      ],
    });
  } catch (error: unknown) {
    console.error('[Unsubscribe GET] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify token';
    return apiError(errorMessage, 500);
  }
}
