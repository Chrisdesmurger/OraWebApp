/**
 * Zod validation schemas for program CRUD operations
 *
 * These schemas validate incoming API requests to ensure data integrity
 * before persisting to Firestore.
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
 * Multilingual text with length constraints
 */
export const multilingualTextWithLengthSchema = (minLength: number, maxLength: number) =>
  z.object({
    fr: z.string()
      .min(minLength, `French text must be at least ${minLength} characters`)
      .max(maxLength, `French text must not exceed ${maxLength} characters`),
    en: z.string().max(maxLength, `English text must not exceed ${maxLength} characters`).optional(),
    es: z.string().max(maxLength, `Spanish text must not exceed ${maxLength} characters`).optional(),
  });

// ============================================================================
// Enum Schemas
// ============================================================================

/**
 * Category enum validation
 */
export const categorySchema = z.enum(['meditation', 'yoga', 'massage', 'mindfulness', 'wellness'], {
  errorMap: () => ({ message: 'Category must be one of: meditation, yoga, massage, mindfulness, wellness' }),
});

/**
 * Difficulty enum validation
 */
export const difficultySchema = z.enum(['beginner', 'intermediate', 'advanced'], {
  errorMap: () => ({ message: 'Difficulty must be one of: beginner, intermediate, advanced' }),
});

/**
 * Program status enum validation
 */
export const programStatusSchema = z.enum(['draft', 'published', 'archived'], {
  errorMap: () => ({ message: 'Status must be one of: draft, published, archived' }),
});

// ============================================================================
// Program Objective Schema (i18n)
// ============================================================================

/**
 * Program objective with multilingual text
 */
export const programObjectiveSchema = z.object({
  id: z.string().min(1),
  text: multilingualTextSchema,
  order: z.number().int().min(0),
});

// ============================================================================
// Scheduling Validation Helpers
// ============================================================================

/**
 * ISO timestamp string validation
 */
const isoTimestampSchema = z
  .string()
  .datetime({ message: 'Must be a valid ISO 8601 timestamp' })
  .nullable()
  .optional();

/**
 * Custom refinement to ensure publish date is before archive date
 */
function validateSchedulingDates(data: {
  scheduledPublishAt?: string | null;
  scheduledArchiveAt?: string | null;
}): boolean {
  if (!data.scheduledPublishAt || !data.scheduledArchiveAt) {
    return true; // Skip validation if either is missing
  }

  const publishDate = new Date(data.scheduledPublishAt);
  const archiveDate = new Date(data.scheduledArchiveAt);

  return publishDate < archiveDate;
}

/**
 * Custom refinement to ensure scheduled dates are in the future
 */
