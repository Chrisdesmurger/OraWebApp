/**
 * Admin Commands Execution API
 * POST /api/admin/commands/execute
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-role';
import { getFirestore } from '@/lib/firebase/admin';
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

    // Log command execution to Firestore
    const db = getFirestore();
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

    const logRef = await db.collection('commandLogs').add(logData);
    console.log(`Command log saved: ${logRef.id}`);

    // Return result
    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      metadata: result.metadata,
      logId: logRef.id,
      duration,
    });
  } catch (error: any) {
    console.error('Command execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Command execution failed',
      },
      { status: 500 }
    );
  }
}
