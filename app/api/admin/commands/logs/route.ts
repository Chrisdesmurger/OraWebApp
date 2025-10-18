/**
 * Admin Commands Logs API
 * GET /api/admin/commands/logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-role';
import { getFirestore } from '@/lib/firebase/admin';
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

    // Fetch logs from Firestore
    const db = getFirestore();
    let query = db
      .collection('commandLogs')
      .orderBy('startedAt', 'desc')
      .limit(limit);

    if (commandName) {
      query = query.where('commandName', '==', commandName) as any;
    }

    const snapshot = await query.get();

    const logs: CommandLog[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CommandLog[];

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch command logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch logs',
      },
      { status: 500 }
    );
  }
}
