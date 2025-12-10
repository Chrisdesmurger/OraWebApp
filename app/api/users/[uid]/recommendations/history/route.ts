/**
 * API Route: GET /api/users/[uid]/recommendations/history
 * Fetches recommendation history for a specific user
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  requireRole,
  apiError,
  apiSuccess,
} from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin';
import {
  RecommendationDocument,
  RecommendationHistoryItem,
} from '@/types/recommendation';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Convert Firestore document to RecommendationHistoryItem
 */
function mapToHistoryItem(
  doc: FirebaseFirestore.DocumentSnapshot
): RecommendationHistoryItem | null {
  const data = doc.data() as RecommendationDocument | undefined;

  if (!data) {
    return null;
  }

  const generatedAt =
    data.generated_at instanceof Timestamp
      ? data.generated_at.toDate()
      : new Date(data.generated_at as any);

  return {
    id: doc.id,
    uid: data.uid,
    lessonCount: data.lesson_ids.length,
    avgScore: data.metadata.avg_score,
    generatedAt,
    trigger: data.metadata.trigger,
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

    // Fetch all recommendations (excluding 'latest' as it's a duplicate)
    const snapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('recommendations')
      .orderBy('generated_at', 'desc')
      .limit(11) // Fetch 11 to exclude 'latest' and get 10 historical
      .get();

    if (snapshot.empty) {
      console.log('[API] No recommendation history found');
      return apiSuccess({ history: [] });
    }

    // Map documents to history items, excluding 'latest'
    const history: RecommendationHistoryItem[] = [];

    for (const doc of snapshot.docs) {
      // Skip 'latest' document as it's always the most recent
      if (doc.id === 'latest') {
        continue;
      }

      const historyItem = mapToHistoryItem(doc);
      if (historyItem) {
        history.push(historyItem);
      }
    }

    // Limit to 10 items
    const limitedHistory = history.slice(0, 10);

    console.log(`[API] Found ${limitedHistory.length} recommendation history items`);

    return apiSuccess({ history: limitedHistory });
  } catch (error: any) {
    console.error('[API] Error fetching recommendation history:', error);
    return apiError(
      error.message || 'Failed to fetch recommendation history',
      500
    );
  }
}
