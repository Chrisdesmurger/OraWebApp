/**
 * API Route: POST /api/recommendations/weekly-refresh
 *
 * Cron endpoint that refreshes recommendations for all users
 * who have completed onboarding.
 *
 * Authentication: CRON_SECRET header or Vercel Cron authorization.
 *
 * Can be triggered by:
 * - Vercel Cron (via vercel.json)
 * - Supabase pg_cron via HTTP call
 * - Manual call with CRON_SECRET
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { generateRecommendations } from '@/lib/recommendations/engine';

export async function POST(request: NextRequest) {
  try {
    // Authenticate via CRON_SECRET or Vercel Cron authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[WeeklyCron] CRON_SECRET not configured');
      return apiError('Cron not configured', 500);
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return apiError('Unauthorized', 401);
    }

    console.log('[WeeklyCron] Starting weekly recommendation refresh...');

    const supabase = createSupabaseServiceClient();

    // Fetch all users who have completed onboarding
    const { data: responses, error: responsesError } = await supabase
      .from('onboarding_responses')
      .select('uid')
      .eq('completed', true);

    if (responsesError) {
      console.error('[WeeklyCron] Error fetching onboarding responses:', responsesError);
      return apiError('Failed to fetch users', 500);
    }

    const userIds = [...new Set((responses || []).map(r => r.uid as string))];
    console.log(`[WeeklyCron] Found ${userIds.length} users with completed onboarding`);

    const results = {
      total: userIds.length,
      success: 0,
      failed: 0,
      errors: [] as { userId: string; error: string }[],
    };

    // Process users sequentially to avoid overwhelming the database
    for (const userId of userIds) {
      try {
        await generateRecommendations(userId, 'weekly_cron');
        results.success++;
      } catch (error: unknown) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({ userId, error: errorMessage });
        console.error(`[WeeklyCron] Failed for user ${userId}:`, errorMessage);
      }
    }

    console.log(
      `[WeeklyCron] Completed: ${results.success}/${results.total} success, ${results.failed} failed`
    );

    return apiSuccess({
      message: `Weekly refresh completed: ${results.success}/${results.total} users processed`,
      results,
    });
  } catch (error: unknown) {
    console.error('[WeeklyCron] Error in weekly refresh:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return apiError(errorMessage, 500);
  }
}
