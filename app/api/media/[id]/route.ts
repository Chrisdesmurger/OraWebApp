import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { deleteSingleFile } from '@/lib/firebase/storage-utils';
import { logDelete } from '@/lib/audit/logger';

/**
 * DELETE /api/media/[id] - Delete a single media file
 *
 * URL parameters:
 * - id: File path in storage (URL-encoded)
 *
 * Example: DELETE /api/media/media%2Flessons%2Flessonid%2Foriginal%2Ffile.mp4
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

    console.log('[DELETE /api/media/[id]] Deleting file:', filePath);

    // Validate path starts with 'media/'
    if (!filePath.startsWith('media/')) {
      return apiError('Invalid file path. Must start with "media/"', 400);
    }

    // Delete the file from storage
    await deleteSingleFile(filePath);

    console.log('[DELETE /api/media/[id]] Successfully deleted:', filePath);

    // Log audit event
    await logDelete({
      resourceType: 'lesson', // Using 'lesson' as closest match
      resourceId: filePath,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: {
        filePath,
        deletedAt: new Date().toISOString(),
      },
      request,
    });

    return apiSuccess({
      message: 'File deleted successfully',
      filePath,
    });
  } catch (error: any) {
    console.error('DELETE /api/media/[id] error:', error);
    return apiError(error.message || 'Failed to delete media file', 500);
  }
}
