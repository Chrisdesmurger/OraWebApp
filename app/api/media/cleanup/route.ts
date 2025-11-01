import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { deleteMultipleFiles } from '@/lib/firebase/storage-utils';
import { logAuditEvent } from '@/lib/audit/logger';
import type { CleanupRequest, CleanupResponse } from '@/types/media';

/**
 * POST /api/media/cleanup - Bulk delete orphaned files
 *
 * Request body:
 * - filePaths: string[] (array of storage paths to delete)
 *
 * Returns:
 * - deletedCount: number
 * - errors: Array<{ path: string; error: string }>
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions. Admin role required.', 403);
    }

    const body = await request.json();

    // Validate request body
    if (!body.filePaths || !Array.isArray(body.filePaths)) {
      return apiError('Invalid request body. Expected { filePaths: string[] }', 400);
    }

    const { filePaths } = body as CleanupRequest;

    if (filePaths.length === 0) {
      return apiError('filePaths array cannot be empty', 400);
    }

    if (filePaths.length > 100) {
      return apiError('Cannot delete more than 100 files at once', 400);
    }

    // Validate all paths are strings
    if (!filePaths.every((path) => typeof path === 'string')) {
      return apiError('All filePaths must be strings', 400);
    }

    console.log('[POST /api/media/cleanup] Attempting to delete', filePaths.length, 'files');

    // Delete files from storage
    const { deletedCount, errors } = await deleteMultipleFiles(filePaths);

    console.log('[POST /api/media/cleanup] Deleted', deletedCount, 'files with', errors.length, 'errors');

    // Log audit event for cleanup operation
    // Note: We log this as a single bulk operation rather than individual deletes
    await logAuditEvent({
      action: 'delete',
      resourceType: 'lesson', // Using 'lesson' as closest match since 'media' not in ResourceType
      resourceId: 'bulk-cleanup',
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      changesBefore: {
        operation: 'bulk_media_cleanup',
        filePaths,
        totalFiles: filePaths.length,
      },
      changesAfter: {
        deletedCount,
        errors,
      },
      request,
    });

    const response: CleanupResponse = {
      deletedCount,
      errors,
    };

    return apiSuccess(response);
  } catch (error: any) {
    console.error('POST /api/media/cleanup error:', error);
    return apiError(error.message || 'Failed to cleanup media files', 500);
  }
}
