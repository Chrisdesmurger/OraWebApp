import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request);

    // Check permissions
    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const supabase = createSupabaseServiceClient();

    // Fetch published programs
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('id, title, category, lessons')
      .eq('status', 'published')
      .limit(100);

    if (programsError) throw programsError;

    // Count lessons per program using the lessons UUID[] column
    const programPerformance = (programs ?? []).map((program) => {
      const lessonCount = Array.isArray(program.lessons) ? program.lessons.length : 0;

      // Calculate mock enrollment and completion rates
      // TODO: Replace with real enrollment/completion data when tracking is implemented
      const mockEnrollment = Math.floor(Math.random() * 100) + 10;
      const mockCompletionRate = Math.floor(Math.random() * 40) + 40; // 40-80%

      return {
        id: program.id,
        title: program.title || 'Untitled Program',
        category: program.category || 'uncategorized',
        lessonCount,
        enrollment: mockEnrollment,
        completionRate: mockCompletionRate,
      };
    });

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
