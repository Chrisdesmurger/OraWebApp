import { getCurrentUserIdToken } from '@/lib/firebase/client';

/**
 * Fetch wrapper that automatically includes Firebase authentication token
 */
export async function fetchWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const idToken = await getCurrentUserIdToken();

  if (!idToken) {
    throw new Error('User not authenticated');
  }

  const headers = new Headers(options?.headers);
  headers.set('Authorization', `Bearer ${idToken}`);
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
  });
}
