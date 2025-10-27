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
    const period = searchParams.get('period') || '30d';

    // Validate period parameter
    const validPeriods = ['7d', '30d', '90d', '1y'];
    if (!validPeriods.includes(period)) {
      return apiError('Invalid period parameter. Must be one of: 7d, 30d, 90d, 1y', 400);
    }

    // Calculate date range
    const now = new Date();
    let daysBack = 30;

    if (period === '7d') daysBack = 7;
    else if (period === '30d') daysBack = 30;
    else if (period === '90d') daysBack = 90;
    else if (period === '1y') daysBack = 365;

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch users from Firestore
    const firestore = getFirestore();
    const usersSnapshot = await firestore
      .collection('users')
      .where('created_at', '>=', startDate.toISOString())
      .orderBy('created_at', 'asc')
      .limit(10000)  // Prevent performance issues with large datasets
      .get();

    // Group users by day
    const usersByDay = new Map<string, {
      totalUsers: number;
      newUsers: number;
      activeUsers: number;
    }>();

    // Initialize all days in range
    for (let i = 0; i <= daysBack; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      usersByDay.set(dateKey, {
        totalUsers: 0,
        newUsers: 0,
        activeUsers: 0,
      });
    }

    // Count new users per day
    let runningTotal = 0;
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt = new Date(data.created_at);
      const dateKey = createdAt.toISOString().split('T')[0];

      if (usersByDay.has(dateKey)) {
        const dayData = usersByDay.get(dateKey)!;
        dayData.newUsers += 1;
        runningTotal += 1;
        dayData.totalUsers = runningTotal;
      }
    });

    // Calculate active users (last 7 days activity)
    const activeUsersSnapshot = await firestore
      .collection('users')
      .where('last_login_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .get();

    const activeCount = activeUsersSnapshot.size;

    // Update active users for recent days
    const recentDays = Array.from(usersByDay.keys()).slice(-7);
    recentDays.forEach(dateKey => {
      const dayData = usersByDay.get(dateKey)!;
      dayData.activeUsers = activeCount;
    });

    // Convert to array format for chart
    const chartData = Array.from(usersByDay.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    return apiSuccess({
      data: chartData,
      period,
      totalUsers: runningTotal,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] GET /api/analytics/user-growth error:', error);
    return apiError(errorMessage || 'Failed to fetch user growth data', 500);
  }
}
