/**
 * Admin Commands Execution API
 * POST /api/admin/commands/execute
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-role';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { CommandName, CommandResult, CommandLog } from '@/lib/types/commands';
import { seedFakeUsers } from '@/scripts/seed-fake-users';
import { purgeFakeUsers } from '@/scripts/purge-fake-users';
import { seedSampleContent } from '@/scripts/seed-sample-content';
import { wipeDemoData } from '@/scripts/wipe-demo-data';

/**
 * Execute an admin command
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const user = await requireAdmin();

    // Parse request body
    const body = await request.json();
    const { commandName } = body as { commandName: CommandName };

    if (!commandName) {
      return NextResponse.json(
        { success: false, error: 'Command name is required' },
        { status: 400 }
      );
    }

    console.log(`Executing command: ${commandName} by ${user.email}`);

    // Execute command
    const startTime = Date.now();
    let result: CommandResult;

    switch (commandName) {
      case 'seedFakeUsers':
        result = await seedFakeUsers();
        break;

      case 'purgeFakeUsers':
        result = await purgeFakeUsers();
        break;

      case 'seedSampleContent':
        result = await seedSampleContent();
        break;

      case 'wipeDemoData':
        result = await wipeDemoData();
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid command name' },
          { status: 400 }
        );
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log command execution to Supabase
    const supabase = createSupabaseServiceClient();
    const logData: Omit<CommandLog, 'id'> = {
      commandName,
      status: result.success ? 'success' : 'error',
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date(endTime).toISOString(),
      executedBy: {
        uid: user.uid,
        email: user.email || 'unknown',
      },
      output: result.output,
      error: result.error,
      duration,
      metadata: result.metadata,
    };

    const { data: logRow, error: logError } = await supabase
      .from('command_logs')
      .insert({
        command_name: logData.commandName,
        status: logData.status,
        started_at: logData.startedAt,
        completed_at: logData.completedAt,
        executed_by: logData.executedBy,
        output: logData.output,
        error: logData.error,
        duration_ms: logData.duration,
        metadata: logData.metadata,
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Failed to save command log:', logError);
    } else {
      console.log(`Command log saved: ${logRow?.id}`);
    }

    // Return result
    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      metadata: result.metadata,
      logId: logRow?.id,
      duration,
    });
  } catch (error: unknown) {
    console.error('Command execution error:', error);
    const message = error instanceof Error ? error.message : 'Command execution failed';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
