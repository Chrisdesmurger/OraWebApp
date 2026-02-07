import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { UserOnboardingResponse } from '@/types/onboarding';

/**
 * GET /api/admin/onboarding/[id]/responses - Get user responses for onboarding configuration
 *
 * Query params:
 *   - page: number (default: 1)
 *   - limit: number (default: 50, max: 100)
 *   - completed: 'true' | 'false' (optional filter)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { id } = await params;

    if (!id) {
      return apiError('Configuration ID is required', 400);
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const completedFilter = searchParams.get('completed');

    const supabase = createSupabaseServiceClient();

    // Verify config exists
    const { data: configRow, error: configError } = await supabase
      .from('onboarding_configs')
      .select('id')
      .eq('id', id)
      .single();

    if (configError || !configRow) {
      return apiError('Onboarding configuration not found', 404);
    }

    // Build query for user responses
    let responsesQuery = supabase
      .from('onboarding_responses')
      .select('*', { count: 'exact' })
      .eq('config_version', id)
      .order('started_at', { ascending: false });

    // Filter by completion status if provided
    if (completedFilter === 'true') {
      responsesQuery = responsesQuery.eq('completed', true);
    } else if (completedFilter === 'false') {
      responsesQuery = responsesQuery.eq('completed', false);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    responsesQuery = responsesQuery.range(offset, offset + limit - 1);

    const { data: responsesRows, error: responsesError, count: totalCount } = await responsesQuery;

    if (responsesError) {
      console.error('GET /api/admin/onboarding/[id]/responses error:', responsesError);
      return apiError('Failed to fetch user responses', 500);
    }

    // Map responses
    const responses: UserOnboardingResponse[] = (responsesRows || []).map(data => {
      return {
        uid: data.uid,
        configVersion: data.config_version,
        completed: data.completed,
        completedAt: data.completed_at,
        startedAt: data.started_at,
        answers: data.answers || [],
        metadata: data.metadata,
        goals: data.goals,
        mainGoal: data.main_goal,
        experienceLevels: data.experience_levels,
        dailyTimeCommitment: data.daily_time_commitment,
        preferredTimes: data.preferred_times,
        contentPreferences: data.content_preferences,
        practiceStyle: data.practice_style,
        challenges: data.challenges,
        supportPreferences: data.support_preferences,
      } as UserOnboardingResponse;
    });

    const total = totalCount || 0;
    const totalPages = Math.ceil(total / limit);

    return apiSuccess({
      responses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });

  } catch (error: unknown) {
    console.error('GET /api/admin/onboarding/[id]/responses error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user responses';
    return apiError(message, 500);
  }
}
