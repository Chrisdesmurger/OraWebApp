/**
 * GET /api/auth/magic-link/verify
 *
 * Verify a magic link token and return a Firebase custom token
 * for client-side authentication.
 *
 * This endpoint is PUBLIC - the token itself provides authentication.
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getAuth, getFirestore } from '@/lib/firebase/admin';
import { verifyMagicLinkToken } from '@/lib/email/magic-link';

export async function GET(request: NextRequest) {
  try {
    // Get token from query params
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return apiError('Token is required', 400);
    }

    // Verify the magic link token
    const verifyResult = await verifyMagicLinkToken(token);

    if (!verifyResult.success || !verifyResult.email) {
      return apiError(
        verifyResult.error || 'Invalid or expired token',
        401
      );
    }

    const email = verifyResult.email;
    const auth = getAuth();
    const firestore = getFirestore();

    // Find or create user by email
    let uid: string;
    let isNewUser = false;

    try {
      // Try to get existing user
      const existingUser = await auth.getUserByEmail(email);
      uid = existingUser.uid;
      console.log(`[MagicLink] Found existing user: ${uid}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        const newUser = await auth.createUser({
          email,
          emailVerified: true, // Email is verified via magic link
        });
        uid = newUser.uid;
        isNewUser = true;
        console.log(`[MagicLink] Created new user: ${uid}`);

        // Set default role for new users
        await auth.setCustomUserClaims(uid, { role: 'viewer' });

        // Create user document in Firestore
        await firestore.collection('users').doc(uid).set({
          email: email.toLowerCase(),
          role: 'viewer',
          created_at: Date.now(),
          updated_at: Date.now(),
          last_login_at: Date.now(),
          auth_method: 'magic_link',
        });
      } else {
        throw error;
      }
    }

    // Update last login time
    await firestore.collection('users').doc(uid).update({
      last_login_at: Date.now(),
      updated_at: Date.now(),
    }).catch(() => {
      // Ignore if user doc doesn't exist yet
    });

    // Create a custom token for Firebase Auth
    const customToken = await auth.createCustomToken(uid, {
      email,
      authMethod: 'magic_link',
    });

    console.log(`[MagicLink] Generated custom token for user: ${uid}`);

    return apiSuccess({
      success: true,
      customToken,
      email,
      uid,
      isNewUser,
      language: verifyResult.language,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to verify token';
    console.error('[API] GET /api/auth/magic-link/verify error:', errorMessage);
    return apiError('Failed to verify login link. Please request a new one.', 500);
  }
}
