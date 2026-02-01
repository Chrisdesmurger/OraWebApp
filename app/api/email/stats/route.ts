/**
 * Email Stats API
 *
 * GET /api/email/stats - Get email delivery statistics
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const firestore = getFirestore();
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get all email logs
    const logsSnapshot = await firestore
      .collection('email_logs')
      .orderBy('sent_at', 'desc')
      .get();

    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalFailed = 0;
    let last7DaysSent = 0;
    let last7DaysDelivered = 0;
    let last7DaysOpened = 0;

    logsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const sentAt = data.sent_at || 0;

      totalSent++;

      switch (data.status) {
        case 'delivered':
          totalDelivered++;
          break;
        case 'opened':
          totalDelivered++;
          totalOpened++;
          break;
        case 'clicked':
          totalDelivered++;
          totalOpened++;
          totalClicked++;
          break;
        case 'failed':
        case 'bounced':
          totalFailed++;
          break;
        case 'sent':
          // Still pending delivery confirmation
          break;
      }

      // Last 7 days stats
      if (sentAt >= sevenDaysAgo) {
        last7DaysSent++;
        if (['delivered', 'opened', 'clicked'].includes(data.status)) {
          last7DaysDelivered++;
        }
        if (['opened', 'clicked'].includes(data.status)) {
          last7DaysOpened++;
        }
      }
    });

    // Calculate rates
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

    const stats = {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalFailed,
      deliveryRate,
      openRate,
      clickRate,
      last7Days: {
        sent: last7DaysSent,
        delivered: last7DaysDelivered,
        opened: last7DaysOpened,
      },
    };

    return apiSuccess({ stats });
  } catch (error: unknown) {
    console.error('[Email Stats] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch email stats';
    return apiError(errorMessage, 500);
  }
}
