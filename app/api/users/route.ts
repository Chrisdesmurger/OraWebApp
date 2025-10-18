import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore, getAuth } from '@/lib/firebase/admin';

/**
 * GET /api/users - List all users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const firestore = getFirestore();
    const usersSnapshot = await firestore.collection('users').orderBy('createdAt', 'desc').get();

    const users = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    return apiSuccess({ users });
  } catch (error: any) {
    console.error('GET /api/users error:', error);
    return apiError(error.message || 'Failed to fetch users', 401);
  }
}

/**
 * POST /api/users - Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const { email, password, displayName, role = 'viewer' } = body;

    if (!email || !password) {
      return apiError('Email and password are required', 400);
    }

    // Create user in Firebase Auth
    const auth = getAuth();
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role });

    // Create user document in Firestore
    const firestore = getFirestore();
    await firestore.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL || null,
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      isFake: false,
    });

    return apiSuccess({ uid: userRecord.uid, email: userRecord.email, role }, 201);
  } catch (error: any) {
    console.error('POST /api/users error:', error);
    return apiError(error.message || 'Failed to create user', 500);
  }
}

/**
 * PATCH /api/users/:uid - Update user (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const { uid, displayName, role, photoURL } = body;

    if (!uid) {
      return apiError('User UID is required', 400);
    }

    const auth = getAuth();
    const firestore = getFirestore();

    // Update Firebase Auth
    const updateData: any = {};
    if (displayName) updateData.displayName = displayName;
    if (photoURL) updateData.photoURL = photoURL;

    if (Object.keys(updateData).length > 0) {
      await auth.updateUser(uid, updateData);
    }

    // Update custom claims if role changed
    if (role) {
      await auth.setCustomUserClaims(uid, { role });
    }

    // Update Firestore
    await firestore
      .collection('users')
      .doc(uid)
      .update({
        ...updateData,
        ...(role && { role }),
        updatedAt: new Date().toISOString(),
      });

    return apiSuccess({ success: true, uid });
  } catch (error: any) {
    console.error('PATCH /api/users error:', error);
    return apiError(error.message || 'Failed to update user', 500);
  }
}

/**
 * DELETE /api/users/:uid - Delete user (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return apiError('User UID is required', 400);
    }

    const auth = getAuth();
    const firestore = getFirestore();

    // Delete from Firebase Auth
    await auth.deleteUser(uid);

    // Delete from Firestore
    await firestore.collection('users').doc(uid).delete();

    return apiSuccess({ success: true, uid });
  } catch (error: any) {
    console.error('DELETE /api/users error:', error);
    return apiError(error.message || 'Failed to delete user', 500);
  }
}
