'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signOut } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

export interface AuthUser extends User {
  role?: 'admin' | 'teacher' | 'viewer';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Get user token to extract custom claims
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const role = idTokenResult.claims.role as 'admin' | 'teacher' | 'viewer' | undefined;

        setUser({
          ...firebaseUser,
          role: role || 'viewer', // Default to viewer if no role set
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (user) {
      const idTokenResult = await user.getIdTokenResult(true);
      const role = idTokenResult.claims.role as 'admin' | 'teacher' | 'viewer' | undefined;
      setUser({
        ...user,
        role: role || 'viewer',
      });
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
