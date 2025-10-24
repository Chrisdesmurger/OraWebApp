import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK initialization (Server-side only)
 * Singleton pattern to avoid multiple initializations
 */

let app: admin.app.App | undefined;

export function getFirebaseAdmin(): admin.app.App {
  // Check if already initialized globally
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  // Check local cache
  if (app) {
    return app;
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
    });

    console.log('✅ Firebase Admin SDK initialized');
    return app;
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    throw error;
  }
}

/**
 * Get Firestore instance
 */
export function getFirestore(): admin.firestore.Firestore {
  return getFirebaseAdmin().firestore();
}

/**
 * Get Auth instance
 */
export function getAuth(): admin.auth.Auth {
  return getFirebaseAdmin().auth();
}

/**
 * Get Storage instance
 */
export function getStorage(): admin.storage.Storage {
  return getFirebaseAdmin().storage();
}

/**
 * Set custom claims for RBAC
 */
export async function setUserRole(uid: string, role: 'admin' | 'teacher' | 'viewer'): Promise<void> {
  try {
    await getAuth().setCustomUserClaims(uid, { role });
    console.log(`✅ Role ${role} set for user ${uid}`);
  } catch (error) {
    console.error(`❌ Failed to set role for user ${uid}:`, error);
    throw error;
  }
}

/**
 * Get user with custom claims
 */
export async function getUserWithClaims(uid: string): Promise<admin.auth.UserRecord> {
  try {
    const user = await getAuth().getUser(uid);
    return user;
  } catch (error) {
    console.error(`❌ Failed to get user ${uid}:`, error);
    throw error;
  }
}

/**
 * Verify Firebase ID token
 */
export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  try {
    console.log('[verifyIdToken] Verifying token (length:', idToken.length, ')');
    const decodedToken = await getAuth().verifyIdToken(idToken);
    console.log('[verifyIdToken] ✅ Token verified for user:', decodedToken.uid);
    return decodedToken;
  } catch (error: any) {
    console.error('❌ Token verification failed:', {
      code: error.code,
      message: error.message,
      tokenPreview: idToken.substring(0, 20) + '...'
    });
    throw error;
  }
}

export default getFirebaseAdmin;
