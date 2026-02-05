/**
 * API Route: POST /api/users/[uid]/recommendations/regenerate
 * Manually triggers recommendation regeneration via Cloud Function HTTP endpoint
 *
 * This route calls the Firebase Cloud Function `regenerateUserRecommendationsHttp`
 * which is an HTTP endpoint (onRequest), NOT a callable function (onCall).
 *
 * @see https://github.com/Chrisdesmurger/OraWebApp/issues/66
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  requireRole,
  apiError,
  apiSuccess,
} from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Firebase Cloud Function HTTP endpoint URL
 * Uses onRequest (HTTP) instead of onCall (Callable) for direct fetch() access
 */
const REGENERATE_FUNCTION_URL =
  'https://us-central1-ora-wellbeing.cloudfunctions.net/regenerateUserRecommendationsHttp';

/**
 * POST /api/users/[uid]/recommendations/regenerate
 * Triggers manual recommendation regeneration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request);

    // Check permissions (admin only for manual regeneration)
    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions - Admin role required', 403);
    }

    // Get uid from params
    const { uid } = await params;

    console.log(`[API] Manual recommendation regeneration requested for user: ${uid}`);

    // Verify user exists in Supabase
    const supabase = createSupabaseServiceClient();
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', uid)
      .single();

    if (userError || !userRow) {
      return apiError('User not found', 404);
    }

    console.log(`[API] Calling Cloud Function: ${REGENERATE_FUNCTION_URL}`);

    // Call the HTTP Cloud Function endpoint
    const response = await fetch(REGENERATE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid }),
    });

    // Parse response
    const result = await response.json();

    if (!response.ok) {
      console.error('[API] Cloud Function error:', result);

      // Return error from Cloud Function with details
      const errorMessage = result.details
        ? `${result.error}: ${result.details}`
        : result.error || 'Failed to regenerate recommendations';

      return apiError(errorMessage, response.status);
    }

    console.log('[API] Recommendations regenerated successfully:', result);

    return apiSuccess({
      message: 'Recommendations regenerated successfully',
      uid,
      result,
    });
  } catch (error: unknown) {
    console.error('[API] Error regenerating recommendations:', error);

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return apiError(
        'Cloud Function not reachable. Make sure the function is deployed.',
        503
      );
    }

    // Handle other errors
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return apiError(errorMessage, 500);
  }
}
