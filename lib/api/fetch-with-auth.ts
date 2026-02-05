/**
 * Fetch wrapper for authenticated API requests
 *
 * With Supabase SSR, auth cookies are sent automatically by the browser.
 * No need to manually inject a Bearer token like with Firebase.
 * This wrapper still handles Content-Type headers.
 */
export async function fetchWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const headers = new Headers(options?.headers);

  // Only set Content-Type to JSON if body is not FormData
  // FormData needs to set its own Content-Type with boundary
  if (!(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
    // Ensure cookies are sent with the request
    credentials: 'same-origin',
  });
}
