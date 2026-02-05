/**
 * Magic Link Token Utilities
 *
 * Handles generation, storage, and validation of magic link tokens
 * for passwordless authentication.
 *
 * NOTE: With Supabase Auth, magic links are now handled natively via
 * supabase.auth.signInWithOtp(). This module is kept for backward
 * compatibility but uses Supabase (magic_link_tokens table) instead
 * of Firestore.
 *
 * Security features:
 * - Cryptographically secure random tokens
 * - Tokens hashed before storage (never stored in plain text)
 * - One-time use (deleted after verification)
 * - Configurable expiration (default: 1 hour)
 * - Rate limiting support
 */

import { randomBytes, createHash } from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { SupportedLanguage } from '@/lib/firestore/conversions';

// ============================================================================
// Configuration
// ============================================================================

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_LENGTH = 32; // 32 bytes = 64 hex characters
const TABLE_NAME = 'magic_link_tokens';

// ============================================================================
// Token Document Types
// ============================================================================

export interface MagicLinkTokenDocument {
  email: string;
  token_hash: string;
  created_at: number;
  expires_at: number;
  used: boolean;
  used_at?: number;
  ip_address?: string;
  user_agent?: string;
  language: SupportedLanguage;
}

export interface CreateTokenResult {
  success: boolean;
  token?: string;
  tokenId?: string;
  expiresAt?: number;
  error?: string;
}

export interface VerifyTokenResult {
  success: boolean;
  email?: string;
  language?: SupportedLanguage;
  error?: string;
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Hash a token for secure storage
 * We never store the plain token in the database
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new magic link token for an email address
 *
 * @deprecated Prefer using Supabase Auth native magic links via signInWithOtp()
 *
 * @param email - The email address to create the token for
 * @param language - Preferred language for emails
 * @param ipAddress - IP address of the request (optional, for logging)
 * @param userAgent - User agent of the request (optional, for logging)
 * @returns The plain token (to be sent in email) and metadata
 */
export async function createMagicLinkToken(
  email: string,
  language: SupportedLanguage = 'fr',
  ipAddress?: string,
  userAgent?: string
): Promise<CreateTokenResult> {
  try {
    const supabase = createSupabaseServiceClient();
    const now = Date.now();
    const expiresAt = now + TOKEN_EXPIRY_MS;

    // Generate token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);

    // Delete existing unused, unexpired tokens for this email
    await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('email', email.toLowerCase())
      .eq('used', false)
      .gt('expires_at', now);

    // Create new token document
    const tokenDoc: MagicLinkTokenDocument = {
      email: email.toLowerCase(),
      token_hash: tokenHash,
      created_at: now,
      expires_at: expiresAt,
      used: false,
      ip_address: ipAddress,
      user_agent: userAgent,
      language,
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(tokenDoc)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create token: ${error.message}`);
    }

    console.log(`[MagicLink] Created token for ${email}, expires at ${new Date(expiresAt).toISOString()}`);

    return {
      success: true,
      token,
      tokenId: data.id,
      expiresAt,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MagicLink] Failed to create token:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Token Verification
// ============================================================================

/**
 * Verify a magic link token and mark it as used
 *
 * @deprecated Prefer using Supabase Auth native magic links via verifyOtp()
 *
 * @param token - The plain token from the magic link URL
 * @returns The email associated with the token if valid
 */
export async function verifyMagicLinkToken(
  token: string
): Promise<VerifyTokenResult> {
  try {
    const supabase = createSupabaseServiceClient();
    const now = Date.now();
    const tokenHash = hashToken(token);

    // Find the token document
    const { data: rows, error: selectError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .limit(1);

    if (selectError) {
      throw new Error(`Failed to query token: ${selectError.message}`);
    }

    if (!rows || rows.length === 0) {
      console.warn('[MagicLink] Token not found or already used');
      return {
        success: false,
        error: 'Invalid or expired token',
      };
    }

    const row = rows[0] as MagicLinkTokenDocument & { id: string };

    // Check if expired
    if (row.expires_at < now) {
      console.warn('[MagicLink] Token expired');
      // Delete expired token
      await supabase.from(TABLE_NAME).delete().eq('id', row.id);
      return {
        success: false,
        error: 'Token has expired',
      };
    }

    // Mark token as used
    await supabase
      .from(TABLE_NAME)
      .update({ used: true, used_at: now })
      .eq('id', row.id);

    console.log(`[MagicLink] Token verified for ${row.email}`);

    return {
      success: true,
      email: row.email,
      language: row.language,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MagicLink] Failed to verify token:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Token Cleanup
// ============================================================================

/**
 * Delete expired and used tokens
 * Should be called periodically (e.g., via cron job or scheduled function)
 */
export async function cleanupExpiredTokens(): Promise<{ deleted: number }> {
  try {
    const supabase = createSupabaseServiceClient();
    const now = Date.now();
    const cutoff = now - TOKEN_EXPIRY_MS * 24; // Keep for 24x expiry time for audit

    // Delete expired tokens older than cutoff
    const { data: expiredRows, error: expiredError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .lt('expires_at', cutoff)
      .select('id');

    if (expiredError) {
      console.error('[MagicLink] Cleanup expired tokens failed:', expiredError);
    }

    // Delete used tokens older than cutoff
    const { data: usedRows, error: usedError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('used', true)
      .lt('used_at', cutoff)
      .select('id');

    if (usedError) {
      console.error('[MagicLink] Cleanup used tokens failed:', usedError);
    }

    const deleted = (expiredRows?.length || 0) + (usedRows?.length || 0);
    console.log(`[MagicLink] Cleaned up ${deleted} expired tokens`);
    return { deleted };
  } catch (error) {
    console.error('[MagicLink] Cleanup failed:', error);
    return { deleted: 0 };
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check if rate limit is exceeded for an email
 * Prevents abuse by limiting token requests per email
 */
export async function checkRateLimit(
  email: string,
  maxRequestsPerHour: number = 5
): Promise<{ allowed: boolean; remainingRequests: number }> {
  try {
    const supabase = createSupabaseServiceClient();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    // Count tokens created in the last hour for this email
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact', head: true })
      .eq('email', email.toLowerCase())
      .gt('created_at', oneHourAgo);

    if (error) {
      console.error('[MagicLink] Rate limit check failed:', error);
      // Fail open - allow request if check fails
      return { allowed: true, remainingRequests: 1 };
    }

    const requestCount = count || 0;
    const allowed = requestCount < maxRequestsPerHour;
    const remainingRequests = Math.max(0, maxRequestsPerHour - requestCount);

    if (!allowed) {
      console.warn(`[MagicLink] Rate limit exceeded for ${email}`);
    }

    return { allowed, remainingRequests };
  } catch (error) {
    console.error('[MagicLink] Rate limit check failed:', error);
    // Fail open - allow request if check fails
    return { allowed: true, remainingRequests: 1 };
  }
}

// ============================================================================
// URL Helpers
// ============================================================================

/**
 * Generate the full magic link URL
 */
export function generateMagicLinkUrl(token: string, baseUrl: string): string {
  return `${baseUrl}/auth/magic-link/verify?token=${encodeURIComponent(token)}`;
}

/**
 * Get human-readable expiry time string
 */
export function getExpiryString(language: SupportedLanguage): string {
  const expiryStrings: Record<SupportedLanguage, string> = {
    fr: '1 heure',
    en: '1 hour',
    es: '1 hora',
  };
  return expiryStrings[language];
}
