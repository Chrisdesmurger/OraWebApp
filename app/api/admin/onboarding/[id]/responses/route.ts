import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
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

    const db = getFirestore();

    // Verify config exists
    const configDoc = await db.collection('onboarding_configs').doc(id).get();
    if (!configDoc.exists) {
      return apiError('Onboarding configuration not found', 404);
    }

    // Build query for user responses using collectionGroup (efficient)
    // NEW: Query dedicated collection instead of nested field
    let responsesQuery = db
      .collectionGroup('responses')
      .where('config_version', '==', id)
      .orderBy('started_at', 'desc');

    // Filter by completion status if provided
    if (completedFilter === 'true') {
      responsesQuery = responsesQuery.where('completed', '==', true) as any;
    } else if (completedFilter === 'false') {
      responsesQuery = responsesQuery.where('completed', '==', false) as any;
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    responsesQuery = responsesQuery.limit(limit);

    if (offset > 0) {
      // Cursor-based pagination for better performance
      const skipSnapshot = await db
        .collectionGroup('responses')
        .where('config_version', '==', id)
        .orderBy('started_at', 'desc')
        .limit(offset)
        .get();

      if (!skipSnapshot.empty) {
        const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        responsesQuery = responsesQuery.startAfter(lastDoc) as any;
      }
    }

    const responsesSnapshot = await responsesQuery.get();

    // Get total count (for pagination metadata)
    let countQuery = db
      .collectionGroup('responses')
      .where('config_version', '==', id);

    if (completedFilter === 'true') {
      countQuery = countQuery.where('completed', '==', true) as any;
    } else if (completedFilter === 'false') {
      countQuery = countQuery.where('completed', '==', false) as any;
    }

    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;

    // Map responses (data already in camelCase format from Firestore)
    const responses: UserOnboardingResponse[] = responsesSnapshot.docs.map(doc => {
      const data = doc.data();
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

    const totalPages = Math.ceil(totalCount / limit);

    return apiSuccess({
      responses,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });

  } catch (error: any) {
    console.error('GET /api/admin/onboarding/[id]/responses error:', error);
    return apiError(error.message || 'Failed to fetch user responses', 500);
  }
}
