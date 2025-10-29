/**
 * Shared types for bulk operations across programs and lessons
 */

/**
 * Response from bulk delete/update operations
 */
export interface BulkOperationResponse {
  success: boolean;
  deleted?: number;
  updated?: number;
  failed: number;
  errors?: string[];
}

/**
 * Request body for bulk delete programs
 */
export interface BulkDeleteProgramsRequest {
  programIds: string[];
}

/**
 * Request body for bulk update program status
 */
export interface BulkUpdateProgramsRequest {
  programIds: string[];
  status: 'draft' | 'published' | 'archived';
}

/**
 * Request body for bulk delete lessons
 */
export interface BulkDeleteLessonsRequest {
  lessonIds: string[];
}

/**
 * Type guard to check if value is a valid program status
 */
export function isValidProgramStatus(status: unknown): status is 'draft' | 'published' | 'archived' {
  return typeof status === 'string' && ['draft', 'published', 'archived'].includes(status);
}

/**
 * Type guard to check if value is a non-empty string array
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}
