/**
 * Lesson Validators
 *
 * Zod schemas for validating lesson creation, updates, and uploads.
 *
 * IMPORTANT - i18n Support (Issue #68):
 * - All text fields now support multilingual content (FR/EN/ES)
 * - French (fr) is the primary language and always required
 * - English (en) and Spanish (es) are optional
 * - Firestore uses snake_case (title_fr, title_en, title_es)
 * - TypeScript uses objects ({ fr: string, en?: string, es?: string })
 */

import { z } from 'zod';

// ============================================================================
// Multilingual Field Schemas
// ============================================================================

/**
 * Multilingual text field - French required, others optional
 */
export const multilingualTextSchema = z.object({
  fr: z.string().min(1, 'French translation is required'),
  en: z.string().optional(),
  es: z.string().optional(),
});

/**
 * Optional multilingual text field
 */
export const multilingualTextOptionalSchema = z.object({
  fr: z.string().optional(),
  en: z.string().optional(),
  es: z.string().optional(),
}).optional();

/**
 * Multilingual text with max length validation
 */
export const multilingualTextWithMaxSchema = (maxLength: number) =>
  z.object({
    fr: z.string().min(1, 'French translation is required').max(maxLength, `French text must be less than ${maxLength} characters`),
    en: z.string().max(maxLength, `English text must be less than ${maxLength} characters`).optional(),
    es: z.string().max(maxLength, `Spanish text must be less than ${maxLength} characters`).optional(),
  });

// ============================================================================
// Lesson Enums
// ============================================================================

/**
 * Lesson type enum
 */
export const lessonTypeSchema = z.enum(['video', 'audio']);

/**
 * Lesson status enum
 */
export const lessonStatusSchema = z.enum(['draft', 'uploading', 'processing', 'ready', 'failed']);

/**
 * Lesson category enum (for specialized content)
 */
export const lessonCategorySchema = z.enum(['yoga', 'meditation', 'pilates', 'respiration', 'auto-massage']);

// ============================================================================
// Video/Audio Rendition Schemas
// ============================================================================

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

// ============================================================================
// Yoga-Specific Schemas (i18n)
// ============================================================================

/**
 * Yoga instruction schema with multilingual text
 */
export const yogaInstructionSchema = z.object({
  text: multilingualTextSchema,
  durationSec: z.number().int().min(0),
  side: z.enum(['left', 'right', 'none']).optional(),
});

/**
 * Yoga chapter schema with multilingual name and instructions
 */
export const yogaChapterSchema = z.object({
  id: z.string().min(1),
  name: multilingualTextSchema,
  order: z.number().int().min(0),
  startTimeSec: z.number().int().min(0),
  endTimeSec: z.number().int().min(0),
  instructions: z.array(yogaInstructionSchema).default([]),
}).refine(
  (data) => data.endTimeSec >= data.startTimeSec,
  { message: 'End time must be >= start time', path: ['endTimeSec'] }
);

// ============================================================================
// Massage-Specific Schemas (i18n)
// ============================================================================

/**
 * Massage instruction schema with multilingual text and pressure level
 */
export const massageInstructionSchema = z.object({
  text: multilingualTextSchema,
  durationSec: z.number().int().min(0),
  pressureLevel: multilingualTextOptionalSchema,
});

/**
 * Massage body zone schema with multilingual name and instructions
 */
export const massageBodyZoneSchema = z.object({
  id: z.string().min(1),
  name: multilingualTextSchema,
  order: z.number().int().min(0),
  startTimeSec: z.number().int().min(0),
  endTimeSec: z.number().int().min(0),
  instructions: z.array(massageInstructionSchema).default([]),
}).refine(
  (data) => data.endTimeSec >= data.startTimeSec,
  { message: 'End time must be >= start time', path: ['endTimeSec'] }
);

// ============================================================================
// Meditation-Specific Schemas (i18n)
// ============================================================================

/**
 * Meditation phase schema with multilingual content
 */
export const meditationPhaseSchema = z.object({
  id: z.string().min(1),
  name: multilingualTextSchema,
  order: z.number().int().min(0),
  startTimeSec: z.number().int().min(0),
  endTimeSec: z.number().int().min(0),
  breathingInstruction: multilingualTextOptionalSchema,
  ambientSoundName: multilingualTextOptionalSchema,
}).refine(
  (data) => data.endTimeSec >= data.startTimeSec,
  { message: 'End time must be >= start time', path: ['endTimeSec'] }
);

