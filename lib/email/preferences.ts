/**
 * Email Preferences Utilities
 *
 * Manages user email preferences and unsubscribe tokens
 */

import * as crypto from 'crypto';
import { getFirestore } from '@/lib/firebase/admin';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type {
  EmailPreferences,
  EmailPreferencesDocument,
  mapEmailPreferencesFromFirestore,
  mapEmailPreferencesToFirestore,
  getDefaultEmailPreferences,
} from '@/types/email';

// ============================================================================
// Unsubscribe Token Management
// ============================================================================

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || 'default-unsubscribe-secret-change-me';

/**
 * Generate a signed unsubscribe token for a user
 */
export function generateUnsubscribeToken(userId: string, email: string): string {
  const data = `${userId}:${email}:${Date.now()}`;
  const signature = crypto
    .createHmac('sha256', UNSUBSCRIBE_SECRET)
    .update(data)
    .digest('hex');

  // Base64 encode the data and signature
  const token = Buffer.from(`${data}:${signature}`).toString('base64url');
  return token;
}

/**
 * Verify and decode an unsubscribe token
 */
export function verifyUnsubscribeToken(
  token: string
): { valid: boolean; userId?: string; email?: string } {
  try {
    // Decode the token
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');

    if (parts.length !== 4) {
      return { valid: false };
    }

    const [userId, email, timestamp, signature] = parts;

    // Verify the signature
    const data = `${userId}:${email}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', UNSUBSCRIBE_SECRET)
      .update(data)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    // Token is valid for 30 days
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (tokenAge > maxAge) {
      return { valid: false };
    }

    return { valid: true, userId, email };
  } catch {
    return { valid: false };
  }
}

// ============================================================================
// Email Preferences CRUD
// ============================================================================

/**
 * Get user email preferences
 */
export async function getUserEmailPreferences(
  userId: string
): Promise<EmailPreferences> {
  const firestore = getFirestore();

  const doc = await firestore
    .collection('users')
    .doc(userId)
    .collection('email_preferences')
    .doc('preferences')
    .get();

  if (!doc.exists) {
    // Return default preferences
    return getDefaultPreferences();
  }

  const data = doc.data() as EmailPreferencesDocument;
  return mapPreferencesFromFirestore(data);
}

/**
 * Update user email preferences
 */
export async function updateUserEmailPreferences(
  userId: string,
  preferences: Partial<EmailPreferences>
): Promise<EmailPreferences> {
  const firestore = getFirestore();

  // Get current preferences
  const current = await getUserEmailPreferences(userId);

  // Merge with updates
  const updated: EmailPreferences = {
    ...current,
    ...preferences,
    // Always keep authentication and transactional enabled
    authenticationEmails: true,
    transactionalEmails: true,
    updatedAt: Date.now(),
  };

  // Convert to Firestore format
  const firestoreData = mapPreferencesToFirestore(updated);

  // Save to Firestore
  await firestore
    .collection('users')
    .doc(userId)
    .collection('email_preferences')
    .doc('preferences')
    .set(firestoreData, { merge: true });

  return updated;
}

/**
 * Unsubscribe user from all marketing emails
 */
export async function unsubscribeFromAll(
  userId: string,
  reason?: string
): Promise<void> {
  const firestore = getFirestore();

  const preferences: Partial<EmailPreferencesDocument> = {
    marketing_emails: false,
    engagement_emails: false,
    weekly_digest: false,
    new_content_notifications: false,
    streak_reminders: false,
    inactivity_reminders: false,
    program_recommendations: false,
    unsubscribed_all: true,
    unsubscribed_at: Date.now(),
    unsubscribe_reason: reason,
    updated_at: Date.now(),
  };

  await firestore
    .collection('users')
    .doc(userId)
    .collection('email_preferences')
    .doc('preferences')
    .set(preferences, { merge: true });
}

/**
 * Check if user can receive a specific email type
 */
export async function canReceiveEmail(
  userId: string,
  emailCategory: 'authentication' | 'welcome' | 'engagement' | 'marketing' | 'transactional'
): Promise<boolean> {
  // Authentication and transactional emails are always sent
  if (emailCategory === 'authentication' || emailCategory === 'transactional') {
    return true;
  }

  const preferences = await getUserEmailPreferences(userId);

  // If globally unsubscribed, only allow required emails
  if (preferences.unsubscribedAll) {
    return false;
  }

  switch (emailCategory) {
    case 'welcome':
      return preferences.welcomeEmails;
    case 'engagement':
      return preferences.engagementEmails;
    case 'marketing':
      return preferences.marketingEmails;
    default:
      return true;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultPreferences(): EmailPreferences {
  return {
    authenticationEmails: true,
    welcomeEmails: true,
    engagementEmails: true,
    marketingEmails: true,
    transactionalEmails: true,
    weeklyDigest: true,
    newContentNotifications: true,
    streakReminders: true,
    inactivityReminders: true,
    programRecommendations: true,
    digestFrequency: 'weekly',
    preferredLanguage: 'fr',
    unsubscribedAll: false,
    updatedAt: Date.now(),
  };
}

function mapPreferencesFromFirestore(doc: EmailPreferencesDocument): EmailPreferences {
  return {
    authenticationEmails: doc.authentication_emails ?? true,
    welcomeEmails: doc.welcome_emails ?? true,
    engagementEmails: doc.engagement_emails ?? true,
    marketingEmails: doc.marketing_emails ?? true,
    transactionalEmails: doc.transactional_emails ?? true,
    weeklyDigest: doc.weekly_digest ?? true,
    newContentNotifications: doc.new_content_notifications ?? true,
    streakReminders: doc.streak_reminders ?? true,
    inactivityReminders: doc.inactivity_reminders ?? true,
    programRecommendations: doc.program_recommendations ?? true,
    digestFrequency: doc.digest_frequency ?? 'weekly',
    preferredLanguage: doc.preferred_language ?? 'fr',
    unsubscribedAll: doc.unsubscribed_all ?? false,
    unsubscribedAt: doc.unsubscribed_at,
    unsubscribeReason: doc.unsubscribe_reason,
    updatedAt: doc.updated_at ?? Date.now(),
  };
}

function mapPreferencesToFirestore(prefs: EmailPreferences): EmailPreferencesDocument {
  return {
    authentication_emails: prefs.authenticationEmails,
    welcome_emails: prefs.welcomeEmails,
    engagement_emails: prefs.engagementEmails,
    marketing_emails: prefs.marketingEmails,
    transactional_emails: prefs.transactionalEmails,
    weekly_digest: prefs.weeklyDigest,
    new_content_notifications: prefs.newContentNotifications,
    streak_reminders: prefs.streakReminders,
    inactivity_reminders: prefs.inactivityReminders,
    program_recommendations: prefs.programRecommendations,
    digest_frequency: prefs.digestFrequency,
    preferred_language: prefs.preferredLanguage,
    unsubscribed_all: prefs.unsubscribedAll,
    unsubscribed_at: prefs.unsubscribedAt,
    unsubscribe_reason: prefs.unsubscribeReason,
    updated_at: prefs.updatedAt,
  };
}
