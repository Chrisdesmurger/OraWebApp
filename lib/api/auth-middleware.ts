import { NextRequest } from 'next/server';
import { createSupabaseServerClient, getUserRole } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/rbac';

export interface AuthenticatedRequest {
  uid: string;
  email: string | undefined;
  role: UserRole;
}

/**
 * Authenticate request using Supabase session
 * Uses cookie-based session from Supabase SSR
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest> {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('[auth-middleware] Authentication failed:', error?.message || 'No user');
    throw new Error('Missing or invalid authentication');
  }

  // Get role from users table (replaces Firebase custom claims)
  const role = await getUserRole(user.id);

  return {
    uid: user.id,
    email: user.email,
    role,
  };
}

/**
 * Check if authenticated user has required role
 */
export function requireRole(user: AuthenticatedRequest, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * Standard API error response
 */
export function apiError(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
}

/**
 * Standard API success response
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return Response.json(data, { status });
}
