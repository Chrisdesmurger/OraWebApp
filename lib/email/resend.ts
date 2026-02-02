/**
 * Resend Email Client Initialization
 *
 * Singleton pattern following lib/firebase/admin.ts
 * Provides centralized access to Resend API client
 */

import { Resend } from 'resend';

// ============================================================================
// Singleton Client
// ============================================================================

let resendClient: Resend | undefined;

/**
 * Get the Resend client instance (singleton)
 * @throws Error if RESEND_API_KEY is not set
 */
export function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY environment variable is not set. ' +
        'Please add it to your .env.local file.'
    );
  }

  resendClient = new Resend(apiKey);
  console.log('[Resend] Email client initialized');

  return resendClient;
}

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Get the default "from" address for emails
 */
export function getFromAddress(): string {
  return (
    process.env.RESEND_FROM_ADDRESS ||
    'Ora Wellbeing <noreply@ora-wellbeing.com>'
  );
}

/**
 * Get the reply-to address for emails
 */
export function getReplyToAddress(): string {
  return process.env.RESEND_REPLY_TO_ADDRESS || 'support@ora-wellbeing.com';
}

/**
 * Get the base URL for email links
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://admin.ora-wellbeing.com';
}

/**
 * Get webhook secret for verifying Resend webhooks
 */
export function getWebhookSecret(): string {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('RESEND_WEBHOOK_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Get secret for signing unsubscribe tokens
 */
export function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error('UNSUBSCRIBE_SECRET environment variable is not set');
  }
  return secret;
}

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

export interface RateLimitConfig {
  perUserPerHour: number;
  perIpPerHour: number;
  globalPerHour: number;
  batchSize: number;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    perUserPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_USER || '10', 10),
    perIpPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_IP || '50', 10),
    globalPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_GLOBAL || '1000', 10),
    batchSize: parseInt(process.env.EMAIL_BATCH_SIZE || '50', 10),
  };
}

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if email domain is allowed (not blocked)
 */
export function isAllowedEmailDomain(email: string): boolean {
  const blockedDomains = (process.env.EMAIL_BLOCKED_DOMAINS || '')
    .split(',')
    .filter(Boolean)
    .map((d) => d.trim().toLowerCase());

  if (blockedDomains.length === 0) {
    return true;
  }

  const domain = email.split('@')[1]?.toLowerCase();
  return !blockedDomains.includes(domain);
}

// ============================================================================
// Development Mode
// ============================================================================

/**
 * Check if we're in development mode
 * In development, emails may be redirected or logged instead of sent
 */
export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get development email override
 * If set, all emails will be sent to this address in development
 */
export function getDevEmailOverride(): string | undefined {
  if (!isDevMode()) {
    return undefined;
  }
  return process.env.EMAIL_DEV_OVERRIDE;
}

/**
 * Get the actual recipient email (handles dev override)
 */
export function getEffectiveRecipient(email: string): string {
  const devOverride = getDevEmailOverride();
  if (devOverride) {
    console.log(
      `[Resend] Dev mode: Redirecting email from ${email} to ${devOverride}`
    );
    return devOverride;
  }
  return email;
}
