/**
 * Magic Link Token Utilities
 *
 * Handles generation, storage, and validation of magic link tokens
 * for passwordless authentication.
 *
 * Security features:
 * - Cryptographically secure random tokens
 * - Tokens hashed before storage (never stored in plain text)
 * - One-time use (deleted after verification)
 * - Configurable expiration (default: 1 hour)
 * - Rate limiting support
 */

import { randomBytes, createHash } from 'crypto';
import { getFirestore } from '@/lib/firebase/admin';
import type { SupportedLanguage } from '@/lib/firestore/conversions';

// ============================================================================
// Configuration
// ============================================================================

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_LENGTH = 32; // 32 bytes = 64 hex characters
const COLLECTION_NAME = 'magic_link_tokens';

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
    const firestore = getFirestore();
    const now = Date.now();
    const expiresAt = now + TOKEN_EXPIRY_MS;

    // Generate token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);

    // Check for existing unexpired tokens for this email
    // Delete them to prevent token accumulation
    const existingTokens = await firestore
      .collection(COLLECTION_NAME)
      .where('email', '==', email.toLowerCase())
      .where('used', '==', false)
      .where('expires_at', '>', now)
      .get();

    // Delete existing unused tokens
    const batch = firestore.batch();
    existingTokens.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

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

    const docRef = firestore.collection(COLLECTION_NAME).doc();
    batch.set(docRef, tokenDoc);

    await batch.commit();

    console.log(`[MagicLink] Created token for ${email}, expires at ${new Date(expiresAt).toISOString()}`);

    return {
      success: true,
      token,
      tokenId: docRef.id,
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
 * @param token - The plain token from the magic link URL
 * @returns The email associated with the token if valid
 */
export async function verifyMagicLinkToken(
  token: string
): Promise<VerifyTokenResult> {
  try {
    const firestore = getFirestore();
    const now = Date.now();
    const tokenHash = hashToken(token);

    // Find the token document
    const snapshot = await firestore
      .collection(COLLECTION_NAME)
      .where('token_hash', '==', tokenHash)
      .where('used', '==', false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn('[MagicLink] Token not found or already used');
      return {
        success: false,
        error: 'Invalid or expired token',
      };
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as MagicLinkTokenDocument;

    // Check if expired
    if (data.expires_at < now) {
      console.warn('[MagicLink] Token expired');
      // Delete expired token
      await doc.ref.delete();
      return {
        success: false,
        error: 'Token has expired',
      };
    }

    // Mark token as used
    await doc.ref.update({
      used: true,
      used_at: now,
    });

    console.log(`[MagicLink] Token verified for ${data.email}`);

    return {
      success: true,
      email: data.email,
      language: data.language,
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
 * Should be called periodically (e.g., via Cloud Function)
 */
export async function cleanupExpiredTokens(): Promise<{ deleted: number }> {
  try {
    const firestore = getFirestore();
    const now = Date.now();
    const cutoff = now - TOKEN_EXPIRY_MS * 24; // Keep for 24x expiry time for audit

    // Find expired or old used tokens
    const expiredSnapshot = await firestore
      .collection(COLLECTION_NAME)
      .where('expires_at', '<', cutoff)
      .limit(500)
      .get();

    const usedSnapshot = await firestore
      .collection(COLLECTION_NAME)
      .where('used', '==', true)
      .where('used_at', '<', cutoff)
      .limit(500)
      .get();

    // Combine and dedupe
    const toDelete = new Set<string>();
    expiredSnapshot.docs.forEach((doc) => toDelete.add(doc.id));
    usedSnapshot.docs.forEach((doc) => toDelete.add(doc.id));

    // Delete in batches
    const batch = firestore.batch();
    let deleted = 0;

    for (const docId of toDelete) {
      batch.delete(firestore.collection(COLLECTION_NAME).doc(docId));
      deleted++;
      if (deleted >= 500) break; // Firestore batch limit
    }

    if (deleted > 0) {
      await batch.commit();
    }

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
    const firestore = getFirestore();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    // Count tokens created in the last hour for this email
    const snapshot = await firestore
      .collection(COLLECTION_NAME)
      .where('email', '==', email.toLowerCase())
      .where('created_at', '>', oneHourAgo)
      .get();

    const requestCount = snapshot.size;
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
