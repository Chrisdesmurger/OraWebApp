/**
 * API Route: GET /api/users/[uid]/recommendations
 * Fetches the latest recommendation for a specific user
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
  Recommendation,
  RecommendedLesson,
  RecommendationWithLessons,
} from '@/types/recommendation';

/**
 * Convert Supabase row to frontend Recommendation
 */
function mapRecommendationRow(
  row: Record<string, unknown>
): Recommendation | null {
  if (!row) {
    return null;
  }

  const recommendations = row.recommendations as Record<string, unknown> | undefined;
  if (!recommendations) return null;

  return {
    uid: (row.user_id as string) || '',
    lessonIds: (recommendations.lesson_ids as string[]) || [],
    scores: (recommendations.scores as Record<string, number>) || {},
    generatedAt: row.generated_at
      ? new Date(row.generated_at as string)
      : new Date(),
    algorithmVersion: (recommendations.algorithm_version as string) || '1.0',
    basedOn: {
      intentions: (recommendations.based_on as any)?.intentions || [],
      experienceLevels: (recommendations.based_on as any)?.experience_levels || [],
      timeCommitment: (recommendations.based_on as any)?.time_commitment || 0,
      completedLessonIds: (recommendations.based_on as any)?.completed_lesson_ids || [],
    },
    metadata: {
      totalLessonsScored: (recommendations.metadata as any)?.total_lessons_scored || 0,
      avgScore: (recommendations.metadata as any)?.avg_score || 0,
      trigger: (recommendations.metadata as any)?.trigger || 'manual',
    },
  };
}

/**
 * Fetch lesson details for recommended lessons
 */
async function enrichRecommendationWithLessons(
  recommendation: Recommendation
): Promise<RecommendationWithLessons> {
  const lessons: RecommendedLesson[] = [];
  const supabase = createSupabaseServiceClient();

  // Fetch all recommended lessons in one query
  if (recommendation.lessonIds.length > 0) {
    const { data: lessonRows } = await supabase
      .from('lessons')
      .select('id, title, discipline, difficulty, duration_sec, thumbnail_url, program_id, program_title')
      .in('id', recommendation.lessonIds);

    const lessonMap = new Map<string, Record<string, unknown>>();
    (lessonRows || []).forEach(row => lessonMap.set(row.id, row));

    for (let i = 0; i < recommendation.lessonIds.length; i++) {
      const lessonId = recommendation.lessonIds[i];
      const score = recommendation.scores[lessonId] || 0;
      const lessonData = lessonMap.get(lessonId);

      if (lessonData) {
        lessons.push({
          id: lessonId,
          title: (lessonData.title as string) || 'Sans titre',
          discipline: (lessonData.discipline as string) || 'Autre',
          difficulty: (lessonData.difficulty as string) || 'Debutant',
          duration: (lessonData.duration_sec as number) || 0,
          score,
          rank: i + 1,
          thumbnailUrl: lessonData.thumbnail_url as string | undefined,
          programId: lessonData.program_id as string | undefined,
          programTitle: lessonData.program_title as string | undefined,
        });
      } else {
        // Lesson not found, add placeholder
        lessons.push({
          id: lessonId,
          title: `Lecon introuvable (${lessonId})`,
          discipline: 'Inconnu',
          difficulty: 'Inconnu',
          duration: 0,
          score,
          rank: i + 1,
        });
      }
    }
  }

  return {
    ...recommendation,
    lessons,
  };
}

/**
 * GET /api/users/[uid]/recommendations
 * Returns the latest recommendation for a user with enriched lesson details
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

    console.log(`[API] Fetching latest recommendation for user: ${uid}`);

    const supabase = createSupabaseServiceClient();

    // Fetch latest recommendation
    const { data: recRow, error: recError } = await supabase
      .from('user_recommendations')
      .select('*')
      .eq('user_id', uid)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (recError || !recRow) {
      return apiError('No recommendations found for this user', 404);
    }

    // Map Supabase row to frontend model
    const recommendation = mapRecommendationRow(recRow);

    if (!recommendation) {
      return apiError('Invalid recommendation data', 500);
    }

    // Enrich with lesson details
    const enrichedRecommendation =
      await enrichRecommendationWithLessons(recommendation);

    console.log(
      `[API] Successfully fetched ${enrichedRecommendation.lessons.length} recommended lessons`
    );

    return apiSuccess({
      recommendation: enrichedRecommendation,
    });
  } catch (error: unknown) {
    console.error('[API] Error fetching recommendation:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch recommendation';
    return apiError(errorMessage, 500);
  }
}
