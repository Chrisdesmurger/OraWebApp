import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { ActivityDocument, mapActivityDocument } from '@/lib/types/activity';

/**
 * GET /api/activity - Get recent activities
 *
 * Returns last 50 activities sorted by timestamp
 * Accessible by: admin, teacher
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    // Check permissions - admin and teacher roles can view activities
    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const firestore = getFirestore();

    console.log('[GET /api/activity] Fetching activities from Firestore...');

    // Query activities collection - use snake_case field name (created_at)
    let activitiesSnapshot;
    try {
      activitiesSnapshot = await firestore
        .collection('activities')
        .orderBy('created_at', 'desc')
        .limit(50)
        .get();

      console.log('[GET /api/activity] Found', activitiesSnapshot.size, 'activities');
    } catch (orderError: any) {
      console.warn('[GET /api/activity] orderBy failed:', orderError.message);

      // Fallback: fetch without ordering
      activitiesSnapshot = await firestore
        .collection('activities')
        .limit(50)
        .get();

      console.log('[GET /api/activity] Without orderBy - Found', activitiesSnapshot.size, 'activities');
    }

    // Map Firestore documents to frontend format (snake_case -> camelCase)
    const activities = activitiesSnapshot.docs.map((doc) => {
      const data = doc.data() as ActivityDocument;
      console.log('[GET /api/activity] Activity doc:', doc.id, 'has fields:', Object.keys(data));

      return mapActivityDocument(doc.id, data);
    });

    console.log('[GET /api/activity] Returning', activities.length, 'activities');
    return apiSuccess({ activities });
  } catch (error: any) {
    console.error('[GET /api/activity] Error:', error);
    return apiError(error.message || 'Failed to fetch activities', 401);
  }
}

/**
 * POST /api/activity - Create a new activity log
 *
 * This endpoint is used internally by other API routes to log activities
 * Accessible by: admin, teacher (for their own actions)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    // Check permissions
    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const {
      type,
      category,
      actorId,
      actorName,
      actorEmail,
      resourceId,
      resourceType,
      resourceTitle,
      description,
      metadata,
    } = body;

    if (!type || !category || !description) {
      return apiError('Type, category, and description are required', 400);
    }

    const firestore = getFirestore();

    // Create activity document in Firestore (snake_case)
    const activityDoc = {
      type,
      category,
      actor_id: actorId || user.uid,
      actor_name: actorName || user.email?.split('@')[0] || 'Unknown',
      actor_email: actorEmail || user.email || '',
      resource_id: resourceId || null,
      resource_type: resourceType || null,
      resource_title: resourceTitle || null,
      description,
      metadata: metadata || {},
      created_at: Date.now(), // Unix timestamp in milliseconds
    };

    const docRef = await firestore.collection('activities').add(activityDoc);

    console.log('[POST /api/activity] Created activity:', docRef.id);

    // Return camelCase version for frontend
    return apiSuccess(
      {
        id: docRef.id,
        type,
        category,
        actorId: activityDoc.actor_id,
        actorName: activityDoc.actor_name,
        actorEmail: activityDoc.actor_email,
        resourceId: activityDoc.resource_id,
        resourceType: activityDoc.resource_type,
        resourceTitle: activityDoc.resource_title,
        description,
        metadata: activityDoc.metadata,
        createdAt: activityDoc.created_at,
      },
      201
    );
  } catch (error: any) {
    console.error('[POST /api/activity] Error:', error);
    return apiError(error.message || 'Failed to create activity', 500);
  }
}
