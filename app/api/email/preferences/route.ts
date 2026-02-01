/**
 * Email Preferences API
 *
 * GET /api/email/preferences - Get current user's email preferences
 * PUT /api/email/preferences - Update current user's email preferences
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import {
  getUserEmailPreferences,
  updateUserEmailPreferences,
} from '@/lib/email/preferences';
import type { EmailPreferences } from '@/types/email';

/**
 * GET /api/email/preferences - Get user's email preferences
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const preferences = await getUserEmailPreferences(user.uid);

    return apiSuccess({ preferences });
  } catch (error: unknown) {
    console.error('[Email Preferences GET] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get preferences';
    return apiError(errorMessage, 500);
  }
}

/**
 * PUT /api/email/preferences - Update user's email preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const body = await request.json();
    const updates: Partial<EmailPreferences> = {};

    // Validate and extract allowed fields
    const allowedFields = [
      'welcomeEmails',
      'engagementEmails',
      'marketingEmails',
      'weeklyDigest',
      'newContentNotifications',
      'streakReminders',
      'inactivityReminders',
      'programRecommendations',
      'digestFrequency',
      'preferredLanguage',
    ];

    for (const field of allowedFields) {
      if (field in body) {
        (updates as Record<string, unknown>)[field] = body[field];
      }
    }

    // Validate digestFrequency
    if (updates.digestFrequency && !['daily', 'weekly', 'monthly', 'never'].includes(updates.digestFrequency)) {
      return apiError('Invalid digestFrequency value', 400);
    }

    // Validate preferredLanguage
    if (updates.preferredLanguage && !['fr', 'en', 'es'].includes(updates.preferredLanguage)) {
      return apiError('Invalid preferredLanguage value', 400);
    }

    const preferences = await updateUserEmailPreferences(user.uid, updates);

    return apiSuccess({ preferences });
  } catch (error: unknown) {
    console.error('[Email Preferences PUT] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
    return apiError(errorMessage, 500);
  }
}
