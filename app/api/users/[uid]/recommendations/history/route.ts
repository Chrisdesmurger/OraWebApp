/**
 * API Route: GET /api/users/[uid]/recommendations/history
 * Fetches recommendation history for a specific user
 *
 * Reads from user_recommendations table in Supabase
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  requireRole,
  apiError,
  apiSuccess,
} from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import {
  RecommendationHistoryItem,
} from '@/types/recommendation';

type TriggerType = 'onboarding_complete' | 'weekly_cron' | 'manual';

const VALID_TRIGGERS: TriggerType[] = ['onboarding_complete', 'weekly_cron', 'manual'];

/**
 * Convert Supabase row to RecommendationHistoryItem
 */
function mapToHistoryItem(
  row: Record<string, unknown>
): RecommendationHistoryItem | null {
  if (!row) {
    return null;
  }

  const recommendations = row.recommendations as Record<string, unknown> | undefined;
  if (!recommendations) return null;

  const lessonIds = (recommendations.lesson_ids as string[]) || [];
  const metadata = (recommendations.metadata as Record<string, unknown>) || {};

  const rawTrigger = (metadata.trigger as string) || 'manual';
  const trigger: TriggerType = VALID_TRIGGERS.includes(rawTrigger as TriggerType)
    ? (rawTrigger as TriggerType)
    : 'manual';

  return {
    id: row.id as string,
    uid: (row.user_id as string) || '',
    lessonCount: lessonIds.length,
    avgScore: (metadata.avg_score as number) || 0,
    generatedAt: row.generated_at
      ? new Date(row.generated_at as string)
      : new Date(),
    trigger,
  };
}

/**
 * GET /api/users/[uid]/recommendations/history
 * Returns the last 10 recommendations for a user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request);

    // Check permissions (admin or teacher)
    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    // Get uid from params
    const { uid } = await params;

    console.log(`[API] Fetching recommendation history for user: ${uid}`);

    const supabase = createSupabaseServiceClient();

    // Fetch all recommendations, ordered by most recent
    const { data: rows, error } = await supabase
      .from('user_recommendations')
      .select('*')
      .eq('user_id', uid)
      .order('generated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[API] Error fetching recommendation history:', error);
      return apiError('Failed to fetch recommendation history', 500);
    }

    if (!rows || rows.length === 0) {
      console.log('[API] No recommendation history found');
      return apiSuccess({ history: [] });
    }

    // Map rows to history items
    const history: RecommendationHistoryItem[] = [];

    for (const row of rows) {
      const historyItem = mapToHistoryItem(row);
      if (historyItem) {
        history.push(historyItem);
      }
    }

    console.log(`[API] Found ${history.length} recommendation history items`);

    return apiSuccess({ history });
  } catch (error: unknown) {
    console.error('[API] Error fetching recommendation history:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch recommendation history';
    return apiError(errorMessage, 500);
  }
}
