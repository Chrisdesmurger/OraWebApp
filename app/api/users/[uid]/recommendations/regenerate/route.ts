/**
 * API Route: POST /api/users/[uid]/recommendations/regenerate
 * Manually triggers recommendation regeneration via Cloud Function
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  requireRole,
  apiError,
  apiSuccess,
} from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';

/**
 * POST /api/users/[uid]/recommendations/regenerate
 * Triggers manual recommendation regeneration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request);

    // Check permissions (admin only for manual regeneration)
    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions - Admin role required', 403);
    }

    // Get uid from params
    const { uid } = await params;

    console.log(`[API] Manual recommendation regeneration requested for user: ${uid}`);

    // Verify user exists
    const userDoc = await getFirestore().collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return apiError('User not found', 404);
    }

    // OPTION 1: Call Firebase Cloud Function directly via HTTP
    // This requires the Cloud Function to be deployed with an HTTP trigger
    // Example: https://us-central1-{projectId}.cloudfunctions.net/regenerateUserRecommendations

    // Get Firebase project ID
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
      return apiError('Firebase project ID not configured', 500);
    }

    // Construct Cloud Function URL
    const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/regenerateUserRecommendations`;

    console.log(`[API] Calling Cloud Function: ${functionUrl}`);

    // Call the Cloud Function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Cloud Function error:', errorText);
      return apiError(
        `Failed to regenerate recommendations: ${errorText}`,
        response.status
      );
    }

    const result = await response.json();

    console.log('[API] Recommendations regenerated successfully:', result);

    return apiSuccess({
      message: 'Recommendations regenerated successfully',
      uid,
      result,
    });
  } catch (error: any) {
    console.error('[API] Error regenerating recommendations:', error);

    // Handle specific error cases
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return apiError(
        'Cloud Function not reachable. Make sure the function is deployed.',
        503
      );
    }

    return apiError(
      error.message || 'Failed to regenerate recommendations',
      500
    );
  }
}
