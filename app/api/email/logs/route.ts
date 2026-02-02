/**
 * Email Logs API
 *
 * GET /api/email/logs - Get email delivery logs
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { mapEmailLogFromFirestore } from '@/types/email';
import type { EmailLogDocument } from '@/types/email';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const emailType = searchParams.get('emailType');
    const status = searchParams.get('status');
    const recipientEmail = searchParams.get('recipientEmail');

    const firestore = getFirestore();
    let query = firestore
      .collection('email_logs')
      .orderBy('sent_at', 'desc');

    // Apply filters
    if (emailType) {
      query = query.where('email_type', '==', emailType);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    if (recipientEmail) {
      query = query.where('recipient_email', '==', recipientEmail);
    }

    // Apply pagination
    if (offset > 0) {
      const offsetSnapshot = await firestore
        .collection('email_logs')
        .orderBy('sent_at', 'desc')
        .limit(offset)
        .get();

      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.limit(limit).get();

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data() as EmailLogDocument;
      return mapEmailLogFromFirestore(doc.id, data);
    });

    // Get total count for pagination
    const countSnapshot = await firestore.collection('email_logs').count().get();
    const total = countSnapshot.data().count;

    return apiSuccess({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error: unknown) {
    console.error('[Email Logs] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch email logs';
    return apiError(errorMessage, 500);
  }
}
