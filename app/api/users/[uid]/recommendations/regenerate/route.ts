/**
 * API Route: POST /api/users/[uid]/recommendations/regenerate
 * Manually triggers recommendation regeneration using the local engine.
 *
 * Replaced the former Firebase Cloud Function `regenerateUserRecommendationsHttp`
 * with a Supabase-native recommendation engine.
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  requireRole,
  apiError,
  apiSuccess,
} from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { generateRecommendations } from '@/lib/recommendations/engine';

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

    // Generate recommendations using the local engine
    const result = await generateRecommendations(uid, 'manual');

    console.log('[API] Recommendations regenerated successfully:', result);

    return apiSuccess({
      message: 'Recommendations regenerated successfully',
      uid,
      result,
    });
  } catch (error: unknown) {
    console.error('[API] Error regenerating recommendations:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return apiError(errorMessage, 500);
  }
}
