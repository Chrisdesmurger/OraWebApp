/**
 * Email Preferences Utilities
 *
 * Manages user email preferences and unsubscribe tokens
 */

import * as crypto from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type {
  EmailPreferences,
  EmailPreferencesDocument,
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
  const supabase = createSupabaseServiceClient();

  const { data: row, error } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !row) {
    // Return default preferences
    return getDefaultPreferences();
  }

  return mapPreferencesFromRow(row);
}

/**
 * Update user email preferences
 */
export async function updateUserEmailPreferences(
  userId: string,
  preferences: Partial<EmailPreferences>
): Promise<EmailPreferences> {
  const supabase = createSupabaseServiceClient();

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

  // Convert to database format
  const dbData = mapPreferencesToRow(updated);

  // Upsert to Supabase
  const { error } = await supabase
    .from('email_preferences')
    .upsert(
      {
        user_id: userId,
        ...dbData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[Email Preferences] Upsert error:', error);
    throw new Error('Failed to update email preferences');
  }

  return updated;
}

/**
 * Unsubscribe user from all marketing emails
 */
export async function unsubscribeFromAll(
  userId: string,
  reason?: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from('email_preferences')
    .upsert(
      {
        user_id: userId,
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
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[Email Preferences] Unsubscribe error:', error);
    throw new Error('Failed to unsubscribe');
  }
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

function mapPreferencesFromRow(row: Record<string, unknown>): EmailPreferences {
  return {
    authenticationEmails: (row.authentication_emails as boolean) ?? true,
    welcomeEmails: (row.welcome_emails as boolean) ?? true,
    engagementEmails: (row.engagement_emails as boolean) ?? true,
    marketingEmails: (row.marketing_emails as boolean) ?? true,
    transactionalEmails: (row.transactional_emails as boolean) ?? true,
    weeklyDigest: (row.weekly_digest as boolean) ?? true,
    newContentNotifications: (row.new_content_notifications as boolean) ?? true,
    streakReminders: (row.streak_reminders as boolean) ?? true,
    inactivityReminders: (row.inactivity_reminders as boolean) ?? true,
    programRecommendations: (row.program_recommendations as boolean) ?? true,
    digestFrequency: (row.digest_frequency as EmailPreferences['digestFrequency']) ?? 'weekly',
    preferredLanguage: (row.preferred_language as EmailPreferences['preferredLanguage']) ?? 'fr',
    unsubscribedAll: (row.unsubscribed_all as boolean) ?? false,
    unsubscribedAt: row.unsubscribed_at as number | undefined,
    unsubscribeReason: row.unsubscribe_reason as string | undefined,
    updatedAt: (row.updated_at as number) ?? Date.now(),
  };
}

function mapPreferencesToRow(prefs: EmailPreferences): Record<string, unknown> {
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
  };
}
