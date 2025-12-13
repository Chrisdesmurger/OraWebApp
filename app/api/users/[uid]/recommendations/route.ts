/**
 * API Route: GET /api/users/[uid]/recommendations
 * Fetches the latest recommendation for a specific user
 *
 * IMPORTANT: Reads from user_onboarding/{uid}/recommendations/latest
 * (Updated path after Firestore migration - see issue #66)
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  requireRole,
  apiError,
  apiSuccess,
} from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import {
  Recommendation,
  RecommendationDocument,
  RecommendedLesson,
  RecommendationWithLessons,
} from '@/types/recommendation';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Convert Firestore RecommendationDocument to frontend Recommendation
 */
function mapRecommendationDocument(
  doc: FirebaseFirestore.DocumentSnapshot
): Recommendation | null {
  const data = doc.data() as RecommendationDocument | undefined;

  if (!data) {
    return null;
  }

  return {
    uid: data.uid,
    lessonIds: data.lesson_ids,
    scores: data.scores,
    generatedAt:
      data.generated_at instanceof Timestamp
        ? data.generated_at.toDate()
        : new Date(data.generated_at as unknown as string),
    algorithmVersion: data.algorithm_version,
    basedOn: {
      intentions: data.based_on.intentions,
      experienceLevels: data.based_on.experience_levels,
      timeCommitment: data.based_on.time_commitment,
      completedLessonIds: data.based_on.completed_lesson_ids,
    },
    metadata: {
      totalLessonsScored: data.metadata.total_lessons_scored,
      avgScore: data.metadata.avg_score,
      trigger: data.metadata.trigger,
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

  // Fetch all recommended lessons
  for (let i = 0; i < recommendation.lessonIds.length; i++) {
    const lessonId = recommendation.lessonIds[i];
    const score = recommendation.scores[lessonId] || 0;

    try {
      const lessonDoc = await getFirestore().collection('lessons').doc(lessonId).get();

      if (lessonDoc.exists) {
        const lessonData = lessonDoc.data();

        lessons.push({
          id: lessonId,
          title: lessonData?.title || 'Sans titre',
          discipline: lessonData?.discipline || 'Autre',
          difficulty: lessonData?.difficulty || 'Debutant',
          duration: lessonData?.duration_sec || 0,
          score,
          rank: i + 1, // Rank 1-5
          thumbnailUrl: lessonData?.thumbnail_url,
          programId: lessonData?.program_id,
          programTitle: lessonData?.program_title,
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
    } catch (error) {
      console.error(`[API] Error fetching lesson ${lessonId}:`, error);
      // Add error placeholder
      lessons.push({
        id: lessonId,
        title: `Erreur de chargement (${lessonId})`,
        discipline: 'Erreur',
        difficulty: 'Erreur',
        duration: 0,
        score,
        rank: i + 1,
      });
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

    // Fetch latest recommendation from NEW path: user_onboarding/{uid}/recommendations/latest
    // (Updated after Firestore migration - see issue #66)
    const latestDoc = await getFirestore()
      .collection('user_onboarding')
      .doc(uid)
      .collection('recommendations')
      .doc('latest')
      .get();

    if (!latestDoc.exists) {
      return apiError('No recommendations found for this user', 404);
    }

    // Map Firestore document to frontend model
    const recommendation = mapRecommendationDocument(latestDoc);

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
