/**
 * Email System Type Definitions
 *
 * Follows existing i18n patterns:
 * - MultilingualText for text fields (FR/EN/ES)
 * - snake_case for Firestore, camelCase for frontend
 */

import type { MultilingualText, SupportedLanguage } from '@/lib/firestore/conversions';

// ============================================================================
// Email Types & Categories
// ============================================================================

export type EmailCategory =
  | 'authentication'
  | 'welcome'
  | 'engagement'
  | 'marketing'
  | 'transactional';

export type EmailType =
  // Authentication
  | 'magic_link'
  | 'email_verification'
  | 'password_reset'
  | 'security_alert'
  // Welcome
  | 'welcome'
  | 'onboarding_complete'
  // Engagement
  | 'inactivity_7d'
  | 'inactivity_30d'
  | 'streak_milestone'
  | 'first_completion'
  | 'program_complete'
  // Marketing
  | 'new_content'
  | 'weekly_digest'
  | 'program_recommendation'
  // Transactional
  | 'account_change'
  | 'subscription_confirmed'
  | 'subscription_expiring'
  | 'payment_failed';

export type EmailPriority = 'high' | 'normal' | 'low';

export type DeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'failed';

// ============================================================================
// Email Template (Firestore Document - snake_case)
// ============================================================================

export interface EmailTemplateDocument {
  name: string;
  email_type: EmailType;
  category: EmailCategory;
  active: boolean;

  // Multilingual content
  subject_fr: string;
  subject_en?: string;
  subject_es?: string;

  preview_text_fr?: string;
  preview_text_en?: string;
  preview_text_es?: string;

  // Template content
  template_component: string;
  template_version: string;

  // Dynamic variables schema
  variables_schema: Record<string, VariableSchema>;

  // Metadata
  created_at: number;
  updated_at: number;
  created_by: string;
  updated_by?: string;

  // Delivery settings
  default_priority: EmailPriority;
  tracking_enabled: boolean;
}

export interface VariableSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

// ============================================================================
// Email Template (Frontend - camelCase)
// ============================================================================

export interface EmailTemplate {
  id: string;
  name: string;
  emailType: EmailType;
  category: EmailCategory;
  active: boolean;

  subject: MultilingualText;
  previewText?: MultilingualText;

  templateComponent: string;
  templateVersion: string;
  variablesSchema: Record<string, VariableSchema>;

  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy?: string;

  defaultPriority: EmailPriority;
  trackingEnabled: boolean;
}

// ============================================================================
// Email Log (Firestore - snake_case)
// ============================================================================

export interface EmailLogDocument {
  email_type: EmailType;
  template_id?: string;
  recipient_uid?: string;
  recipient_email: string;
  language: SupportedLanguage;

  // Resend response
  resend_id: string;
  status: DeliveryStatus;

  // Tracking
  sent_at: number;
  delivered_at?: number;
  opened_at?: number;
  clicked_at?: number;
  bounced_at?: number;
  failed_at?: number;

  // Error handling
  error_message?: string;
  retry_count: number;

  // Context
  ip_address?: string;
  user_agent?: string;
  triggered_by: 'system' | 'admin' | 'user';

  // Variables used (for debugging)
  variables_used?: Record<string, unknown>;
}

// ============================================================================
// Email Log (Frontend - camelCase)
// ============================================================================

export interface EmailLog {
  id: string;
  emailType: EmailType;
  templateId?: string;
  recipientUid?: string;
  recipientEmail: string;
  language: SupportedLanguage;

  resendId: string;
  status: DeliveryStatus;

  sentAt: number;
  deliveredAt?: number;
  openedAt?: number;
  clickedAt?: number;
  bouncedAt?: number;
  failedAt?: number;

  errorMessage?: string;
  retryCount: number;

  ipAddress?: string;
  userAgent?: string;
  triggeredBy: 'system' | 'admin' | 'user';

  variablesUsed?: Record<string, unknown>;
}

// ============================================================================
// User Email Preferences (Firestore - snake_case)
// ============================================================================

export interface EmailPreferencesDocument {
  // Category-level preferences
  authentication_emails: boolean; // Always true (required)
  welcome_emails: boolean;
  engagement_emails: boolean;
  marketing_emails: boolean;
  transactional_emails: boolean; // Always true (required)

  // Specific preferences
  weekly_digest: boolean;
  new_content_notifications: boolean;
  streak_reminders: boolean;
  inactivity_reminders: boolean;
  program_recommendations: boolean;

  // Frequency settings
  digest_frequency: 'daily' | 'weekly' | 'monthly' | 'never';

