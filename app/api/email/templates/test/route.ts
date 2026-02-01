/**
 * Email Template Test API
 *
 * POST /api/email/templates/test - Send a test email
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { sendEmail } from '@/lib/email/send-email';
import { isTemplateAvailable } from '@/lib/email/templates';
import type { EmailType } from '@/types/email';
import type { SupportedLanguage } from '@/lib/firestore/conversions';

interface TestEmailRequest {
  emailType: EmailType;
  recipientEmail: string;
  language?: SupportedLanguage;
}

// Test variables for each email type
const TEST_VARIABLES: Record<EmailType, Record<string, unknown>> = {
  magic_link: {
    magicLinkUrl: 'https://ora-wellbeing.com/auth/magic-link/verify?token=test-token-123',
    expiresIn: '1 heure',
    ipAddress: '192.168.1.1',
    userAgent: 'Chrome/120.0.0.0 (Test Browser)',
  },
  email_verification: {
    verificationUrl: 'https://ora-wellbeing.com/verify?token=test-verification-123',
  },
  password_reset: {
    resetUrl: 'https://ora-wellbeing.com/reset-password?token=test-reset-123',
    expiresIn: '1 heure',
    ipAddress: '192.168.1.1',
  },
  security_alert: {
    alertType: 'new_login',
    deviceInfo: 'Chrome on Windows 10',
    location: 'Paris, France',
    timestamp: new Date().toLocaleString('fr-FR'),
  },
  welcome: {
    firstName: 'Test User',
    onboardingUrl: 'https://ora-wellbeing.com/onboarding',
    dashboardUrl: 'https://ora-wellbeing.com/dashboard',
  },
  onboarding_complete: {
    firstName: 'Test User',
    recommendedPrograms: [
      { id: '1', title: 'Yoga pour debutants', imageUrl: undefined },
      { id: '2', title: 'Meditation matinale', imageUrl: undefined },
      { id: '3', title: 'Relaxation profonde', imageUrl: undefined },
    ],
    firstLessonUrl: 'https://ora-wellbeing.com/lesson/test-lesson',
  },
  inactivity_7d: {
    firstName: 'Test User',
    lastActivityDate: '15 janvier 2025',
    suggestedContent: [
      { id: '1', title: 'Yoga doux', type: 'lesson' },
      { id: '2', title: 'Meditation guidee', type: 'lesson' },
    ],
  },
  inactivity_30d: {
    firstName: 'Test User',
    lastActivityDate: '1 decembre 2024',
    suggestedContent: [],
  },
  streak_milestone: {
    firstName: 'Test User',
    streakDays: 7,
    nextMilestone: 14,
  },
  first_completion: {
    firstName: 'Test User',
    milestoneType: 'first_lesson',
    achievementTitle: 'Premiere lecon terminee',
    nextSuggestion: 'Continuez avec la meditation matinale',
  },
  program_complete: {
    firstName: 'Test User',
    programTitle: 'Yoga pour debutants',
  },
  new_content: {
    contentTitle: 'Nouvelle lecon: Respiration consciente',
    contentType: 'lesson',
    contentUrl: 'https://ora-wellbeing.com/lesson/respiration-consciente',
    contentDescription: 'Apprenez les bases de la respiration consciente',
    authorName: 'Marie Dupont',
  },
  weekly_digest: {
    firstName: 'Test User',
    weekStartDate: '20 janvier 2025',
    weekEndDate: '26 janvier 2025',
    newContent: [
      { id: '1', title: 'Nouvelle lecon de yoga', type: 'lesson' },
    ],
    lessonsCompleted: 3,
    minutesPracticed: 45,
    currentStreak: 5,
    tips: ['Essayez de pratiquer chaque matin'],
  },
  program_recommendation: {
    firstName: 'Test User',
    programs: [
      { id: '1', title: 'Yoga intermediaire', description: 'Approfondissez votre pratique' },
    ],
    basedOn: 'vos objectifs de flexibilite',
  },
  account_change: {
    changeType: 'email_updated',
    changeDetails: 'Votre adresse email a ete modifiee',
  },
  subscription_confirmed: {
    planName: 'Premium Annuel',
    price: '99,00 EUR',
  },
  subscription_expiring: {
    expiresAt: '15 fevrier 2025',
    renewUrl: 'https://ora-wellbeing.com/renew',
  },
  payment_failed: {
    retryUrl: 'https://ora-wellbeing.com/payment/retry',
    amount: '9,99 EUR',
  },
};

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body: TestEmailRequest = await request.json();
    const { emailType, recipientEmail, language = 'fr' } = body;

    // Validate email type
    if (!emailType || !recipientEmail) {
      return apiError('emailType and recipientEmail are required', 400);
    }

    // Check if template is available
    if (!isTemplateAvailable(emailType)) {
      return apiError(`Template for ${emailType} is not yet implemented`, 400);
    }

    // Get test variables
    const variables = TEST_VARIABLES[emailType] || {};

    // Send test email
    const result = await sendEmail({
      emailType,
      recipientEmail,
      language,
      variables,
      triggeredBy: 'admin',
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to send test email', 500);
    }

    return apiSuccess({
      success: true,
      messageId: result.messageId,
      emailType,
      recipientEmail,
    });
  } catch (error: unknown) {
    console.error('[Email Test] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send test email';
    return apiError(errorMessage, 500);
  }
}
