import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore, getAuth } from '@/lib/firebase/admin';
import { logCreate, logUpdate, logDelete } from '@/lib/audit/logger';

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

    console.log('[GET /api/users] Fetching users from Firestore...');

    // Use snake_case field names (created_at instead of createdAt)
    let usersSnapshot;
    try {
      usersSnapshot = await firestore.collection('users').orderBy('created_at', 'desc').get();
      console.log('[GET /api/users] Found', usersSnapshot.size, 'users');
    } catch (orderError: any) {
      console.warn('[GET /api/users] orderBy failed, trying without:', orderError.message);
      // Fallback: fetch without ordering
      usersSnapshot = await firestore.collection('users').get();
      console.log('[GET /api/users] Without orderBy - Found', usersSnapshot.size, 'users');
    }

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('[GET /api/users] User doc:', doc.id, 'has fields:', Object.keys(data));

      // Map snake_case Firestore fields to camelCase for frontend
      return {
        id: doc.id,
        uid: doc.id,
        email: data.email || null,
        displayName: data.first_name && data.last_name
          ? `${data.first_name} ${data.last_name}`.trim()
          : data.first_name || data.last_name || data.email?.split('@')[0] || 'Unknown',
        firstName: data.first_name,
        lastName: data.last_name,
        photoURL: data.photo_url,
        role: data.role || 'viewer',
        planTier: data.plan_tier || 'free',
        createdAt: data.created_at,
        lastLoginAt: data.last_login_at,
        updatedAt: data.updated_at,
        disabled: data.disabled || false,
      };
    });

    console.log('[GET /api/users] Returning', users.length, 'users');
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
    const userData = {
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL || null,
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      isFake: false,
    };

    await firestore.collection('users').doc(userRecord.uid).set(userData);

    // Log audit event (don't await - fire and forget)
    logCreate({
      resourceType: 'user',
      resourceId: userRecord.uid,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: userData,
      request,
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

    // Get current state for audit log
    const userDoc = await firestore.collection('users').doc(uid).get();
    const beforeState = userDoc.exists ? userDoc.data() : {};

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
    const firestoreUpdate = {
      ...updateData,
      ...(role && { role }),
      updatedAt: new Date().toISOString(),
    };

    await firestore
      .collection('users')
      .doc(uid)
      .update(firestoreUpdate);

    // Get updated state for audit log
    const updatedDoc = await firestore.collection('users').doc(uid).get();
    const afterState = updatedDoc.exists ? updatedDoc.data() : {};

    // Log audit event (don't await - fire and forget)
    logUpdate({
      resourceType: 'user',
      resourceId: uid,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      before: beforeState,
      after: afterState,
      request,
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

    // Get user data before deletion for audit log
    const userDoc = await firestore.collection('users').doc(uid).get();
    const beforeState = userDoc.exists ? userDoc.data() : {};

    // Delete from Firebase Auth
    await auth.deleteUser(uid);

    // Delete from Firestore
    await firestore.collection('users').doc(uid).delete();

    // Log audit event (don't await - fire and forget)
    logDelete({
      resourceType: 'user',
      resourceId: uid,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: beforeState,
      request,
    });

    return apiSuccess({ success: true, uid });
  } catch (error: any) {
    console.error('DELETE /api/users error:', error);
    return apiError(error.message || 'Failed to delete user', 500);
  }
}
