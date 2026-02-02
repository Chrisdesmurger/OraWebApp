/**
 * Email Template Preview API
 *
 * GET /api/email/templates/preview - Get rendered HTML preview of a template
 */

import { NextRequest } from 'next/server';
import { render } from '@react-email/components';
import { createElement } from 'react';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getEmailComponent } from '@/lib/email/templates';
import { getBaseUrl } from '@/lib/email/resend';
import type { EmailType } from '@/types/email';
import type { SupportedLanguage } from '@/lib/firestore/conversions';

// Preview variables for each email type
const PREVIEW_VARIABLES: Record<EmailType, Record<string, unknown>> = {
  magic_link: {
    magicLinkUrl: 'https://ora-wellbeing.com/auth/magic-link/verify?token=preview-token',
    expiresIn: '1 heure',
    ipAddress: '192.168.1.1',
    userAgent: 'Chrome/120.0.0.0 (Preview)',
  },
  email_verification: {
    verificationUrl: 'https://ora-wellbeing.com/verify?token=preview-verification',
  },
  password_reset: {
    resetUrl: 'https://ora-wellbeing.com/reset-password?token=preview-reset',
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
    firstName: 'Marie',
    onboardingUrl: 'https://ora-wellbeing.com/onboarding',
    dashboardUrl: 'https://ora-wellbeing.com/dashboard',
  },
  onboarding_complete: {
    firstName: 'Marie',
    recommendedPrograms: [
      { id: '1', title: 'Yoga pour debutants', imageUrl: undefined },
      { id: '2', title: 'Meditation matinale', imageUrl: undefined },
      { id: '3', title: 'Relaxation profonde', imageUrl: undefined },
    ],
    firstLessonUrl: 'https://ora-wellbeing.com/lesson/introduction',
  },
  inactivity_7d: {
    firstName: 'Marie',
    lastActivityDate: '15 janvier 2025',
    suggestedContent: [
      { id: '1', title: 'Yoga doux', type: 'lesson' },
      { id: '2', title: 'Meditation guidee', type: 'lesson' },
    ],
  },
  inactivity_30d: {
    firstName: 'Marie',
    lastActivityDate: '1 decembre 2024',
    suggestedContent: [],
  },
  streak_milestone: {
    firstName: 'Marie',
    streakDays: 7,
    nextMilestone: 14,
  },
  first_completion: {
    firstName: 'Marie',
    milestoneType: 'first_lesson',
    achievementTitle: 'Premiere lecon terminee',
    nextSuggestion: 'Continuez avec la meditation matinale',
  },
  program_complete: {
    firstName: 'Marie',
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
    firstName: 'Marie',
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
    firstName: 'Marie',
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

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { searchParams } = new URL(request.url);
    const emailType = searchParams.get('type') as EmailType;
    const language = (searchParams.get('language') || 'fr') as SupportedLanguage;

    if (!emailType) {
      return apiError('type parameter is required', 400);
    }

    // Get the template component
    const EmailComponent = getEmailComponent(emailType);
    if (!EmailComponent) {
      return apiError(`Template for ${emailType} is not available`, 404);
    }

    // Get preview variables
    const variables = PREVIEW_VARIABLES[emailType] || {};

    // Build props
    const emailProps = {
      recipientEmail: 'preview@example.com',
      language,
      baseUrl: getBaseUrl(),
      ...variables,
    };

    // Render to HTML
    const emailElement = createElement(EmailComponent, emailProps);
    const html = await render(emailElement);

    return apiSuccess({ html, emailType, language });
  } catch (error: unknown) {
    console.error('[Email Preview] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate preview';
    return apiError(errorMessage, 500);
  }
}
