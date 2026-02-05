import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logRoleChange } from '@/lib/audit/logger';

/**
 * POST /api/admin/set-role - Set user role (admin only)
 *
 * Body: { uid: string, role: 'admin' | 'teacher' | 'viewer' | 'user' }
 *
 * Updates the role column in the Supabase users table.
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

    const supabase = createSupabaseServiceClient();

    // Get current role for audit log
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', uid)
      .single();

    if (fetchError || !targetUser) {
      return apiError('User not found', 404);
    }

    const currentRole = targetUser.role || 'user';

    // Update role in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', uid);

    if (updateError) {
      return apiError('Failed to update role: ' + updateError.message, 500);
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
      message: `Role set to ${role} successfully.`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/admin/set-role error:', error);
    return apiError(errorMessage || 'Failed to set user role', 500);
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

    const supabase = createSupabaseServiceClient();

    const { data: targetUser, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', uid)
      .single();

    if (error || !targetUser) {
      return apiError('User not found', 404);
    }

    return apiSuccess({
      uid: targetUser.id,
      email: targetUser.email,
      role: targetUser.role || 'user',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/admin/set-role error:', error);
    return apiError(errorMessage || 'Failed to get user role', 500);
  }
}
