import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { deleteSingleFile, getAllRelatedFilePaths } from '@/lib/firebase/storage-utils';
import { getFirestore } from '@/lib/firebase/admin';
import { logDelete } from '@/lib/audit/logger';

/**
 * DELETE /api/media/[id] - Delete a media file and all its renditions
 *
 * URL parameters:
 * - id: File path in storage (URL-encoded)
 *
 * Example: DELETE /api/media/media%2Flessons%2Flessonid%2Foriginal%2Ffile.mp4
 *
 * This will delete:
 * - The original file
 * - All video renditions (high, medium, low)
 * - All audio variants (high, medium, low)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions. Admin role required.', 403);
    }

    const { id } = await params;

    if (!id) {
      return apiError('File path (id) is required', 400);
    }

    // Decode URL-encoded path
    const filePath = decodeURIComponent(id);

    console.log('[DELETE /api/media/[id]] Deleting file and all renditions:', filePath);

    // Validate path starts with 'media/'
    if (!filePath.startsWith('media/')) {
      return apiError('Invalid file path. Must start with "media/"', 400);
    }

    const firestore = getFirestore();

    // Get ALL related file paths (original + renditions)
    const allPaths = await getAllRelatedFilePaths(firestore, filePath);

    console.log('[DELETE /api/media/[id]] Deleting', allPaths.length, 'files:', allPaths);

    // Delete all files
    const deletedPaths: string[] = [];
    const errors: Array<{ path: string; error: string }> = [];

    for (const path of allPaths) {
      try {
        await deleteSingleFile(path);
        deletedPaths.push(path);
      } catch (error: any) {
        console.error('[DELETE /api/media/[id]] Failed to delete:', path, error);
        errors.push({ path, error: error.message });
      }
    }

    console.log('[DELETE /api/media/[id]] Successfully deleted', deletedPaths.length, 'files');

    // Log audit event
    await logDelete({
      resourceType: 'lesson',
      resourceId: filePath,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: {
        originalPath: filePath,
        deletedPaths,
        deletedAt: new Date().toISOString(),
        deletedCount: deletedPaths.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      request,
    });

    return apiSuccess({
      message: `Successfully deleted ${deletedPaths.length} file(s)`,
      deletedPaths,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('DELETE /api/media/[id] error:', error);
    return apiError(error.message || 'Failed to delete media file', 500);
  }
}
