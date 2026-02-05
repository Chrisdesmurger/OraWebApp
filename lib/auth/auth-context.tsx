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
  // Fetch the user's role from the users table
  const supabase = getSupabaseBrowserClient();
  const { data: profile } = await supabase
    .from('users')
    .select('role, first_name, last_name, photo_url')
    .eq('id', supabaseUser.id)
    .single();

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

    // Get initial session
    supabase.auth.getUser().then(async ({ data: { user: supabaseUser } }) => {
      if (supabaseUser) {
        const authUser = await mapToAuthUser(supabaseUser);
        setUser(authUser);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const authUser = await mapToAuthUser(session.user);
          setUser(authUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
