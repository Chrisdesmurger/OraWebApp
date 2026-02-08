/**
 * API Route: GET /api/admin/onboarding/active
 *
 * Returns the currently active onboarding configuration with questions.
 * Used by the recommendation rules page to list available questions.
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const supabase = createSupabaseServiceClient();

    const { data: config, error } = await supabase
      .from('onboarding_configs')
      .select('id, title, questions, recommendation_rules')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('GET /api/admin/onboarding/active error:', error);
      return apiError('Failed to fetch active configuration', 500);
    }

    if (!config) {
      return apiSuccess({ questions: [], recommendationRules: [] });
    }

    return apiSuccess({
      id: config.id,
      title: config.title,
      questions: config.questions || [],
      recommendationRules: config.recommendation_rules || [],
    });
  } catch (error: unknown) {
    console.error('GET /api/admin/onboarding/active error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch active configuration';
    return apiError(message, 401);
  }
}
