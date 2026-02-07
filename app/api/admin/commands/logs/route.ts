/**
 * Admin Commands Logs API
 * GET /api/admin/commands/logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-role';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { CommandLog } from '@/lib/types/commands';

/**
 * Get command execution logs
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    await requireAdmin();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const commandName = searchParams.get('commandName');

    // Fetch logs from Supabase
    const supabase = createSupabaseServiceClient();

    let query = supabase
      .from('command_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (commandName) {
      query = query.eq('command_name', commandName);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('Failed to fetch command logs:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch logs' },
        { status: 500 }
      );
    }

    // Map rows to CommandLog format for frontend compatibility
    const logs: CommandLog[] = (rows || []).map((row) => ({
      id: row.id,
      commandName: row.command_name,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      executedBy: row.executed_by,
      output: row.output,
      error: row.error,
      duration: row.duration_ms,
      metadata: row.metadata,
    }));

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch command logs:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch logs';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
