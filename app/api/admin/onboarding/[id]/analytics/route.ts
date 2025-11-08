import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import type { OnboardingAnalytics, UserOnboardingResponse, QuestionMetrics } from '@/types/onboarding';

/**
 * GET /api/admin/onboarding/[id]/analytics - Get analytics for onboarding configuration
 *
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { id } = params;

    if (!id) {
      return apiError('Configuration ID is required', 400);
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const db = getFirestore();

    // Verify config exists
    const configDoc = await db.collection('onboarding_configs').doc(id).get();
    if (!configDoc.exists) {
      return apiError('Onboarding configuration not found', 404);
    }

    const configData = configDoc.data();

    // Build query for user responses
    let responsesQuery = db
      .collection('users')
      .where('onboarding.configVersion', '==', id);

    // Apply date filters if provided
    if (startDateParam) {
      const startDate = new Date(startDateParam);
      responsesQuery = responsesQuery.where('onboarding.startedAt', '>=', startDate) as any;
    }

    if (endDateParam) {
      const endDate = new Date(endDateParam);
      responsesQuery = responsesQuery.where('onboarding.startedAt', '<=', endDate) as any;
    }

    const responsesSnapshot = await responsesQuery.get();

    // Calculate analytics
    let totalStarts = 0;
    let totalCompletions = 0;
    let totalTimeSeconds = 0;
    const questionMetrics: Record<string, QuestionMetrics> = {};

    // Initialize question metrics
    if (configData?.questions) {
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
    responsesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const onboardingData = data.onboarding;

      if (!onboardingData) return;

      totalStarts++;

      if (onboardingData.completed) {
        totalCompletions++;
      }

      if (onboardingData.metadata?.totalTimeSeconds) {
        totalTimeSeconds += onboardingData.metadata.totalTimeSeconds;
      }

      // Process answers
      if (onboardingData.answers && Array.isArray(onboardingData.answers)) {
        const answeredQuestionIds = new Set<string>();

        onboardingData.answers.forEach((answer: any) => {
          const qId = answer.questionId;

          if (questionMetrics[qId]) {
            questionMetrics[qId].views++;
            questionMetrics[qId].answers++;
            answeredQuestionIds.add(qId);

            // Count answer distribution
            answer.selectedOptions?.forEach((optionId: string) => {
              if (!questionMetrics[qId].answerDistribution[optionId]) {
                questionMetrics[qId].answerDistribution[optionId] = 0;
              }
              questionMetrics[qId].answerDistribution[optionId]++;
            });
          }
        });

        // Calculate drop-offs
        if (!onboardingData.completed && configData?.questions) {
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

  } catch (error: any) {
    console.error('GET /api/admin/onboarding/[id]/analytics error:', error);
    return apiError(error.message || 'Failed to fetch analytics', 500);
  }
}
