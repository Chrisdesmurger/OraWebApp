/**
 * Email Logs Export API
 *
 * GET /api/email/logs/export - Export email logs as CSV
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - status: filter by status (optional)
 * - type: filter by email type (optional)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

interface EmailLogData {
  email_type: string;
  recipient_email: string;
  recipient_uid: string;
  language: string;
  status: string;
  sent_at: number;
  delivered_at?: number;
  opened_at?: number;
  clicked_at?: number;
  bounced_at?: number;
  error_message?: string;
  resend_id?: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const emailType = searchParams.get('type');

    const supabase = createSupabaseServiceClient();

    // Build query
    let query = supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false });

    // Apply date filters
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      query = query.gte('sent_at', startTimestamp);
    }

    if (endDate) {
      const endTimestamp = new Date(endDate).getTime() + 24 * 60 * 60 * 1000; // Include full day
      query = query.lte('sent_at', endTimestamp);
    }

    // Apply additional filters
    if (status) {
      query = query.eq('status', status);
    }

    if (emailType) {
      query = query.eq('email_type', emailType);
    }

    // Limit to prevent memory issues
    query = query.limit(10000);

    const { data: rows, error } = await query;

    if (error) {
      console.error('[Email Logs Export] Supabase error:', error);
      return apiError('Failed to export email logs', 500);
    }

    const logs = (rows || []).map((row) => ({
      id: row.id,
      ...row as unknown as EmailLogData,
    }));

    // Generate CSV
    const csv = generateCSV(logs);

    // Create filename with date range
    const now = new Date().toISOString().split('T')[0];
    const filename = `email-logs-${now}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('[Email Logs Export] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to export email logs';
    return apiError(errorMessage, 500);
  }
}

/**
 * Generate CSV from logs data
 */
function generateCSV(logs: Array<{ id: string } & EmailLogData>): string {
  const headers = [
    'ID',
    'Email Type',
    'Recipient Email',
    'Recipient UID',
    'Language',
    'Status',
    'Sent At',
    'Delivered At',
    'Opened At',
    'Clicked At',
    'Bounced At',
    'Error Message',
    'Resend ID',
  ];

  const rows = logs.map((log) => [
    log.id,
    log.email_type || '',
    log.recipient_email || '',
    log.recipient_uid || '',
    log.language || '',
    log.status || '',
    formatTimestamp(log.sent_at),
    formatTimestamp(log.delivered_at),
    formatTimestamp(log.opened_at),
    formatTimestamp(log.clicked_at),
    formatTimestamp(log.bounced_at),
    escapeCSV(log.error_message || ''),
    log.resend_id || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  // Add BOM for Excel compatibility with UTF-8
  return '\uFEFF' + csvContent;
}

/**
 * Format timestamp to ISO string
 */
function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toISOString();
}

/**
 * Escape CSV field
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  // If value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
