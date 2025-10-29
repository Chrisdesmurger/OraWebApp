/**
 * API routes for audit logs
 *
 * GET /api/audit-logs - Query audit logs with filters (admin only)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
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

    // Build Firestore query
    const firestore = getFirestore();
    let query = firestore.collection('audit_logs').orderBy('timestamp', 'desc');

    // Apply filters
    if (resourceType) {
      query = query.where('resource_type', '==', resourceType);
    }

    if (action) {
      query = query.where('action', '==', action);
    }

    if (actorId) {
      query = query.where('actor_id', '==', actorId);
    }

    if (resourceId) {
      query = query.where('resource_id', '==', resourceId);
    }

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    // Apply pagination
    if (startAfterParam) {
      const startAfterDoc = await firestore.collection('audit_logs').doc(startAfterParam).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
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

    const snapshot = await query.get();

    // Check if there are more results
    const hasMore = snapshot.size > limit;

    // Get only the requested number of documents
    const docs = snapshot.docs.slice(0, limit);

    // Map to client-side objects
    const logs = docs.map((doc) => {
      const data = doc.data() as AuditLogDocument;
      return mapAuditLogFromFirestore(doc.id, data);
    });

    // Get last document ID for pagination
    const lastDocId = docs.length > 0 ? docs[docs.length - 1].id : undefined;

    const response: GetAuditLogsResponse = {
      logs,
      hasMore,
      lastDocId,
    };

    console.log('[GET /api/audit-logs] Returning', logs.length, 'logs, hasMore:', hasMore);
    return apiSuccess(response);
  } catch (error: any) {
    console.error('GET /api/audit-logs error:', error);
    return apiError(error.message || 'Failed to fetch audit logs', 500);
  }
}
