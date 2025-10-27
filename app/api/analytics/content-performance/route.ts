import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request);

    // Check permissions
    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const firestore = getFirestore();

    // Fetch programs
    const programsSnapshot = await firestore
      .collection('programs')
      .where('status', '==', 'published')
      .limit(100)  // Limit to top 100 programs
      .get();

    // Count lessons per program
    const programPerformance = await Promise.all(
      programsSnapshot.docs.map(async (doc) => {
        const programData = doc.data();
        const programId = doc.id;

        // Count lessons in this program
        const lessonsSnapshot = await firestore
          .collection('lessons')
          .where('program_id', '==', programId)
          .get();

        const lessonCount = lessonsSnapshot.size;

        // Calculate mock enrollment and completion rates
        // TODO: Replace with real enrollment/completion data when tracking is implemented
        const mockEnrollment = Math.floor(Math.random() * 100) + 10;
        const mockCompletionRate = Math.floor(Math.random() * 40) + 40; // 40-80%

        return {
          id: programId,
          title: programData.title || 'Untitled Program',
          category: programData.category || 'uncategorized',
          lessonCount,
          enrollment: mockEnrollment,
          completionRate: mockCompletionRate,
        };
      })
    );

    // Sort by enrollment (top performers first)
    programPerformance.sort((a, b) => b.enrollment - a.enrollment);

    // Take top 10
    const topPrograms = programPerformance.slice(0, 10);

    return apiSuccess({
      data: topPrograms,
      totalPrograms: programPerformance.length,
      warning: 'Enrollment and completion data is currently simulated. Real tracking coming soon.',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] GET /api/analytics/content-performance error:', error);
    return apiError(errorMessage || 'Failed to fetch content performance data', 500);
  }
}
