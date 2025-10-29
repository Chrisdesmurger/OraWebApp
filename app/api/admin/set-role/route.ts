import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getAuth } from '@/lib/firebase/admin';
import { logRoleChange } from '@/lib/audit/logger';

/**
 * POST /api/admin/set-role - Set user role (admin only)
 *
 * Body: { uid: string, role: 'admin' | 'teacher' | 'viewer' | 'user' }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and require admin role
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin'])) {
      return apiError('Only admins can set user roles', 403);
    }

    const body = await request.json();
    const { uid, role } = body;

    if (!uid) {
      return apiError('User UID is required', 400);
    }

    if (!role || !['admin', 'teacher', 'viewer', 'user'].includes(role)) {
      return apiError('Invalid role. Must be: admin, teacher, viewer, or user', 400);
    }

    // Prevent self-demotion
    if (currentUser.uid === uid && role !== 'admin') {
      return apiError('You cannot remove your own admin role', 403);
    }

    const auth = getAuth();

    // Get target user
    const targetUser = await auth.getUser(uid);

    // Get current role for audit log
    const currentRole = targetUser.customClaims?.role || 'user';

    // Set custom claims
    if (role === 'user') {
      // Remove role claim for regular users
      await auth.setCustomUserClaims(uid, {});
    } else {
      await auth.setCustomUserClaims(uid, { role });
    }

    // Log audit event (don't await - fire and forget)
    if (currentRole !== role) {
      logRoleChange({
        resourceId: uid,
        actorId: currentUser.uid,
        actorEmail: currentUser.email || 'unknown',
        before: { role: currentRole },
        after: { role },
        request,
      });
    }

    return apiSuccess({
      success: true,
      uid,
      email: targetUser.email,
      role,
      message: `Role set to ${role} successfully. User needs to refresh their ID token.`,
    });

  } catch (error: any) {
    console.error('POST /api/admin/set-role error:', error);
    return apiError(error.message || 'Failed to set user role', 500);
  }
}

/**
 * GET /api/admin/set-role?uid={uid} - Get user's current role
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return apiError('User UID is required', 400);
    }

    const auth = getAuth();
    const targetUser = await auth.getUser(uid);

    const role = targetUser.customClaims?.role || 'user';

    return apiSuccess({
      uid: targetUser.uid,
      email: targetUser.email,
      role,
      customClaims: targetUser.customClaims || {},
    });

  } catch (error: any) {
    console.error('GET /api/admin/set-role error:', error);
    return apiError(error.message || 'Failed to get user role', 500);
  }
}
