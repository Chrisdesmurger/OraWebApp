import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Browser Client (client-side)
 * Replaces lib/firebase/client.ts
 *
 * Uses @supabase/ssr for cookie-based auth with Next.js
 */

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign in with magic link (OTP)
 */
export async function signInWithMagicLink(email: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
  return data;
}

/**
 * Get current session access token
 */
export async function getCurrentAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Get public URL for a storage file
 * Replaces getStorageDownloadURL from Firebase
 */
export function getStoragePublicURL(bucket: string, path: string): string | null {
  if (!path || path.trim() === '') return null;

  // If it's already a full HTTP(S) URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const supabase = getSupabaseBrowserClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get public URLs for multiple storage files
 */
export function getStoragePublicURLs(
  bucket: string,
  paths: string[]
): (string | null)[] {
  return paths.map((path) => getStoragePublicURL(bucket, path));
}

/**
 * Determine bucket from a storage path
 * Converts Firebase-style paths to Supabase bucket + path
 *
 * Firebase: media/lessons/{id}/video/high.mp4
 * Supabase: bucket=media-lessons, path={id}/video/high.mp4
 */
export function parseStoragePath(storagePath: string): { bucket: string; path: string } | null {
  if (!storagePath) return null;

  // Remove gs:// prefix if present
  let cleanPath = storagePath;
  if (storagePath.startsWith('gs://')) {
    const match = storagePath.match(/gs:\/\/[^/]+\/(.*)/);
    if (match) cleanPath = match[1];
  }

  // Map Firebase paths to Supabase buckets
  if (cleanPath.startsWith('media/lessons/')) {
    return {
      bucket: 'media-lessons',
      path: cleanPath.replace('media/lessons/', ''),
    };
  }
  if (cleanPath.startsWith('media/programs/')) {
    return {
      bucket: 'media-programs',
      path: cleanPath.replace('media/programs/', ''),
    };
  }
  if (cleanPath.startsWith('media/users/')) {
    return {
      bucket: 'media-users',
      path: cleanPath.replace('media/users/', ''),
    };
  }

  // Default: treat as media-lessons
  return { bucket: 'media-lessons', path: cleanPath };
}

/**
 * Get download URL for a storage path (Firebase-compatible)
 * Handles legacy Firebase-style paths (media/lessons/...)
 */
export function getStorageDownloadURL(storagePath: string): string | null {
  if (!storagePath || storagePath.trim() === '') return null;

  // If it's already a full HTTP(S) URL, return as-is
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }

  const parsed = parseStoragePath(storagePath);
  if (!parsed) return null;

  return getStoragePublicURL(parsed.bucket, parsed.path);
}

/**
 * Get download URLs for multiple storage paths
 */
export function getStorageDownloadURLs(storagePaths: string[]): (string | null)[] {
  return storagePaths.map((path) => getStorageDownloadURL(path));
}
