import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import {
  listStorageFiles,
  getReferencedFilePaths,
  findLessonsUsingFile,
  convertToMediaFile,
  filterMediaFiles,
  paginateMediaFiles,
} from '@/lib/firebase/storage-utils';
import type { GetMediaQuery, GetMediaResponse, MediaFile } from '@/types/media';
import { isMediaType } from '@/types/media';

/**
 * GET /api/media - List all media files in storage
 *
 * Query parameters:
 * - type?: 'image' | 'video' | 'audio'
 * - startDate?: ISO timestamp
 * - endDate?: ISO timestamp
 * - lessonId?: string (filter by lesson usage)
 * - orphaned?: boolean (only orphaned files)
 * - limit?: number (default: 50)
 * - startAfter?: string (cursor for pagination)
 *
 * Returns:
 * - files: Array of MediaFile objects
 * - hasMore: boolean
 * - nextCursor?: string
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions. Admin role required.', 403);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query: GetMediaQuery = {
      type: searchParams.get('type') as any,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      lessonId: searchParams.get('lessonId') || undefined,
      orphaned: searchParams.get('orphaned') === 'true' ? true : searchParams.get('orphaned') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      startAfter: searchParams.get('startAfter') || undefined,
    };

    // Validate type parameter
    if (query.type && !isMediaType(query.type)) {
      return apiError(`Invalid type parameter. Must be 'image', 'video', or 'audio'.`, 400);
    }

    // Validate limit
    if (query.limit && (query.limit < 1 || query.limit > 200)) {
      return apiError('Limit must be between 1 and 200', 400);
    }

    console.log('[GET /api/media] Query params:', query);

    const firestore = getFirestore();

    // Step 1: List all files in storage (filter by media/ prefix)
    const storageFiles = await listStorageFiles('media/');

    // Step 2: Get all referenced file paths from lessons
    const referencedPaths = await getReferencedFilePaths(firestore);

    // Step 3: Convert storage files to MediaFile objects
    const mediaFiles: MediaFile[] = [];

    for (const fileMetadata of storageFiles) {
      const filePath = fileMetadata.name;

      // Find which lessons use this file
      const usedInLessons = await findLessonsUsingFile(firestore, filePath);

      // Convert to MediaFile object
      const mediaFile = await convertToMediaFile(fileMetadata, referencedPaths, usedInLessons);

      if (mediaFile) {
        mediaFiles.push(mediaFile);
      }
    }

    console.log('[GET /api/media] Total media files:', mediaFiles.length);

    // Step 4: Apply filters
    const filteredFiles = filterMediaFiles(mediaFiles, query);

    console.log('[GET /api/media] After filters:', filteredFiles.length);

    // Step 5: Sort by uploadedAt (newest first)
    filteredFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    // Step 6: Apply pagination
    const { files, hasMore, nextCursor } = paginateMediaFiles(
      filteredFiles,
      query.limit || 50,
      query.startAfter
    );

    console.log('[GET /api/media] Returning', files.length, 'files, hasMore:', hasMore);

    const response: GetMediaResponse = {
      files,
      hasMore,
      nextCursor,
    };

    return apiSuccess(response);
  } catch (error: any) {
    console.error('GET /api/media error:', error);
    return apiError(error.message || 'Failed to fetch media files', 500);
  }
}
