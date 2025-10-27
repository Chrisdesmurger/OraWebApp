/**
 * Lesson Validators
 *
 * Zod schemas for validating lesson creation, updates, and uploads.
 */

import { z } from 'zod';

/**
 * Lesson type enum
 */
export const lessonTypeSchema = z.enum(['video', 'audio']);

/**
 * Lesson status enum
 */
export const lessonStatusSchema = z.enum(['draft', 'uploading', 'processing', 'ready', 'failed']);

/**
 * Video rendition schema
 */
export const videoRenditionSchema = z.object({
  path: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  bitrateKbps: z.number().optional(),
});

/**
 * Audio variant schema
 */
export const audioVariantSchema = z.object({
  path: z.string(),
  bitrateKbps: z.number(),
});

/**
 * Video renditions schema (high/medium/low)
 */
export const videoRenditionsSchema = z.object({
  high: videoRenditionSchema.optional(),
  medium: videoRenditionSchema.optional(),
  low: videoRenditionSchema.optional(),
});

/**
 * Audio variants schema (high/medium/low)
 */
export const audioVariantsSchema = z.object({
  high: audioVariantSchema.optional(),
  medium: audioVariantSchema.optional(),
  low: audioVariantSchema.optional(),
});

/**
 * Create lesson request schema
 */
export const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').nullable().optional(),
  type: lessonTypeSchema,
  programId: z.string().min(1, 'Program ID is required'),
  order: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
  transcript: z.string().nullable().optional(),
});

/**
 * Update lesson request schema
 */
export const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').nullable().optional(),
  order: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  transcript: z.string().nullable().optional(),
  programId: z.string().min(1).optional(),
});

/**
 * Lesson filters schema (for list queries)
 */
export const lessonFiltersSchema = z.object({
  programId: z.string().optional(),
  status: lessonStatusSchema.optional(),
  type: lessonTypeSchema.optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

/**
 * File upload validation schema
 */
export const fileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number()
    .int()
    .min(1, 'File size must be greater than 0')
    .max(2 * 1024 * 1024 * 1024, 'File size must be less than 2GB'),
  mimeType: z.string().refine(
    (mime) => {
      const videoTypes = ['video/mp4', 'video/webm'];
      const audioTypes = ['audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/mp3', 'audio/wav'];
      return [...videoTypes, ...audioTypes].includes(mime);
    },
    { message: 'Invalid file type. Supported: mp4, webm, m4a, mp3, wav' }
  ),
  lessonType: lessonTypeSchema,
});

/**
 * Supported video MIME types
 */
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;

/**
 * Supported audio MIME types
 */
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mp4',
  'audio/m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
] as const;

/**
 * Max file size (2GB)
 */
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

/**
 * Validate file type matches lesson type
 */
export function validateFileType(mimeType: string, lessonType: 'video' | 'audio'): boolean {
  if (lessonType === 'video') {
    return (SUPPORTED_VIDEO_TYPES as readonly string[]).includes(mimeType);
  } else {
    return (SUPPORTED_AUDIO_TYPES as readonly string[]).includes(mimeType);
  }
}

/**
 * Get supported MIME types for lesson type
 */
export function getSupportedMimeTypes(lessonType: 'video' | 'audio'): readonly string[] {
  return lessonType === 'video' ? SUPPORTED_VIDEO_TYPES : SUPPORTED_AUDIO_TYPES;
}

/**
 * Validate lesson creation request
 */
export function validateCreateLesson(data: unknown) {
  return createLessonSchema.parse(data);
}

/**
 * Validate lesson update request
 */
export function validateUpdateLesson(data: unknown) {
  return updateLessonSchema.parse(data);
}

/**
 * Validate lesson filters
 */
export function validateLessonFilters(data: unknown) {
  return lessonFiltersSchema.parse(data);
}

/**
 * Validate file upload
 */
export function validateFileUpload(data: unknown) {
  return fileUploadSchema.parse(data);
}

// Export types inferred from schemas
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type LessonFiltersInput = z.infer<typeof lessonFiltersSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
