/**
 * Firebase Storage Utilities for Media Library Manager
 *
 * Helper functions for analyzing and managing media files in Firebase Storage.
 */

import { getStorage } from '@/lib/firebase/admin';
import { getSignedUrl } from '@/lib/storage';
import type { MediaFile, MediaType } from '@/types/media';
import { getMediaTypeFromMimeType, formatBytes } from '@/types/media';

/**
 * Storage file metadata from Firebase Storage API
 */
interface StorageFileMetadata {
  name: string;
  bucket: string;
  generation: string;
  metageneration: string;
  contentType: string;
  timeCreated: string;
  updated: string;
  size: string; // Firebase returns size as string
  md5Hash: string;
  metadata?: Record<string, string>;
}

/**
 * List all files in a storage bucket with optional prefix filter
 *
 * @param prefix - Optional path prefix to filter files (e.g., "media/lessons/")
 * @returns Array of file metadata objects
 */
export async function listStorageFiles(prefix?: string): Promise<StorageFileMetadata[]> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();

    console.log('[listStorageFiles] Listing files with prefix:', prefix || 'all');

    const [files] = await bucket.getFiles({ prefix });

    console.log('[listStorageFiles] Found', files.length, 'files');

    const fileMetadata: StorageFileMetadata[] = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return metadata as StorageFileMetadata;
      })
    );

    return fileMetadata;
  } catch (error: any) {
    console.error('[listStorageFiles] Error:', error);
    throw new Error(`Failed to list storage files: ${error.message}`);
  }
}

/**
 * Get all file paths referenced in lessons collection
 *
 * Checks the following fields:
 * - storage_path_original
 * - thumbnail_url
 * - renditions (high, medium, low)
 * - audio_variants (high, medium, low)
 *
 * @param firestore - Firestore instance
 * @returns Set of all file paths referenced in lessons
 */
export async function getReferencedFilePaths(firestore: FirebaseFirestore.Firestore): Promise<Set<string>> {
  try {
    console.log('[getReferencedFilePaths] Querying lessons collection...');

    const lessonsSnapshot = await firestore.collection('lessons').get();
    const referencedPaths = new Set<string>();

    console.log('[getReferencedFilePaths] Found', lessonsSnapshot.size, 'lessons');

    lessonsSnapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Original storage path
      if (data.storage_path_original) {
        referencedPaths.add(data.storage_path_original);
      }

      // Thumbnail (if stored as path, not URL)
      if (data.thumbnail_url && !data.thumbnail_url.startsWith('http')) {
        referencedPaths.add(data.thumbnail_url);
      }

      // Video renditions
      if (data.renditions) {
        if (data.renditions.high?.path) referencedPaths.add(data.renditions.high.path);
        if (data.renditions.medium?.path) referencedPaths.add(data.renditions.medium.path);
        if (data.renditions.low?.path) referencedPaths.add(data.renditions.low.path);
      }

      // Audio variants
      if (data.audio_variants) {
        if (data.audio_variants.high?.path) referencedPaths.add(data.audio_variants.high.path);
        if (data.audio_variants.medium?.path) referencedPaths.add(data.audio_variants.medium.path);
        if (data.audio_variants.low?.path) referencedPaths.add(data.audio_variants.low.path);
      }
    });

    console.log('[getReferencedFilePaths] Found', referencedPaths.size, 'referenced paths');

    return referencedPaths;
  } catch (error: any) {
    console.error('[getReferencedFilePaths] Error:', error);
    throw new Error(`Failed to get referenced file paths: ${error.message}`);
  }
}

/**
 * Find which lessons use a specific file path
 *
 * @param firestore - Firestore instance
 * @param filePath - Storage path to search for
 * @returns Array of lesson IDs using this file
 */
export async function findLessonsUsingFile(
  firestore: FirebaseFirestore.Firestore,
  filePath: string
): Promise<string[]> {
  try {
    const lessonsSnapshot = await firestore.collection('lessons').get();
    const lessonIds: string[] = [];

    lessonsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      let isUsed = false;

      // Check all possible fields
      if (data.storage_path_original === filePath) isUsed = true;
      if (data.thumbnail_url === filePath) isUsed = true;

      if (data.renditions) {
        if (data.renditions.high?.path === filePath) isUsed = true;
        if (data.renditions.medium?.path === filePath) isUsed = true;
        if (data.renditions.low?.path === filePath) isUsed = true;
      }

      if (data.audio_variants) {
        if (data.audio_variants.high?.path === filePath) isUsed = true;
        if (data.audio_variants.medium?.path === filePath) isUsed = true;
        if (data.audio_variants.low?.path === filePath) isUsed = true;
      }

      if (isUsed) {
        lessonIds.push(doc.id);
      }
    });

    return lessonIds;
  } catch (error: any) {
    console.error('[findLessonsUsingFile] Error:', error);
    return [];
  }
}

/**
 * Convert Storage file metadata to MediaFile object
 *
 * @param metadata - Storage file metadata
 * @param referencedPaths - Set of paths referenced in lessons
 * @param usedInLessons - Array of lesson IDs using this file
 * @returns MediaFile object
 */
