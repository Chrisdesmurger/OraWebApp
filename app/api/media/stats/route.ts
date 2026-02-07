import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import {
  listStorageFiles,
  getReferencedFilePaths,
  convertToMediaFile,
} from '@/lib/supabase/storage-utils';
import type { MediaStats, MediaFile } from '@/types/media';
import { formatBytes } from '@/types/media';

/**
 * GET /api/media/stats - Get storage usage statistics
 *
 * Returns:
 * - totalFiles: number
 * - totalSizeBytes: number
 * - totalSizeFormatted: string
 * - byType: { images, videos, audio } with count and size
 * - orphanedFiles: { count, sizeBytes, sizeFormatted }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions. Admin role required.', 403);
    }

    console.log('[GET /api/media/stats] Calculating storage statistics...');

    const supabase = createSupabaseServiceClient();

    // Step 1: List all files in storage
    const storageFiles = await listStorageFiles('media/');

    // Step 2: Get all referenced file paths from lessons
    const referencedPaths = await getReferencedFilePaths(supabase);

    // Step 3: Convert storage files to MediaFile objects
    const mediaFiles: MediaFile[] = [];

    for (const fileMetadata of storageFiles) {
      const mediaFile = await convertToMediaFile(fileMetadata, referencedPaths, supabase);

      if (mediaFile) {
        mediaFiles.push(mediaFile);
      }
    }

    console.log('[GET /api/media/stats] Analyzing', mediaFiles.length, 'media files');

    // Step 4: Calculate statistics
    let totalFiles = 0;
    let totalSizeBytes = 0;

    const byType = {
      images: { count: 0, sizeBytes: 0, sizeFormatted: '0 Bytes' },
      videos: { count: 0, sizeBytes: 0, sizeFormatted: '0 Bytes' },
      audio: { count: 0, sizeBytes: 0, sizeFormatted: '0 Bytes' },
    };

    const orphanedFiles = {
      count: 0,
      sizeBytes: 0,
      sizeFormatted: '0 Bytes',
    };

    for (const file of mediaFiles) {
      totalFiles++;
      totalSizeBytes += file.size;

      // Count by type
      if (file.type === 'image') {
        byType.images.count++;
        byType.images.sizeBytes += file.size;
      } else if (file.type === 'video') {
        byType.videos.count++;
        byType.videos.sizeBytes += file.size;
      } else if (file.type === 'audio') {
        byType.audio.count++;
        byType.audio.sizeBytes += file.size;
      }

      // Count orphaned files
      if (file.isOrphaned) {
        orphanedFiles.count++;
        orphanedFiles.sizeBytes += file.size;
      }
    }

    // Format sizes
    const totalSizeFormatted = formatBytes(totalSizeBytes);
    byType.images.sizeFormatted = formatBytes(byType.images.sizeBytes);
    byType.videos.sizeFormatted = formatBytes(byType.videos.sizeBytes);
    byType.audio.sizeFormatted = formatBytes(byType.audio.sizeBytes);
    orphanedFiles.sizeFormatted = formatBytes(orphanedFiles.sizeBytes);

    const stats: MediaStats = {
      totalFiles,
      totalSizeBytes,
      totalSizeFormatted,
      byType,
      orphanedFiles,
    };

    console.log('[GET /api/media/stats] Stats:', {
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSizeFormatted,
      orphaned: stats.orphanedFiles.count,
    });

    return apiSuccess(stats);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/media/stats error:', error);
    return apiError(errorMessage || 'Failed to calculate media statistics', 500);
  }
}
