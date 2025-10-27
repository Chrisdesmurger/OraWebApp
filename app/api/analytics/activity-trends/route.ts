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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '7d';

    // Validate period parameter
    const validPeriods = ['7d', '30d', '90d'];
    if (!validPeriods.includes(period)) {
      return apiError('Invalid period parameter. Must be one of: 7d, 30d, 90d', 400);
    }

    // Calculate date range
    const now = new Date();
    let daysBack = 7;

    if (period === '7d') daysBack = 7;
    else if (period === '30d') daysBack = 30;
    else if (period === '90d') daysBack = 90;

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    // Initialize activity data by day
    const activityByDay = new Map<string, {
      sessions: number;
      completions: number;
      avgDuration: number;
    }>();

    for (let i = 0; i <= daysBack; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      activityByDay.set(dateKey, {
        sessions: 0,
        completions: 0,
        avgDuration: 0,
      });
    }

    // Since we don't have session data yet, generate mock data based on user activity
    // TODO: Replace with real session/activity data when tracking is implemented
    const firestore = getFirestore();
    const activeUsersSnapshot = await firestore
      .collection('users')
      .where('last_login_at', '>=', startDate.toISOString())
      .limit(5000)  // Prevent performance issues
      .get();

    // Distribute active users across days (mock distribution)
    activeUsersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const lastLogin = data.last_login_at;
      if (lastLogin) {
        const loginDate = new Date(lastLogin);
        const dateKey = loginDate.toISOString().split('T')[0];

        if (activityByDay.has(dateKey)) {
          const dayData = activityByDay.get(dateKey)!;
          dayData.sessions += 1;
          // Mock completion rate (70% of sessions result in completion)
          dayData.completions += Math.random() > 0.3 ? 1 : 0;
          // Mock average duration (15-45 minutes)
          dayData.avgDuration = Math.floor(Math.random() * 30) + 15;
        }
      }
    });

    // Convert to array format for chart
    const chartData = Array.from(activityByDay.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    return apiSuccess({
      data: chartData,
      period,
      warning: 'Activity data is currently estimated based on login activity. Real session tracking coming soon.',
      totalSessions: chartData.reduce((sum, day) => sum + day.sessions, 0),
      totalCompletions: chartData.reduce((sum, day) => sum + day.completions, 0),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] GET /api/analytics/activity-trends error:', error);
    return apiError(errorMessage || 'Failed to fetch activity trends data', 500);
  }
}
