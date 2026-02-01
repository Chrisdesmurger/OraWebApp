/**
 * Email Stats API
 *
 * GET /api/email/stats - Get email delivery statistics
 * Supports query params:
 * - period: '7d' | '30d' | '90d' | 'all' (default: '30d')
 * - breakdown: 'daily' | 'weekly' | 'monthly' (default: 'daily')
 * - type: filter by email type
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';

interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const breakdown = searchParams.get('breakdown') || 'daily';
    const emailType = searchParams.get('type');

    const firestore = getFirestore();
    const now = Date.now();

    // Calculate time range
    const periodMs: Record<string, number> = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      all: now, // All time
    };
    const startTime = now - (periodMs[period] || periodMs['30d']);

    // Build query
    let query = firestore
      .collection('email_logs')
      .orderBy('sent_at', 'desc');

    if (period !== 'all') {
      query = query.where('sent_at', '>=', startTime);
    }

    const logsSnapshot = await query.get();

    // Initialize counters
    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalFailed = 0;
    let totalBounced = 0;

    // Stats by email type
    const statsByType: Record<string, { sent: number; delivered: number; opened: number }> = {};

    // Time series data
    const dailyStatsMap: Map<string, DailyStats> = new Map();

    logsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const sentAt = data.sent_at || 0;
      const type = data.email_type || 'unknown';

      // Filter by type if specified
      if (emailType && type !== emailType) {
        return;
      }

      totalSent++;

      // Initialize type stats
      if (!statsByType[type]) {
        statsByType[type] = { sent: 0, delivered: 0, opened: 0 };
      }
      statsByType[type].sent++;

      // Get date key for time series
      const dateKey = new Date(sentAt).toISOString().split('T')[0];
      if (!dailyStatsMap.has(dateKey)) {
        dailyStatsMap.set(dateKey, {
          date: dateKey,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
        });
      }
      const dayStats = dailyStatsMap.get(dateKey)!;
      dayStats.sent++;

      // Count by status
      switch (data.status) {
        case 'delivered':
          totalDelivered++;
          statsByType[type].delivered++;
          dayStats.delivered++;
          break;
        case 'opened':
          totalDelivered++;
          totalOpened++;
          statsByType[type].delivered++;
          statsByType[type].opened++;
          dayStats.delivered++;
          dayStats.opened++;
          break;
        case 'clicked':
          totalDelivered++;
          totalOpened++;
          totalClicked++;
          statsByType[type].delivered++;
          statsByType[type].opened++;
          dayStats.delivered++;
          dayStats.opened++;
          dayStats.clicked++;
          break;
        case 'failed':
          totalFailed++;
          break;
        case 'bounced':
          totalBounced++;
          dayStats.bounced++;
          break;
        case 'sent':
          // Still pending delivery confirmation
          break;
      }
    });

    // Calculate rates
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 1000) / 10 : 0;
    const openRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 1000) / 10 : 0;
    const clickRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 1000) / 10 : 0;
    const bounceRate = totalSent > 0 ? Math.round((totalBounced / totalSent) * 1000) / 10 : 0;

    // Convert time series to array and sort
    const timeSeries = Array.from(dailyStatsMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Aggregate if needed
    let aggregatedTimeSeries = timeSeries;
    if (breakdown === 'weekly') {
      aggregatedTimeSeries = aggregateByWeek(timeSeries);
    } else if (breakdown === 'monthly') {
      aggregatedTimeSeries = aggregateByMonth(timeSeries);
    }

    const stats = {
      summary: {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalFailed,
        totalBounced,
        deliveryRate,
        openRate,
        clickRate,
        bounceRate,
      },
      byType: statsByType,
      timeSeries: aggregatedTimeSeries,
      period,
      breakdown,
    };

    return apiSuccess({ stats });
  } catch (error: unknown) {
    console.error('[Email Stats] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch email stats';
    return apiError(errorMessage, 500);
  }
}

/**
 * Aggregate daily stats by week
 */
function aggregateByWeek(dailyStats: DailyStats[]): DailyStats[] {
  const weeklyMap = new Map<string, DailyStats>();

  dailyStats.forEach((day) => {
    const date = new Date(day.date);
    // Get Monday of the week
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const weekKey = monday.toISOString().split('T')[0];

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, {
        date: weekKey,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
      });
    }

    const week = weeklyMap.get(weekKey)!;
    week.sent += day.sent;
    week.delivered += day.delivered;
    week.opened += day.opened;
    week.clicked += day.clicked;
    week.bounced += day.bounced;
  });

  return Array.from(weeklyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Aggregate daily stats by month
 */
function aggregateByMonth(dailyStats: DailyStats[]): DailyStats[] {
  const monthlyMap = new Map<string, DailyStats>();

  dailyStats.forEach((day) => {
    const monthKey = day.date.substring(0, 7) + '-01'; // YYYY-MM-01

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        date: monthKey,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
      });
    }

    const month = monthlyMap.get(monthKey)!;
    month.sent += day.sent;
    month.delivered += day.delivered;
    month.opened += day.opened;
    month.clicked += day.clicked;
    month.bounced += day.bounced;
  });

  return Array.from(monthlyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
