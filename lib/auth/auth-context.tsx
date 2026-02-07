'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseBrowserClient, signOut as supabaseSignOut } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  uid: string;
  email: string | undefined;
  displayName: string | null;
  photoURL: string | null;
  role?: 'admin' | 'teacher' | 'viewer';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Map Supabase user + profile data to AuthUser
 */
async function mapToAuthUser(supabaseUser: User): Promise<AuthUser> {
  console.log(`[AUTH] mapToAuthUser called for ${supabaseUser.email} (id: ${supabaseUser.id})`);
  // Fetch the user's role from the users table
  const supabase = getSupabaseBrowserClient();
  console.log('[AUTH] Querying users table...');
  const { data: profile, error } = await supabase
    .from('users')
    .select('role, first_name, last_name, photo_url')
    .eq('id', supabaseUser.id)
    .single();
  console.log(`[AUTH] Users query result: data=${JSON.stringify(profile)}, error=${error?.message || 'none'}`);

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null
    : supabaseUser.user_metadata?.full_name || null;

  return {
    uid: supabaseUser.id,
    email: supabaseUser.email,
    displayName,
    photoURL: profile?.photo_url || supabaseUser.user_metadata?.avatar_url || null,
    role: (profile?.role as AuthUser['role']) || 'viewer',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // IMPORTANT: Do NOT make Supabase DB queries inside onAuthStateChange.
    // The auth client holds an internal lock during the callback, causing
    // DB queries (which need the auth token) to deadlock.
    // Instead: set user from session data immediately, fetch role separately.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[AUTH] onAuthStateChange: event=${event}, user=${session?.user?.email || 'null'}`);
        if (session?.user) {
          // Set user immediately from session (no DB query here)
          // Keep loading=true until role is fetched (admin layout checks role)
          const supabaseUser = session.user;
          setUser({
            uid: supabaseUser.id,
            email: supabaseUser.email,
            displayName: supabaseUser.user_metadata?.full_name || null,
            photoURL: supabaseUser.user_metadata?.avatar_url || null,
            role: undefined, // will be set by fetchAndUpdateRole
          });
          console.log(`[AUTH] User set from session, fetching role...`);

          // Fetch role asynchronously OUTSIDE the callback lock
          setTimeout(() => {
            fetchAndUpdateRole(supabaseUser.id);
          }, 0);
        } else {
          console.log('[AUTH] No session → user=null');
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user role from the users table (outside onAuthStateChange)
  const fetchAndUpdateRole = async (userId: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      console.log(`[AUTH] Fetching role for user ${userId}...`);
      const { data: profile, error } = await supabase
        .from('users')
        .select('role, first_name, last_name, photo_url')
        .eq('id', userId)
        .single();
      console.log(`[AUTH] Role fetch result: role=${profile?.role || 'none'}, error=${error?.message || 'none'}`);

      if (profile) {
        setUser(prev => prev ? {
          ...prev,
          displayName: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || prev.displayName,
          photoURL: profile.photo_url || prev.photoURL,
          role: (profile.role as AuthUser['role']) || 'viewer',
        } : prev);
      } else {
        // No profile in users table - keep role as viewer
        setUser(prev => prev ? { ...prev, role: 'viewer' } : prev);
      }
    } catch (err) {
      console.error('[AUTH] Failed to fetch role:', err);
      setUser(prev => prev ? { ...prev, role: 'viewer' } : prev);
    } finally {
      setLoading(false);
      console.log('[AUTH] loading=false (role fetch complete)');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabaseSignOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (supabaseUser) {
      const authUser = await mapToAuthUser(supabaseUser);
      setUser(authUser);
    }
  };

  const value = {
    user,
    loading,
    signOut: handleSignOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
