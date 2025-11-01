/**
 * Media Library Manager Types
 *
 * Type definitions for media file management and storage operations.
 *
 * IMPORTANT NAMING CONVENTIONS:
 * - Firestore backend: snake_case (e.g., uploaded_at, content_type)
 * - Frontend client: camelCase (e.g., uploadedAt, contentType)
 */

// ============================================================================
// Core Types
// ============================================================================

export type MediaType = 'image' | 'video' | 'audio';

/**
 * Alternative quality version for video/audio files
 */
export interface AlternativeVersion {
  quality: 'high' | 'medium' | 'low';
  path: string;
  url: string;
  size: number;
  sizeFormatted: string;
}

/**
 * Lesson reference with ID and title
 */
export interface LessonReference {
  id: string;
  title: string;
}

/**
 * Client-side media file object (camelCase)
 */
export interface MediaFile {
  id: string;                      // File path in Storage
  name: string;                    // FILE NAME (keep for technical reference)
  lessonTitle?: string;            // Lesson title for display (if part of lesson)
  type: MediaType;
  size: number;                    // Bytes
  url: string;                     // Download URL
  contentType: string;             // MIME type
  uploadedAt: string;              // ISO timestamp
  uploadedBy?: string;             // User ID
  usedInLessons: LessonReference[]; // Array of objects with ID and title
  isOrphaned: boolean;             // Not referenced anywhere

  // Alternative quality versions (for videos/audio)
  alternativeVersions?: AlternativeVersion[];
}

/**
 * Storage statistics
 */
export interface MediaStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;      // "1.2 GB"
  byType: {
    images: { count: number; sizeBytes: number; sizeFormatted: string };
    videos: { count: number; sizeBytes: number; sizeFormatted: string };
    audio: { count: number; sizeBytes: number; sizeFormatted: string };
  };
  orphanedFiles: {
    count: number;
    sizeBytes: number;
    sizeFormatted: string;
  };
}

// ============================================================================
// API Request/Response Interfaces
// ============================================================================

/**
 * Query parameters for GET /api/media
 */
export interface GetMediaQuery {
  type?: MediaType;
  startDate?: string;              // ISO timestamp
  endDate?: string;                // ISO timestamp
  lessonId?: string;               // Filter by lesson usage
  orphaned?: boolean;              // Only orphaned files
  limit?: number;                  // Pagination limit (default: 50)
  startAfter?: string;             // Cursor for pagination (file path)
}

/**
 * Response from GET /api/media
 */
export interface GetMediaResponse {
  files: MediaFile[];
  hasMore: boolean;
  nextCursor?: string;             // Next file path for pagination
}

/**
 * Request for POST /api/media/cleanup
 */
export interface CleanupRequest {
  filePaths: string[];
}

/**
 * Response from POST /api/media/cleanup
 */
export interface CleanupResponse {
  deletedCount: number;
  errors: Array<{ path: string; error: string }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format bytes to human-readable string
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.2 GB", "512 MB", "3.5 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Determine media type from MIME type
 *
 * @param mimeType - MIME type (e.g., "video/mp4")
 * @returns MediaType ('image' | 'video' | 'audio')
 */
export function getMediaTypeFromMimeType(mimeType: string): MediaType | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return null;
}

/**
 * Type guard to check if a value is a valid MediaType
 */
export function isMediaType(value: string): value is MediaType {
  return ['image', 'video', 'audio'].includes(value);
}
