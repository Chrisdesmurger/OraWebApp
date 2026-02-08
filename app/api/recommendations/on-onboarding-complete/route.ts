/**
 * API Route: POST /api/recommendations/on-onboarding-complete
 *
 * Called by the mobile app when a user completes the onboarding flow.
 * Generates personalized recommendations based on their responses.
 *
 * Authentication: Supabase Auth (the user themselves) or service key.
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { generateRecommendations } from '@/lib/recommendations/engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return apiError('userId is required', 400);
    }

    // Authenticate: either the user themselves via Supabase session,
    // or an internal service call
    const authHeader = request.headers.get('authorization');
    const internalApiKey = process.env.INTERNAL_API_KEY;

    if (authHeader && internalApiKey && authHeader === `Bearer ${internalApiKey}`) {
      // Internal service call - trusted
      console.log(`[API] Onboarding complete trigger (internal) for user: ${userId}`);
    } else {
      // Verify the calling user matches the userId
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return apiError('Authentication required', 401);
      }

      if (user.id !== userId) {
        return apiError('Cannot generate recommendations for another user', 403);
      }

      console.log(`[API] Onboarding complete trigger (user) for user: ${userId}`);
    }

    // Verify user exists
    const supabase = createSupabaseServiceClient();
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      return apiError('User not found', 404);
    }

    // Generate recommendations
    const result = await generateRecommendations(userId, 'onboarding_complete');

    return apiSuccess({
      message: 'Recommendations generated successfully',
      userId,
      result,
    });
  } catch (error: unknown) {
    console.error('[API] Error generating recommendations on onboarding complete:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return apiError(errorMessage, 500);
  }
}
