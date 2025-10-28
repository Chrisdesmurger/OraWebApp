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

  // Only set Content-Type to JSON if body is not FormData
  // FormData needs to set its own Content-Type with boundary
  if (!(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
