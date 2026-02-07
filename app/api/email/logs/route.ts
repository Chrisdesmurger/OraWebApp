/**
 * Email Logs API
 *
 * GET /api/email/logs - Get email delivery logs
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
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

    const supabase = createSupabaseServiceClient();

    let query = supabase
      .from('email_logs')
      .select('*', { count: 'exact' })
      .order('sent_at', { ascending: false });

    // Apply filters
    if (emailType) {
      query = query.eq('email_type', emailType);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (recipientEmail) {
      query = query.eq('recipient_email', recipientEmail);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: rows, error, count: total } = await query;

    if (error) {
      console.error('[Email Logs] Supabase error:', error);
      return apiError('Failed to fetch email logs', 500);
    }

    const logs = (rows || []).map((row) => {
      return mapEmailLogFromFirestore(row.id, row as unknown as EmailLogDocument);
    });

    return apiSuccess({
      logs,
      pagination: {
        total: total || 0,
        limit,
        offset,
        hasMore: offset + logs.length < (total || 0),
      },
    });
  } catch (error: unknown) {
    console.error('[Email Logs] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch email logs';
    return apiError(errorMessage, 500);
  }
}
