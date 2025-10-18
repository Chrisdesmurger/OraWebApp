import { redirect } from 'next/navigation';
import { verifyIdToken } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export type UserRole = 'admin' | 'teacher' | 'viewer';

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  role: UserRole;
}

/**
 * Server-side authentication guard
 * Verifies Firebase ID token from cookie and checks user role
 */
export async function requireAuth(requiredRoles?: UserRole[]): Promise<AuthenticatedUser> {
  try {
    const cookieStore = await cookies();
    const idToken = cookieStore.get('firebaseIdToken')?.value;

    if (!idToken) {
      console.log('❌ No ID token found in cookies');
      redirect('/login');
    }

    // Verify token with Firebase Admin
    const decodedToken = await verifyIdToken(idToken);
    const role = (decodedToken.role as UserRole) || 'viewer';

    // Check if user has required role
    if (requiredRoles && !requiredRoles.includes(role)) {
      console.log(`❌ Access denied. Required roles: ${requiredRoles.join(', ')}, User role: ${role}`);
      redirect('/unauthorized');
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
    };
  } catch (error) {
    console.error('❌ Auth verification failed:', error);
    redirect('/login');
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
    const cookieStore = await cookies();
    const idToken = cookieStore.get('firebaseIdToken')?.value;

    if (!idToken) {
      return null;
    }

    const decodedToken = await verifyIdToken(idToken);
    const role = (decodedToken.role as UserRole) || 'viewer';

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}
