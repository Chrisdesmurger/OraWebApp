import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { UserRole } from '@/lib/rbac';

/**
 * Supabase Server Client (server-side)
 * Replaces lib/firebase/admin.ts
 *
 * Two modes:
 * - createSupabaseServerClient(): Uses user's session cookies (respects RLS)
 * - createSupabaseServiceClient(): Uses service role key (bypasses RLS)
 */

/**
 * Create a Supabase server client that uses the user's session cookies.
 * Use this in API routes where you want RLS policies to apply.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables');
  }

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // This can fail when called from a Server Component
            // (cookies are read-only in Server Components)
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase service role client (bypasses RLS).
 * Use this for admin operations like audit logging, user management, etc.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get the current user's role from the users table
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) return 'viewer';
  return (data.role as UserRole) || 'viewer';
}

/**
 * Set a user's role (admin operation)
 * Replaces Firebase setCustomUserClaims
 */
export async function setUserRole(
  userId: string,
  role: 'admin' | 'teacher' | 'viewer'
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error(`Failed to set role for user ${userId}:`, error);
    throw error;
  }
  console.log(`Role ${role} set for user ${userId}`);
}

/**
 * Get user by email (admin operation)
 */
export async function getUserByEmail(email: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user with profile data
 */
export async function getUserWithProfile(userId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}
