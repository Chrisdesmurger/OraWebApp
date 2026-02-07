import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logCreate, logUpdate, logDelete } from '@/lib/audit/logger';

/**
 * GET /api/users - List all users (admin only)
 *
 * Returns users from the Supabase users table, mapped to camelCase
 * for frontend consumption.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const supabase = createSupabaseServiceClient();

    console.log('[GET /api/users] Fetching users from Supabase...');

    const { data: usersData, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/users] Supabase query error:', error.message);
      return apiError('Failed to fetch users: ' + error.message, 500);
    }

    const users = (usersData || []).map((data) => {
      // Map snake_case Supabase fields to camelCase for frontend
      return {
        id: data.id,
        uid: data.id,
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/users error:', error);
    return apiError(errorMessage || 'Failed to fetch users', 401);
  }
}

/**
 * POST /api/users - Create a new user (admin only)
 *
 * Creates the user in Supabase Auth, then updates the auto-created
 * profile row (from handle_new_user trigger) with role and name.
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

    const supabase = createSupabaseServiceClient();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error('POST /api/users auth.admin.createUser error:', authError);
      return apiError(authError?.message || 'Failed to create auth user', 500);
    }

    const newUser = authData.user;

    // Parse display name into first/last
    const nameParts = (displayName || email.split('@')[0]).split(' ');
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    // Update the auto-created profile row with role and name
    // The handle_new_user trigger creates the row, we just update it
    const { error: updateError } = await supabase
      .from('users')
      .update({
        role,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', newUser.id);

    if (updateError) {
      console.error('POST /api/users profile update error:', updateError);
      // User was created in auth but profile update failed - log but don't fail entirely
      console.warn(`Auth user ${newUser.id} created but profile update failed: ${updateError.message}`);
    }

    const userData = {
      email: newUser.email,
      first_name: firstName,
      last_name: lastName,
      role,
      is_fake: false,
    };

    // Log audit event (don't await - fire and forget)
    logCreate({
      resourceType: 'user',
      resourceId: newUser.id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: userData,
      request,
    });

    return apiSuccess({ uid: newUser.id, email: newUser.email, role }, 201);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/users error:', error);
    return apiError(errorMessage || 'Failed to create user', 500);
  }
}

/**
 * PATCH /api/users - Update user (admin only)
 *
 * Updates user profile in the users table.
 * If email or password are changed, also updates Supabase Auth.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const { uid, displayName, role, photoURL, email, password, firstName, lastName } = body;

    if (!uid) {
      return apiError('User UID is required', 400);
    }

    const supabase = createSupabaseServiceClient();

    // Get current state for audit log
    const { data: beforeState, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    if (fetchError || !beforeState) {
      return apiError('User not found', 404);
    }

    // Update Supabase Auth if email or password changed
    const authUpdate: Record<string, string> = {};
    if (email) authUpdate.email = email;
    if (password) authUpdate.password = password;

    if (Object.keys(authUpdate).length > 0) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(uid, authUpdate);
      if (authUpdateError) {
        return apiError('Failed to update auth user: ' + authUpdateError.message, 500);
      }
    }

    // Build the profile update object (snake_case for Supabase)
    const profileUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (role) profileUpdate.role = role;
    if (photoURL !== undefined) profileUpdate.photo_url = photoURL;
    if (firstName !== undefined) profileUpdate.first_name = firstName;
    if (lastName !== undefined) profileUpdate.last_name = lastName;

    // Handle displayName -> first_name / last_name if individual names not provided
    if (displayName && firstName === undefined && lastName === undefined) {
      const nameParts = displayName.split(' ');
      profileUpdate.first_name = nameParts[0] || null;
      profileUpdate.last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    }

    if (email) profileUpdate.email = email;

    // Update users table
    const { error: updateError } = await supabase
      .from('users')
      .update(profileUpdate)
      .eq('id', uid);

    if (updateError) {
      return apiError('Failed to update user profile: ' + updateError.message, 500);
    }

    // Get updated state for audit log
    const { data: afterState } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    // Log audit event (don't await - fire and forget)
    logUpdate({
      resourceType: 'user',
      resourceId: uid,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      before: beforeState,
      after: afterState || profileUpdate,
      request,
    });

    return apiSuccess({ success: true, uid });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('PATCH /api/users error:', error);
    return apiError(errorMessage || 'Failed to update user', 500);
  }
}

/**
 * DELETE /api/users - Delete user (admin only)
 *
 * Deletes the user profile row (CASCADE cleans up related data),
 * then deletes the Supabase Auth user.
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

    const supabase = createSupabaseServiceClient();

    // Get user data before deletion for audit log
    const { data: beforeState } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    // Delete from users table (CASCADE will clean up related data)
    const { error: deleteDbError } = await supabase
      .from('users')
      .delete()
      .eq('id', uid);

    if (deleteDbError) {
      return apiError('Failed to delete user profile: ' + deleteDbError.message, 500);
    }

    // Delete from Supabase Auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(uid);

    if (deleteAuthError) {
      console.error('DELETE /api/users auth.admin.deleteUser error:', deleteAuthError);
      // Profile already deleted, log warning but don't fail
      console.warn(`User profile deleted but auth deletion failed for ${uid}: ${deleteAuthError.message}`);
    }

    // Log audit event (don't await - fire and forget)
    logDelete({
      resourceType: 'user',
      resourceId: uid,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: beforeState || {},
      request,
    });

    return apiSuccess({ success: true, uid });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('DELETE /api/users error:', error);
    return apiError(errorMessage || 'Failed to delete user', 500);
  }
}
