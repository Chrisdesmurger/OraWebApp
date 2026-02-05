import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getUserRole } from '@/lib/supabase/server';

export type UserRole = 'admin' | 'teacher' | 'viewer';

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  role: UserRole;
}

/**
 * Server-side authentication guard
 * Verifies Supabase session from cookie and checks user role
 */
export async function requireAuth(requiredRoles?: UserRole[]): Promise<AuthenticatedUser> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      redirect('/login');
    }

    const role = await getUserRole(user.id);

    if (requiredRoles && !requiredRoles.includes(role as UserRole)) {
      redirect('/unauthorized');
    }

    return {
      uid: user.id,
      email: user.email,
      role: role as UserRole,
    };
  } catch (error) {
    // Don't catch redirect errors - rethrow them
    throw error;
  }
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  return requireAuth(['admin']);
}

/**
 * Require teacher or admin role
 */
export async function requireTeacher(): Promise<AuthenticatedUser> {
  return requireAuth(['admin', 'teacher']);
}

/**
 * Get current authenticated user without role requirement
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const role = await getUserRole(user.id);

    return {
      uid: user.id,
      email: user.email,
      role: role as UserRole,
    };
  } catch {
    return null;
  }
}
