/**
 * Firebase Storage Utilities for Media Library Manager
 *
 * Helper functions for analyzing and managing media files in Firebase Storage.
 */

import { getStorage } from '@/lib/firebase/admin';
import { getSignedUrl } from '@/lib/storage';
import type { MediaFile, MediaType, LessonReference, AlternativeVersion } from '@/types/media';
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
 * Determine if a file should be included in the main media list
 *
 * Filters out medium and low quality renditions - only show high quality
 *
 * @param filePath - Storage file path
 * @returns True if file should be included in list
 */
function shouldIncludeInMediaList(filePath: string): boolean {
  // Exclude medium and low quality versions
  // Check both path segments (e.g., "/medium/") and filenames (e.g., "medium.mp4", "low.mp4")
  const pathLower = filePath.toLowerCase();

  if (pathLower.includes('/medium/') || pathLower.includes('/low/')) {
    return false;
  }

  // Extract filename from path
  const fileName = filePath.split('/').pop() || '';
  const fileNameLower = fileName.toLowerCase();

  // Exclude files named "medium.*" or "low.*"
  if (fileNameLower.startsWith('medium.') || fileNameLower.startsWith('low.')) {
    return false;
  }

  // Exclude files with "_medium" or "_low" suffix before extension
  if (fileNameLower.match(/(medium|low)\.(mp4|mp3|webm|ogg|m4a)/i)) {
    return false;
  }

  // Include high quality, original, and standalone files
  return true;
}

/**
 * Extract lesson ID from a storage path
 *
 * @param filePath - Storage file path (e.g., "media/lessons/lesson123/high/video.mp4")
 * @returns Lesson ID or null
 */
function extractLessonIdFromPath(filePath: string): string | null {
  // Pattern: media/lessons/{lessonId}/...
  const match = filePath.match(/media\/lessons\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Get alternative quality versions for a high quality file
 *
 * @param lessonData - Lesson document data
 * @param isVideo - True for video, false for audio
 * @returns Array of alternative versions
 */
async function getAlternativeVersions(
  lessonData: any,
  isVideo: boolean
): Promise<AlternativeVersion[]> {
  const versions: AlternativeVersion[] = [];
  const variantsKey = isVideo ? 'renditions' : 'audio_variants';
  const variants = lessonData[variantsKey];

  if (!variants) {
    return versions;
  }

  // Check medium version
  if (variants.medium?.path) {
    try {
      const url = await getSignedUrl(variants.medium.path, 60);
      versions.push({
        quality: 'medium',
        path: variants.medium.path,
        url,
        size: variants.medium.size_bytes || 0,
        sizeFormatted: formatBytes(variants.medium.size_bytes || 0),
      });
    } catch (error) {
      console.warn('[getAlternativeVersions] Failed to get URL for medium quality:', error);
    }
  }

  // Check low version
  if (variants.low?.path) {
    try {
      const url = await getSignedUrl(variants.low.path, 60);
      versions.push({
        quality: 'low',
        path: variants.low.path,
        url,
        size: variants.low.size_bytes || 0,
        sizeFormatted: formatBytes(variants.low.size_bytes || 0),
      });
    } catch (error) {
      console.warn('[getAlternativeVersions] Failed to get URL for low quality:', error);
    }
  }

  return versions;
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
 * @returns Array of lesson references with ID and title
 */
export async function findLessonsUsingFile(
  firestore: FirebaseFirestore.Firestore,
  filePath: string
): Promise<LessonReference[]> {
  try {
    const lessonsSnapshot = await firestore.collection('lessons').get();
    const lessonReferences: LessonReference[] = [];

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
        lessonReferences.push({
          id: doc.id,
          title: data.title || 'Untitled Lesson',
        });
      }
    });

    return lessonReferences;
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
 * @param firestore - Firestore instance for fetching lesson data
 * @returns MediaFile object or null if should be filtered
 */
export async function convertToMediaFile(
  metadata: StorageFileMetadata,
  referencedPaths: Set<string>,
  firestore: FirebaseFirestore.Firestore
): Promise<MediaFile | null> {
  try {
    const filePath = metadata.name;

    // Filter out medium and low quality renditions
    if (!shouldIncludeInMediaList(filePath)) {
      console.log('[convertToMediaFile] Skipping non-high quality rendition:', filePath);
      return null;
    }

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

    // Find lessons using this file (with titles)
    const usedInLessons = await findLessonsUsingFile(firestore, filePath);

    // Set lesson title if used in exactly one lesson
    let lessonTitle: string | undefined;
    if (usedInLessons.length === 1) {
      lessonTitle = usedInLessons[0].title;
    }

    // Get alternative versions for video/audio files
    let alternativeVersions: AlternativeVersion[] | undefined;

    // Extract lesson ID from path
    const lessonId = extractLessonIdFromPath(filePath);

    if (lessonId && (mediaType === 'video' || mediaType === 'audio')) {
      // Check if this is a high quality file
      const isHighQuality = filePath.includes('/high/');

      if (isHighQuality) {
        try {
          // Fetch lesson data to get alternative versions
          const lessonDoc = await firestore.collection('lessons').doc(lessonId).get();
          if (lessonDoc.exists) {
            const lessonData = lessonDoc.data();
            alternativeVersions = await getAlternativeVersions(
              lessonData,
              mediaType === 'video'
            );
          }
        } catch (error) {
          console.warn('[convertToMediaFile] Failed to fetch alternative versions:', error);
        }
      }
    }

    return {
      id: filePath,
      name: fileName,
      lessonTitle,
      type: mediaType,
      size,
      url,
      contentType: metadata.contentType,
      uploadedAt: metadata.timeCreated,
      uploadedBy,
      usedInLessons,
      isOrphaned,
      alternativeVersions,
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
    filtered = filtered.filter((file) =>
      file.usedInLessons.some(lesson => lesson.id === lessonId)
    );
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
