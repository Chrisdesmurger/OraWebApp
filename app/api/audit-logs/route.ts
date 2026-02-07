/**
 * API routes for audit logs
 *
 * GET /api/audit-logs - Query audit logs with filters (admin only)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { AuditLogDocument, GetAuditLogsResponse } from '@/types/audit';
import { mapAuditLogFromFirestore, isAuditAction, isResourceType } from '@/types/audit';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/audit-logs - Query audit logs with filters
 *
 * Query parameters:
 * - resourceType?: 'user' | 'program' | 'lesson'
 * - action?: 'create' | 'update' | 'delete' | 'role_change' | 'status_change'
 * - actorId?: string (UID of user who performed action)
 * - resourceId?: string (ID of affected resource)
 * - startDate?: string (ISO timestamp, inclusive)
 * - endDate?: string (ISO timestamp, inclusive)
 * - limit?: number (default: 50, max: 200)
 * - startAfter?: string (document ID for pagination)
 *
 * Response:
 * {
 *   logs: AuditLog[],
 *   hasMore: boolean,
 *   lastDocId?: string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    // Only admins can view audit logs
    if (!requireRole(user, ['admin'])) {
      return apiError('Only admins can access audit logs', 403);
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const resourceType = searchParams.get('resourceType');
    const action = searchParams.get('action');
    const actorId = searchParams.get('actorId');
    const resourceId = searchParams.get('resourceId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limitParam = searchParams.get('limit');
    const startAfterParam = searchParams.get('startAfter');

    // Validate enum parameters
    if (resourceType && !isResourceType(resourceType)) {
      return apiError(`Invalid resourceType. Must be: user, program, or lesson`, 400);
    }

    if (action && !isAuditAction(action)) {
      return apiError(`Invalid action. Must be: create, update, delete, role_change, or status_change`, 400);
    }

    // Parse limit
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), MAX_LIMIT) : DEFAULT_LIMIT;

    if (isNaN(limit) || limit < 1) {
      return apiError('Invalid limit parameter', 400);
    }

    // Build Supabase query
    const supabase = createSupabaseServiceClient();
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (actorId) {
      query = query.eq('actor_id', actorId);
    }

    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply cursor-based pagination
    if (startAfterParam) {
      const { data: cursor } = await supabase
        .from('audit_logs')
        .select('created_at')
        .eq('id', startAfterParam)
        .single();

      if (cursor) {
        query = query.lt('created_at', cursor.created_at);
      }
    }

    // Fetch limit + 1 to check if there are more results
    query = query.limit(limit + 1);

    console.log('[GET /api/audit-logs] Fetching audit logs with filters:', {
      resourceType,
      action,
      actorId,
      resourceId,
      startDate,
      endDate,
      limit,
    });

    const { data: rows, error } = await query;

    if (error) throw error;

    const allRows = rows ?? [];

    // Check if there are more results
    const hasMore = allRows.length > limit;

    // Get only the requested number of rows
    const limitedRows = allRows.slice(0, limit);

    // Map to client-side objects using the existing mapper
    // The mapper expects AuditLogDocument with `timestamp` field,
    // but Supabase returns `created_at`. We adapt the row to match.
    const logs = limitedRows.map((row) => {
      const doc: AuditLogDocument = {
        action: row.action,
        resource_type: row.resource_type,
        resource_id: row.resource_id,
        actor_id: row.actor_id,
        actor_email: row.actor_email,
        changes: row.changes ?? {},
        ip_address: row.ip_address ?? '',
        user_agent: row.user_agent ?? '',
        timestamp: row.created_at, // Map created_at to timestamp for the mapper
      };
      return mapAuditLogFromFirestore(row.id, doc);
    });

    // Get last document ID for pagination
    const lastDocId = limitedRows.length > 0 ? limitedRows[limitedRows.length - 1].id : undefined;

    const response: GetAuditLogsResponse = {
      logs,
      hasMore,
      lastDocId,
    };

    console.log('[GET /api/audit-logs] Returning', logs.length, 'logs, hasMore:', hasMore);
    return apiSuccess(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/audit-logs error:', error);
    return apiError(errorMessage || 'Failed to fetch audit logs', 500);
  }
}