// ============================================================================
// Yoga Pose Schemas (Issue #74)
// ============================================================================

/**
 * Yoga pose side enum
 */
export const yogaPoseSideSchema = z.enum(['none', 'left', 'right', 'both']);

/**
 * Yoga pose schema with multilingual content
 * Validates poses embedded in yoga/pilates lessons
 */
export const yogaPoseSchema = z.object({
  // Timing (in milliseconds)
  startTimeMs: z.number().int().min(0, 'Start time must be >= 0'),
  endTimeMs: z.number().int().min(0, 'End time must be >= 0'),

  // Identity (optional reference to global pose library)
  poseId: z.string().optional(),

  // Content with i18n support
  title: multilingualTextSchema,
  stimulus: multilingualTextSchema,
  instructions: z.array(multilingualTextSchema).min(1, 'At least one instruction is required'),

  // Metadata
  targetZones: z.array(z.string()).default([]),
  benefits: z.array(multilingualTextSchema).optional(),
  side: yogaPoseSideSchema.default('none'),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  difficulty: z.number().int().min(1).max(3).optional(),
}).refine(
  (data) => data.endTimeMs > data.startTimeMs,
  { message: 'End time must be greater than start time', path: ['endTimeMs'] }
);

/**
 * Array of yoga poses with overlap validation
 */
export const yogaPosesArraySchema = z.array(yogaPoseSchema)
  .max(50, 'Maximum 50 poses per lesson')
  .refine(
    (poses) => {
      // Check for overlapping poses
      for (let i = 0; i < poses.length; i++) {
        for (let j = i + 1; j < poses.length; j++) {
          const a = poses[i];
          const b = poses[j];
          // Check if poses overlap
          if (a.startTimeMs < b.endTimeMs && b.startTimeMs < a.endTimeMs) {
            return false;
          }
        }
      }
      return true;
    },
    { message: 'Poses cannot overlap in time' }
  );

// ============================================================================
// Create Lesson Schema (with i18n)
// ============================================================================

/**
 * Create lesson request schema with multilingual support
 */
export const createLessonSchema = z.object({
  // Basic fields (multilingual)
  title: multilingualTextWithMaxSchema(200),
  description: multilingualTextOptionalSchema.nullable(),
  transcript: multilingualTextOptionalSchema.nullable(),

  // Category (required)
  category: lessonCategorySchema,

  // Non-multilingual fields
  type: lessonTypeSchema,
  programId: z.string().optional(),  // Program is now optional
  order: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),

  // Yoga-specific (optional)
  chapters: z.array(yogaChapterSchema).optional(),

  // Massage-specific (optional)
  bodyZones: z.array(massageBodyZoneSchema).optional(),

  // Meditation-specific (optional)
  phases: z.array(meditationPhaseSchema).optional(),
  ambientSoundName: multilingualTextOptionalSchema,
  breathingInstruction: multilingualTextOptionalSchema,

  // Yoga poses (Issue #74)
  yogaPoses: yogaPosesArraySchema.optional(),
});

/**
 * Backward-compatible create lesson schema (for existing non-i18n API calls)
 * Accepts either multilingual objects or plain strings (for French)
 */
export const createLessonSchemaCompat = z.object({
  // Support both string (legacy) and multilingual object
  title: z.union([
    z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    multilingualTextWithMaxSchema(200),
  ]),
  description: z.union([
    z.string().max(500, 'Description must be less than 500 characters').nullable(),
    multilingualTextOptionalSchema.nullable(),
  ]).optional(),

  // Category (required)
  category: lessonCategorySchema,

  // Non-multilingual fields
  type: lessonTypeSchema,
  programId: z.string().optional(),  // Program is now optional
  order: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
  transcript: z.union([
    z.string().nullable(),
    multilingualTextOptionalSchema.nullable(),
  ]).optional(),
});

// ============================================================================
// Update Lesson Schema (with i18n)
// ============================================================================

/**
 * Update lesson request schema with multilingual support
 */
