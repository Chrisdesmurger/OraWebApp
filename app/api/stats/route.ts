import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

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

    const supabase = createSupabaseServiceClient();

    // Fetch counts in parallel
    const [usersResult, programsResult, contentResult] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('programs').select('*', { count: 'exact', head: true }),
      supabase.from('lessons').select('*', { count: 'exact', head: true }),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (programsResult.error) throw programsResult.error;
    if (contentResult.error) throw contentResult.error;

    // Calculate active users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUsers7dResult = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', sevenDaysAgo.toISOString());

    if (activeUsers7dResult.error) throw activeUsers7dResult.error;

    // Calculate active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers30dResult = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', thirtyDaysAgo.toISOString());

    if (activeUsers30dResult.error) throw activeUsers30dResult.error;

    const stats = {
      totalUsers: usersResult.count ?? 0,
      activeUsers7d: activeUsers7dResult.count ?? 0,
      activeUsers30d: activeUsers30dResult.count ?? 0,
      totalPrograms: programsResult.count ?? 0,
      totalLessons: contentResult.count ?? 0,
      totalMedia: contentResult.count ?? 0,
      totalMediaSizeMB: (contentResult.count ?? 0) * 50, // Mock: 50MB average per content
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/stats error:', error);
    return apiError(errorMessage || 'Failed to fetch stats', 401);
  }
}