function validateFutureDates(data: {
  scheduledPublishAt?: string | null;
  scheduledArchiveAt?: string | null;
}): boolean {
  const now = new Date();

  if (data.scheduledPublishAt) {
    const publishDate = new Date(data.scheduledPublishAt);
    if (publishDate <= now) {
      return false;
    }
  }

  if (data.scheduledArchiveAt) {
    const archiveDate = new Date(data.scheduledArchiveAt);
    if (archiveDate <= now) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Create Program Schema (with i18n)
// ============================================================================

/**
 * Validation schema for creating a new program with i18n support
 * POST /api/programs
 */
export const createProgramSchemaI18n = z.object({
  // Multilingual fields
  title: multilingualTextWithLengthSchema(3, 100),
  description: multilingualTextWithLengthSchema(10, 1000),
  category: multilingualTextOptionalSchema,  // Localized category label
  difficulty: multilingualTextOptionalSchema, // Localized difficulty label

  // Enum category (for filtering)
  categoryKey: categorySchema,
  difficultyKey: difficultySchema,

  durationDays: z
    .number()
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration must not exceed 365 days'),

  lessons: z
    .array(z.string())
    .optional()
    .default([]),

  tags: z
    .array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),

  coverImageUrl: z
    .string()
    .url('Cover image URL must be a valid URL')
    .nullable()
    .optional(),

  // Program objectives (i18n)
  objectives: z.array(programObjectiveSchema).optional().default([]),

  // Additional i18n fields
  prerequisites: multilingualTextOptionalSchema,
  expectedResults: multilingualTextOptionalSchema,

  // Scheduling fields (Issue #22)
  scheduledPublishAt: isoTimestampSchema,
  scheduledArchiveAt: isoTimestampSchema,
  autoPublishEnabled: z.boolean().optional().default(false),
}).refine(validateSchedulingDates, {
  message: 'Scheduled publish date must be before scheduled archive date',
  path: ['scheduledArchiveAt'],
}).refine(validateFutureDates, {
  message: 'Scheduled dates must be in the future',
  path: ['scheduledPublishAt'],
});

/**
 * Backward-compatible create program schema (accepts string or multilingual)
 */
export const createProgramSchema = z.object({
  title: z.union([
    z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must not exceed 100 characters').trim(),
    multilingualTextWithLengthSchema(3, 100),
  ]),

  description: z.union([
    z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must not exceed 1000 characters').trim(),
    multilingualTextWithLengthSchema(10, 1000),
  ]),

  category: categorySchema,

  difficulty: difficultySchema,

  durationDays: z
    .number()
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration must not exceed 365 days'),

  lessons: z
    .array(z.string())
    .optional()
    .default([]),

  tags: z
    .array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),

  coverImageUrl: z
    .string()
    .url('Cover image URL must be a valid URL')
    .nullable()
    .optional(),

  // Scheduling fields (Issue #22)
  scheduledPublishAt: isoTimestampSchema,
  scheduledArchiveAt: isoTimestampSchema,
  autoPublishEnabled: z.boolean().optional().default(false),
}).refine(validateSchedulingDates, {
  message: 'Scheduled publish date must be before scheduled archive date',
  path: ['scheduledArchiveAt'],
}).refine(validateFutureDates, {
  message: 'Scheduled dates must be in the future',
  path: ['scheduledPublishAt'],
});

// ============================================================================
// Update Program Schema (with i18n)
// ============================================================================

/**
 * Validation schema for updating an existing program with i18n
 * PATCH /api/programs/[id]
 *
 * All fields are optional for partial updates
 */
export const updateProgramSchemaI18n = z.object({
  // Multilingual fields
  title: multilingualTextWithLengthSchema(3, 100).optional(),
  description: multilingualTextWithLengthSchema(10, 1000).optional(),
  category: multilingualTextOptionalSchema,
  difficulty: multilingualTextOptionalSchema,

  // Enum keys
  categoryKey: categorySchema.optional(),
  difficultyKey: difficultySchema.optional(),

  durationDays: z
    .number()
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration must not exceed 365 days')
    .optional(),

  coverImageUrl: z
    .string()
    .url('Cover image URL must be a valid URL')
    .nullable()
    .optional(),

  status: programStatusSchema.optional(),

  tags: z
    .array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),

  // Program objectives (i18n)
  objectives: z.array(programObjectiveSchema).optional(),

  // Additional i18n fields
  prerequisites: multilingualTextOptionalSchema,
  expectedResults: multilingualTextOptionalSchema,

  // Scheduling fields (Issue #22)
  scheduledPublishAt: isoTimestampSchema,
  scheduledArchiveAt: isoTimestampSchema,
  autoPublishEnabled: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
).refine(validateSchedulingDates, {
  message: 'Scheduled publish date must be before scheduled archive date',
  path: ['scheduledArchiveAt'],
});

/**
 * Backward-compatible update program schema
 */
export const updateProgramSchema = z.object({
  title: z.union([
    z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must not exceed 100 characters').trim(),
    multilingualTextWithLengthSchema(3, 100),
  ]).optional(),

  description: z.union([
    z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must not exceed 1000 characters').trim(),
    multilingualTextWithLengthSchema(10, 1000),
  ]).optional(),

  category: categorySchema.optional(),

  difficulty: difficultySchema.optional(),

  durationDays: z
    .number()
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration must not exceed 365 days')
    .optional(),

  coverImageUrl: z
    .string()
    .url('Cover image URL must be a valid URL')
    .nullable()
    .optional(),

  status: programStatusSchema.optional(),

  tags: z
    .array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),

  // Scheduling fields (Issue #22)
  scheduledPublishAt: isoTimestampSchema,
  scheduledArchiveAt: isoTimestampSchema,
  autoPublishEnabled: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
).refine(validateSchedulingDates, {
  message: 'Scheduled publish date must be before scheduled archive date',
  path: ['scheduledArchiveAt'],
});

