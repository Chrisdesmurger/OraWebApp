import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import type { UserRole } from '@/lib/rbac';

export interface AuthenticatedRequest {
  uid: string;
  email: string | undefined;
  role: UserRole;
}

/**
 * Extract and verify Firebase ID token from request headers
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await verifyIdToken(idToken);
    const role = (decodedToken.role as UserRole) || 'viewer';

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
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
