import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { OnboardingAnalytics, QuestionMetrics } from '@/types/onboarding';

/**
 * GET /api/admin/onboarding/[id]/analytics - Get analytics for onboarding configuration
 *
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
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
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const supabase = createSupabaseServiceClient();

    // Verify config exists
    const { data: configRow, error: configError } = await supabase
      .from('onboarding_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (configError || !configRow) {
      return apiError('Onboarding configuration not found', 404);
    }

    const configData = configRow;

    // Build query for user responses
    let responsesQuery = supabase
      .from('onboarding_responses')
      .select('*')
      .eq('config_version', id);

    // Apply date filters if provided
    if (startDateParam) {
      responsesQuery = responsesQuery.gte('started_at', startDateParam);
    }

    if (endDateParam) {
      responsesQuery = responsesQuery.lte('started_at', endDateParam);
    }

    const { data: responsesRows, error: responsesError } = await responsesQuery;

    if (responsesError) {
      console.error('GET /api/admin/onboarding/[id]/analytics responses error:', responsesError);
      return apiError('Failed to fetch responses', 500);
    }

    const responses = responsesRows || [];

    // Calculate analytics
    let totalStarts = 0;
    let totalCompletions = 0;
    let totalTimeSeconds = 0;
    const questionMetrics: Record<string, QuestionMetrics> = {};

    // Initialize question metrics
    if (configData?.questions && Array.isArray(configData.questions)) {
      configData.questions.forEach((q: any) => {
        questionMetrics[q.id] = {
          questionId: q.id,
          questionTitle: q.title,
          views: 0,
          answers: 0,
          dropOffs: 0,
          dropOffRate: 0,
          averageTimeSeconds: 0,
          answerDistribution: {},
        };
      });
    }

    // Process responses
    responses.forEach(data => {
      totalStarts++;

      if (data.completed) {
        totalCompletions++;
      }

      if (data.metadata?.total_time_seconds) {
        totalTimeSeconds += data.metadata.total_time_seconds;
      }

      // Process answers
      if (data.answers && Array.isArray(data.answers)) {
        const answeredQuestionIds = new Set<string>();

        data.answers.forEach((answer: any) => {
          const qId = answer.question_id;

          if (questionMetrics[qId]) {
            questionMetrics[qId].views++;
            questionMetrics[qId].answers++;
            answeredQuestionIds.add(qId);

            // Count answer distribution
            answer.selected_options?.forEach((optionId: string) => {
              if (!questionMetrics[qId].answerDistribution[optionId]) {
                questionMetrics[qId].answerDistribution[optionId] = 0;
              }
              questionMetrics[qId].answerDistribution[optionId]++;
            });
          }
        });

        // Calculate drop-offs
        if (!data.completed && configData?.questions && Array.isArray(configData.questions)) {
          // Find last answered question
          const lastAnsweredIndex = configData.questions.findIndex(
            (q: any) => !answeredQuestionIds.has(q.id)
          );

          if (lastAnsweredIndex > 0) {
            const dropOffQuestionId = configData.questions[lastAnsweredIndex].id;
            if (questionMetrics[dropOffQuestionId]) {
              questionMetrics[dropOffQuestionId].dropOffs++;
            }
          }
        }
      }
    });

    // Calculate rates and averages
    const completionRate = totalStarts > 0 ? (totalCompletions / totalStarts) * 100 : 0;
    const averageTimeSeconds = totalCompletions > 0 ? totalTimeSeconds / totalCompletions : 0;

    Object.values(questionMetrics).forEach(metric => {
      if (metric.views > 0) {
        metric.dropOffRate = (metric.dropOffs / metric.views) * 100;
      }
    });

    const analytics: OnboardingAnalytics = {
      versionId: id,
      totalStarts,
      totalCompletions,
      completionRate: Math.round(completionRate * 100) / 100,
      averageTimeSeconds: Math.round(averageTimeSeconds),
      questionMetrics,
      updatedAt: new Date(),
    };

    return apiSuccess(analytics);

  } catch (error: unknown) {
    console.error('GET /api/admin/onboarding/[id]/analytics error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
    return apiError(message, 500);
  }
}