export const updateLessonSchema = z.object({
  // Basic fields (multilingual) - all optional for partial updates
  title: multilingualTextWithMaxSchema(200).optional(),
  description: multilingualTextOptionalSchema.nullable(),
  transcript: multilingualTextOptionalSchema.nullable(),

  // Category (simple enum)
  category: lessonCategorySchema.optional().nullable(),

  // Non-multilingual fields
  order: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  programId: z.string().min(1).optional(),

  // Yoga-specific (optional)
  chapters: z.array(yogaChapterSchema).optional(),

  // Massage-specific (optional)
  bodyZones: z.array(massageBodyZoneSchema).optional(),

  // Meditation-specific (optional)
  phases: z.array(meditationPhaseSchema).optional(),
  ambientSoundName: multilingualTextOptionalSchema,
  breathingInstruction: multilingualTextOptionalSchema,

  // Yoga poses (Issue #74)
  yogaPoses: yogaPosesArraySchema.optional(),
});

/**
 * Backward-compatible update lesson schema
 */
export const updateLessonSchemaCompat = z.object({
  title: z.union([
    z.string().min(1).max(200),
    multilingualTextWithMaxSchema(200),
  ]).optional(),
  description: z.union([
    z.string().max(500, 'Description must be less than 500 characters').nullable(),
    multilingualTextOptionalSchema.nullable(),
  ]).optional(),
  order: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  transcript: z.union([
    z.string().nullable(),
    multilingualTextOptionalSchema.nullable(),
  ]).optional(),
  programId: z.string().min(1).optional(),

  // Yoga poses (Issue #74)
  yogaPoses: yogaPosesArraySchema.optional(),
});

// ============================================================================
// Lesson Filters Schema
// ============================================================================

/**
 * Lesson filters schema (for list queries)
 *
 * IMPORTANT: Default limit increased from 20 to 100 to show all lessons.
 * The admin Content page needs to display all lessons without pagination.
 * See Issue #64: Some lessons were not displaying because they exceeded the default limit.
 */
export const lessonFiltersSchema = z.object({
  programId: z.string().optional(),
  status: lessonStatusSchema.optional(),
  type: lessonTypeSchema.optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(100),  // Increased from 20 to 100
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// File Upload Schema
// ============================================================================

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

// ============================================================================
// Constants
// ============================================================================

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

// ============================================================================
// Validation Helper Functions
// ============================================================================

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
 * Validate lesson creation request (with i18n support)
 */
export function validateCreateLesson(data: unknown) {
  return createLessonSchemaCompat.parse(data);
}

/**
 * Validate lesson creation request (strict i18n)
 */
export function validateCreateLessonI18n(data: unknown) {
  return createLessonSchema.parse(data);
}

/**
 * Validate lesson update request
 */
export function validateUpdateLesson(data: unknown) {
  return updateLessonSchemaCompat.parse(data);
}

/**
 * Validate lesson update request (strict i18n)
 */
export function validateUpdateLessonI18n(data: unknown) {
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

/**
 * Safe validation for create lesson (returns success/error)
 */
export function safeValidateCreateLesson(data: unknown) {
  return createLessonSchemaCompat.safeParse(data);
}

/**
 * Safe validation for update lesson (returns success/error)
 */
export function safeValidateUpdateLesson(data: unknown) {
  return updateLessonSchemaCompat.safeParse(data);
}

// ============================================================================
// Type Exports
// ============================================================================

export type MultilingualText = z.infer<typeof multilingualTextSchema>;
export type MultilingualTextOptional = z.infer<typeof multilingualTextOptionalSchema>;
export type YogaInstruction = z.infer<typeof yogaInstructionSchema>;
export type YogaChapter = z.infer<typeof yogaChapterSchema>;
export type MassageInstruction = z.infer<typeof massageInstructionSchema>;
export type MassageBodyZone = z.infer<typeof massageBodyZoneSchema>;
export type MeditationPhase = z.infer<typeof meditationPhaseSchema>;
export type YogaPose = z.infer<typeof yogaPoseSchema>;
export type YogaPoseSide = z.infer<typeof yogaPoseSideSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchemaCompat>;
export type CreateLessonI18nInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchemaCompat>;
export type UpdateLessonI18nInput = z.infer<typeof updateLessonSchema>;
export type LessonFiltersInput = z.infer<typeof lessonFiltersSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
