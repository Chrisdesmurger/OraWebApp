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
    const now = new Date();

    // Define time periods
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all users
    const allUsersSnapshot = await firestore.collection('users').limit(10000).get();

    // Categorize users by engagement
    let dailyActiveUsers = 0;
    let weeklyActiveUsers = 0;
    let monthlyActiveUsers = 0;
    let inactiveUsers = 0;

    allUsersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const lastLogin = data.last_login_at;

      if (!lastLogin) {
        inactiveUsers++;
        return;
      }

      const lastLoginDate = new Date(lastLogin);

      if (lastLoginDate >= oneDayAgo) {
        dailyActiveUsers++;
      } else if (lastLoginDate >= oneWeekAgo) {
        weeklyActiveUsers++;
      } else if (lastLoginDate >= oneMonthAgo) {
        monthlyActiveUsers++;
      } else {
        inactiveUsers++;
      }
    });

    // Prepare data for pie chart
    const engagementData = [
      { name: 'Daily Active', value: dailyActiveUsers },
      { name: 'Weekly Active', value: weeklyActiveUsers },
      { name: 'Monthly Active', value: monthlyActiveUsers },
      { name: 'Inactive', value: inactiveUsers },
    ].filter(item => item.value > 0); // Only include categories with users

    return apiSuccess({
      data: engagementData,
      summary: {
        totalUsers: allUsersSnapshot.size,
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        inactiveUsers,
        engagementRate: allUsersSnapshot.size > 0
          ? Math.round(((dailyActiveUsers + weeklyActiveUsers + monthlyActiveUsers) / allUsersSnapshot.size) * 100)
          : 0,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] GET /api/analytics/engagement error:', error);
    return apiError(errorMessage || 'Failed to fetch engagement data', 500);
  }
}