  // Language preference (overrides user profile)
  preferred_language: SupportedLanguage;

  // Global unsubscribe
  unsubscribed_all: boolean;
  unsubscribed_at?: number;
  unsubscribe_reason?: string;

  // Metadata
  updated_at: number;
}

// ============================================================================
// User Email Preferences (Frontend - camelCase)
// ============================================================================

export interface EmailPreferences {
  authenticationEmails: boolean;
  welcomeEmails: boolean;
  engagementEmails: boolean;
  marketingEmails: boolean;
  transactionalEmails: boolean;

  weeklyDigest: boolean;
  newContentNotifications: boolean;
  streakReminders: boolean;
  inactivityReminders: boolean;
  programRecommendations: boolean;

  digestFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  preferredLanguage: SupportedLanguage;

  unsubscribedAll: boolean;
  unsubscribedAt?: number;
  unsubscribeReason?: string;

  updatedAt: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SendEmailRequest {
  emailType: EmailType;
  recipientEmail: string;
  recipientUid?: string;
  language?: SupportedLanguage;
  variables: Record<string, unknown>;
  priority?: EmailPriority;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkSendRequest {
  emailType: EmailType;
  recipients: Array<{
    email: string;
    uid?: string;
    language?: SupportedLanguage;
    variables: Record<string, unknown>;
  }>;
  scheduledAt?: string;
}

export interface BulkSendResponse {
  success: boolean;
  sent: number;
  failed: number;
  errors?: Array<{ email: string; error: string }>;
}

// ============================================================================
// Email Content Types (for template rendering)
// ============================================================================

export interface EmailContent {
  subject: string;
  previewText?: string;
  html: string;
  text?: string;
}

export interface BaseEmailProps {
  recipientEmail: string;
  language: SupportedLanguage;
  unsubscribeToken?: string;
  baseUrl: string;
}

// Authentication email props
export interface MagicLinkEmailProps extends BaseEmailProps {
  magicLinkUrl: string;
  expiresIn: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PasswordResetEmailProps extends BaseEmailProps {
  resetUrl: string;
  expiresIn: string;
  ipAddress?: string;
}

export interface SecurityAlertEmailProps extends BaseEmailProps {
  alertType: 'new_login' | 'password_changed' | 'email_changed';
  deviceInfo?: string;
  location?: string;
  timestamp: string;
}

// Welcome email props
export interface WelcomeEmailProps extends BaseEmailProps {
  firstName?: string;
  onboardingUrl: string;
  dashboardUrl: string;
}

export interface OnboardingCompleteEmailProps extends BaseEmailProps {
  firstName?: string;
  recommendedPrograms: Array<{
    id: string;
    title: string;
    imageUrl?: string;
  }>;
  firstLessonUrl: string;
}

// Engagement email props
export interface InactivityReminderEmailProps extends BaseEmailProps {
  firstName?: string;
  lastActivityDate: string;
  suggestedContent: Array<{
    id: string;
    title: string;
    type: 'lesson' | 'program';
    imageUrl?: string;
  }>;
}

export interface StreakNotificationEmailProps extends BaseEmailProps {
  firstName?: string;
  streakDays: number;
  badgeUrl?: string;
  nextMilestone?: number;
}

export interface MilestoneEmailProps extends BaseEmailProps {
  firstName?: string;
  milestoneType: 'first_lesson' | 'first_program' | 'streak_7' | 'streak_30' | 'streak_100';
  achievementTitle: string;
  nextSuggestion?: string;
}

// Marketing email props
export interface NewContentEmailProps extends BaseEmailProps {
  contentTitle: string;
  contentType: 'lesson' | 'program';
  contentUrl: string;
  contentDescription?: string;
  contentImageUrl?: string;
  authorName?: string;
}

export interface WeeklyDigestEmailProps extends BaseEmailProps {
  firstName?: string;
  weekStartDate: string;
  weekEndDate: string;
  newContent: Array<{
    id: string;
    title: string;
    type: 'lesson' | 'program';
    imageUrl?: string;
  }>;
  lessonsCompleted?: number;
  minutesPracticed?: number;
  currentStreak?: number;
  tips?: string[];
}

export interface ProgramRecommendationEmailProps extends BaseEmailProps {
  firstName?: string;
  programs: Array<{
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    difficulty?: string;
  }>;
  basedOn?: string;
}

// ============================================================================
// Mapping Functions
// ============================================================================

export function mapEmailTemplateFromFirestore(
  id: string,
  doc: EmailTemplateDocument
): EmailTemplate {
  return {
    id,
    name: doc.name,
    emailType: doc.email_type,
    category: doc.category,
    active: doc.active,
    subject: {
      fr: doc.subject_fr,
      en: doc.subject_en,
      es: doc.subject_es,
    },
    previewText: doc.preview_text_fr
      ? {
          fr: doc.preview_text_fr,
          en: doc.preview_text_en,
          es: doc.preview_text_es,
        }
      : undefined,
    templateComponent: doc.template_component,
    templateVersion: doc.template_version,
    variablesSchema: doc.variables_schema,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    createdBy: doc.created_by,
    updatedBy: doc.updated_by,
    defaultPriority: doc.default_priority,
    trackingEnabled: doc.tracking_enabled,
  };
}

export function mapEmailTemplateToFirestore(
  template: Omit<EmailTemplate, 'id'>
): EmailTemplateDocument {
  return {
    name: template.name,
    email_type: template.emailType,
    category: template.category,
    active: template.active,
    subject_fr: template.subject.fr,
    subject_en: template.subject.en,
    subject_es: template.subject.es,
    preview_text_fr: template.previewText?.fr,
    preview_text_en: template.previewText?.en,
    preview_text_es: template.previewText?.es,
    template_component: template.templateComponent,
    template_version: template.templateVersion,
    variables_schema: template.variablesSchema,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
    created_by: template.createdBy,
    updated_by: template.updatedBy,
    default_priority: template.defaultPriority,
    tracking_enabled: template.trackingEnabled,
  };
}

export function mapEmailLogFromFirestore(
  id: string,
  doc: EmailLogDocument
): EmailLog {
  return {
    id,
    emailType: doc.email_type,
    templateId: doc.template_id,
    recipientUid: doc.recipient_uid,
    recipientEmail: doc.recipient_email,
    language: doc.language,
    resendId: doc.resend_id,
    status: doc.status,
    sentAt: doc.sent_at,
    deliveredAt: doc.delivered_at,
    openedAt: doc.opened_at,
    clickedAt: doc.clicked_at,
    bouncedAt: doc.bounced_at,
    failedAt: doc.failed_at,
    errorMessage: doc.error_message,
    retryCount: doc.retry_count,
    ipAddress: doc.ip_address,
    userAgent: doc.user_agent,
    triggeredBy: doc.triggered_by,
    variablesUsed: doc.variables_used,
  };
}

export function mapEmailPreferencesFromFirestore(
  doc: EmailPreferencesDocument
): EmailPreferences {
  return {
    authenticationEmails: doc.authentication_emails,
    welcomeEmails: doc.welcome_emails,
    engagementEmails: doc.engagement_emails,
    marketingEmails: doc.marketing_emails,
    transactionalEmails: doc.transactional_emails,
    weeklyDigest: doc.weekly_digest,
    newContentNotifications: doc.new_content_notifications,
    streakReminders: doc.streak_reminders,
    inactivityReminders: doc.inactivity_reminders,
    programRecommendations: doc.program_recommendations,
    digestFrequency: doc.digest_frequency,
    preferredLanguage: doc.preferred_language,
    unsubscribedAll: doc.unsubscribed_all,
    unsubscribedAt: doc.unsubscribed_at,
    unsubscribeReason: doc.unsubscribe_reason,
    updatedAt: doc.updated_at,
  };
}

export function mapEmailPreferencesToFirestore(
  prefs: EmailPreferences
): EmailPreferencesDocument {
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

// ============================================================================
// Default Preferences
// ============================================================================

export function getDefaultEmailPreferences(): EmailPreferences {
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

// ============================================================================
// Email Category Helpers
// ============================================================================

export function getEmailCategory(emailType: EmailType): EmailCategory {
  const categoryMap: Record<EmailType, EmailCategory> = {
    magic_link: 'authentication',
    email_verification: 'authentication',
    password_reset: 'authentication',
    security_alert: 'authentication',
    welcome: 'welcome',
    onboarding_complete: 'welcome',
    inactivity_7d: 'engagement',
    inactivity_30d: 'engagement',
    streak_milestone: 'engagement',
    first_completion: 'engagement',
    program_complete: 'engagement',
    new_content: 'marketing',
    weekly_digest: 'marketing',
    program_recommendation: 'marketing',
    account_change: 'transactional',
    subscription_confirmed: 'transactional',
    subscription_expiring: 'transactional',
    payment_failed: 'transactional',
  };
  return categoryMap[emailType];
}

export function isRequiredEmail(emailType: EmailType): boolean {
  const category = getEmailCategory(emailType);
  return category === 'authentication' || category === 'transactional';
}

export function canUserOptOut(emailType: EmailType): boolean {
  return !isRequiredEmail(emailType);
}