export async function convertToMediaFile(
  metadata: StorageFileMetadata,
  referencedPaths: Set<string>,
  usedInLessons: string[]
): Promise<MediaFile | null> {
  try {
    const filePath = metadata.name;
    const size = parseInt(metadata.size, 10);
    const mediaType = getMediaTypeFromMimeType(metadata.contentType);

    if (!mediaType) {
      console.warn('[convertToMediaFile] Skipping non-media file:', filePath);
      return null;
    }

    // Generate signed URL (1 hour expiration)
    const url = await getSignedUrl(filePath, 60);

    // Extract file name from path
    const fileName = filePath.split('/').pop() || filePath;

    // Check if orphaned
    const isOrphaned = !referencedPaths.has(filePath);

    // Extract uploadedBy from metadata if available
    const uploadedBy = metadata.metadata?.uploadedBy || metadata.metadata?.uploaded_by;

    return {
      id: filePath,
      name: fileName,
      type: mediaType,
      size,
      url,
      contentType: metadata.contentType,
      uploadedAt: metadata.timeCreated,
      uploadedBy,
      usedInLessons,
      isOrphaned,
    };
  } catch (error: any) {
    console.error('[convertToMediaFile] Error converting file:', metadata.name, error);
    return null;
  }
}

/**
 * Delete multiple files from storage
 *
 * @param filePaths - Array of storage paths to delete
 * @returns Object with deleted count and errors
 */
export async function deleteMultipleFiles(
  filePaths: string[]
): Promise<{ deletedCount: number; errors: Array<{ path: string; error: string }> }> {
  const storage = getStorage();
  const bucket = storage.bucket();

  let deletedCount = 0;
  const errors: Array<{ path: string; error: string }> = [];

  console.log('[deleteMultipleFiles] Attempting to delete', filePaths.length, 'files');

  for (const filePath of filePaths) {
    try {
      const file = bucket.file(filePath);
      await file.delete();
      deletedCount++;
      console.log('[deleteMultipleFiles] ✅ Deleted:', filePath);
    } catch (error: any) {
      console.error('[deleteMultipleFiles] ❌ Failed to delete:', filePath, error.message);
      errors.push({
        path: filePath,
        error: error.message || 'Unknown error',
      });
    }
  }

  console.log('[deleteMultipleFiles] Summary: deleted', deletedCount, 'of', filePaths.length, 'files');

  return { deletedCount, errors };
}

/**
 * Delete a single file from storage
 *
 * @param filePath - Storage path to delete
 */
export async function deleteSingleFile(filePath: string): Promise<void> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    await file.delete();
    console.log('[deleteSingleFile] ✅ Deleted:', filePath);
  } catch (error: any) {
    console.error('[deleteSingleFile] ❌ Failed to delete:', filePath, error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Filter media files by query parameters
 *
 * @param files - Array of MediaFile objects
 * @param query - Query filters
 * @returns Filtered array of MediaFile objects
 */
export function filterMediaFiles(
  files: MediaFile[],
  query: {
    type?: MediaType;
    startDate?: string;
    endDate?: string;
    lessonId?: string;
    orphaned?: boolean;
  }
): MediaFile[] {
  let filtered = files;

  // Filter by type
  if (query.type) {
    filtered = filtered.filter((file) => file.type === query.type);
  }

  // Filter by date range
  if (query.startDate) {
    const startDate = new Date(query.startDate);
    filtered = filtered.filter((file) => new Date(file.uploadedAt) >= startDate);
  }

  if (query.endDate) {
    const endDate = new Date(query.endDate);
    filtered = filtered.filter((file) => new Date(file.uploadedAt) <= endDate);
  }

  // Filter by lesson usage
  if (query.lessonId) {
    const lessonId = query.lessonId;
    filtered = filtered.filter((file) => file.usedInLessons.includes(lessonId));
  }

  // Filter by orphaned status
  if (query.orphaned !== undefined) {
    filtered = filtered.filter((file) => file.isOrphaned === query.orphaned);
  }

  return filtered;
}

/**
 * Apply pagination to media files array
 *
 * @param files - Array of MediaFile objects (sorted)
 * @param limit - Number of items per page
 * @param startAfter - Cursor (file path) to start after
 * @returns Object with paginated files and pagination info
 */
export function paginateMediaFiles(
  files: MediaFile[],
  limit: number = 50,
  startAfter?: string
): { files: MediaFile[]; hasMore: boolean; nextCursor?: string } {
  let startIndex = 0;

  // Find start index if cursor provided
  if (startAfter) {
    startIndex = files.findIndex((file) => file.id === startAfter) + 1;
    if (startIndex === 0) {
      // Cursor not found, start from beginning
      startIndex = 0;
    }
  }

  const endIndex = startIndex + limit;
  const paginatedFiles = files.slice(startIndex, endIndex);
  const hasMore = endIndex < files.length;
  const nextCursor = hasMore ? paginatedFiles[paginatedFiles.length - 1]?.id : undefined;

  return {
    files: paginatedFiles,
    hasMore,
    nextCursor,
  };
}
