/**
 * Zod validation schemas for program CRUD operations
 *
 * These schemas validate incoming API requests to ensure data integrity
 * before persisting to Firestore.
 */

import { z } from 'zod';

// ============================================================================
// Enum Schemas
// ============================================================================

/**
 * Category enum validation
 */
export const categorySchema = z.enum(['meditation', 'yoga', 'mindfulness', 'wellness'], {
  errorMap: () => ({ message: 'Category must be one of: meditation, yoga, mindfulness, wellness' }),
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
// Create Program Schema
// ============================================================================

/**
 * Validation schema for creating a new program
 * POST /api/programs
 */
export const createProgramSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters')
    .trim(),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters')
    .trim(),

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
});

// ============================================================================
// Update Program Schema
// ============================================================================

/**
 * Validation schema for updating an existing program
 * PATCH /api/programs/[id]
 *
 * All fields are optional for partial updates
 */
export const updateProgramSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters')
    .trim()
    .optional(),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters')
    .trim()
    .optional(),

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
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

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

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type UpdateProgramLessonsInput = z.infer<typeof updateProgramLessonsSchema>;
export type GetProgramsQueryInput = z.infer<typeof getProgramsQuerySchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates and parses create program data
 * Throws ZodError if validation fails
 */
export function validateCreateProgram(data: unknown): CreateProgramInput {
  return createProgramSchema.parse(data);
}

/**
 * Validates and parses update program data
 * Throws ZodError if validation fails
 */
export function validateUpdateProgram(data: unknown): UpdateProgramInput {
  return updateProgramSchema.parse(data);
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
 */
export function safeValidateCreateProgram(data: unknown) {
  return createProgramSchema.safeParse(data);
}

/**
 * Safe validation that returns success/error object instead of throwing
 */
export function safeValidateUpdateProgram(data: unknown) {
  return updateProgramSchema.safeParse(data);
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