// ============================================================================
// Update Lessons Schema
// ============================================================================

/**
 * Validation schema for updating lesson order in a program
 * POST /api/programs/[id]/lessons
 */
export const updateProgramLessonsSchema = z.object({
  lessons: z
    .array(z.string())
    .min(0, 'Lessons array must be provided (can be empty to clear all lessons)'),
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

/**
 * Validation schema for GET /api/programs query parameters
 */
export const getProgramsQuerySchema = z.object({
  category: categorySchema.optional(),
  status: programStatusSchema.optional(),
  search: z.string().trim().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type MultilingualText = z.infer<typeof multilingualTextSchema>;
export type MultilingualTextOptional = z.infer<typeof multilingualTextOptionalSchema>;
export type ProgramObjective = z.infer<typeof programObjectiveSchema>;
export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type CreateProgramI18nInput = z.infer<typeof createProgramSchemaI18n>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type UpdateProgramI18nInput = z.infer<typeof updateProgramSchemaI18n>;
export type UpdateProgramLessonsInput = z.infer<typeof updateProgramLessonsSchema>;
export type GetProgramsQueryInput = z.infer<typeof getProgramsQuerySchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates and parses create program data
 *
 * Throws ZodError if validation fails. Use this for strict validation
 * where you want to catch and handle validation errors explicitly.
 *
 * @param data - Unvalidated input data
 * @returns Validated and typed CreateProgramInput
 * @throws {ZodError} If validation fails
 */
export function validateCreateProgram(data: unknown): CreateProgramInput {
  return createProgramSchema.parse(data);
}

/**
 * Validates and parses create program data with full i18n support
 */
export function validateCreateProgramI18n(data: unknown): CreateProgramI18nInput {
  return createProgramSchemaI18n.parse(data);
}

/**
 * Validates and parses update program data
 * Throws ZodError if validation fails
 */
export function validateUpdateProgram(data: unknown): UpdateProgramInput {
  return updateProgramSchema.parse(data);
}

/**
 * Validates and parses update program data with full i18n support
 */
export function validateUpdateProgramI18n(data: unknown): UpdateProgramI18nInput {
  return updateProgramSchemaI18n.parse(data);
}

/**
 * Validates and parses update lessons data
 * Throws ZodError if validation fails
 */
export function validateUpdateProgramLessons(data: unknown): UpdateProgramLessonsInput {
  return updateProgramLessonsSchema.parse(data);
}

/**
 * Validates and parses query parameters
 * Throws ZodError if validation fails
 */
export function validateGetProgramsQuery(data: unknown): GetProgramsQueryInput {
  return getProgramsQuerySchema.parse(data);
}

/**
 * Safe validation that returns success/error object instead of throwing
 *
 * Use this when you want to handle validation errors without try/catch.
 * Returns { success: true, data } on success or { success: false, error } on failure.
 *
 * @param data - Unvalidated input data
 * @returns SafeParseReturnType with success boolean and data or error
 *
 * @example
 * const result = safeValidateCreateProgram(req.body);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.errors });
 * }
 * const programData = result.data;
 */
export function safeValidateCreateProgram(data: unknown) {
  return createProgramSchema.safeParse(data);
}

/**
 * Safe validation for i18n create program
 */
export function safeValidateCreateProgramI18n(data: unknown) {
  return createProgramSchemaI18n.safeParse(data);
}

/**
 * Safe validation that returns success/error object instead of throwing
 */
export function safeValidateUpdateProgram(data: unknown) {
  return updateProgramSchema.safeParse(data);
}

/**
 * Safe validation for i18n update program
 */
export function safeValidateUpdateProgramI18n(data: unknown) {
  return updateProgramSchemaI18n.safeParse(data);
}

/**
 * Safe validation that returns success/error object instead of throwing
 */
export function safeValidateUpdateProgramLessons(data: unknown) {
  return updateProgramLessonsSchema.safeParse(data);
}

/**
 * Safe validation that returns success/error object instead of throwing
 */
export function safeValidateGetProgramsQuery(data: unknown) {
  return getProgramsQuerySchema.safeParse(data);
}
