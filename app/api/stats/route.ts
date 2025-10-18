import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';

/**
 * GET /api/stats - Get dashboard statistics
 * Cached for 60 seconds
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const firestore = getFirestore();

    // Fetch counts in parallel
    const [usersSnapshot, programsSnapshot, lessonsSnapshot, mediaSnapshot] = await Promise.all([
      firestore.collection('users').count().get(),
      firestore.collection('programs').count().get(),
      firestore.collection('lessons').count().get(),
      firestore.collection('media').count().get(),
    ]);

    // Calculate active users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUsersSnapshot = await firestore
      .collection('users')
      .where('lastLoginAt', '>=', sevenDaysAgo.toISOString())
      .count()
      .get();

    // Calculate active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers30dSnapshot = await firestore
      .collection('users')
      .where('lastLoginAt', '>=', thirtyDaysAgo.toISOString())
      .count()
      .get();

    // Calculate total media size (this is a placeholder - would need actual implementation)
    const mediaSize = mediaSnapshot.data().count * 50; // Mock: 50MB average per media

    const stats = {
      totalUsers: usersSnapshot.data().count,
      activeUsers7d: activeUsersSnapshot.data().count,
      activeUsers30d: activeUsers30dSnapshot.data().count,
      totalPrograms: programsSnapshot.data().count,
      totalLessons: lessonsSnapshot.data().count,
      totalMedia: mediaSnapshot.data().count,
      totalMediaSizeMB: mediaSize,
      lastUpdated: new Date().toISOString(),
    };

    // Add cache headers (60 seconds)
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  } catch (error: any) {
    console.error('GET /api/stats error:', error);
    return apiError(error.message || 'Failed to fetch stats', 401);
  }
}
