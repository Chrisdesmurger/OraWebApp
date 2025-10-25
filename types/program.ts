/**
 * Program types for Ora Admin Portal
 *
 * This file defines TypeScript interfaces for program management.
 *
 * IMPORTANT NAMING CONVENTIONS:
 * - Firestore backend: snake_case (e.g., duration_days, cover_image_url)
 * - Frontend client: camelCase (e.g., durationDays, coverImageUrl)
 * - Mappers handle the conversion between the two formats
 */

// ============================================================================
// Enums & Constants
// ============================================================================

export type Category = 'meditation' | 'yoga' | 'mindfulness' | 'wellness';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ProgramStatus = 'draft' | 'published' | 'archived';

export const CATEGORIES: Category[] = ['meditation', 'yoga', 'mindfulness', 'wellness'];
export const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
export const PROGRAM_STATUSES: ProgramStatus[] = ['draft', 'published', 'archived'];

// ============================================================================
// Firestore Document Interface (snake_case)
// ============================================================================

/**
 * Program document structure in Firestore
 * Uses snake_case field names to match backend convention
 */
export interface ProgramDocument {
  title: string;
  description: string;
  category: string;  // Category enum
  difficulty: string;  // Difficulty enum
  duration_days: number;
  lessons: string[];  // Array of lesson IDs in order
  cover_image_url: string | null;
  status: string;  // ProgramStatus enum
  author_id: string;  // Firebase Auth UID
  tags: string[];
  created_at: string;  // ISO timestamp
  updated_at: string;  // ISO timestamp
}

// ============================================================================
// Client-Side Interface (camelCase)
// ============================================================================

/**
 * Program object for frontend use
 * Uses camelCase field names following JavaScript conventions
 */
export interface Program {
  id: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  durationDays: number;
  lessons: string[];  // Array of lesson IDs in order
  coverImageUrl: string | null;
  status: ProgramStatus;
  authorId: string;
  tags: string[];
  createdAt: string;  // ISO timestamp
  updatedAt: string;  // ISO timestamp
}

// ============================================================================
// API Request/Response Interfaces
// ============================================================================

/**
 * Query parameters for GET /api/programs
 */
export interface GetProgramsQuery {
  category?: Category;
  status?: ProgramStatus;
  search?: string;
}

/**
 * Response from GET /api/programs
 */
export interface GetProgramsResponse {
  programs: Program[];
}

/**
 * Request body for POST /api/programs
 */
export interface CreateProgramRequest {
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  durationDays: number;
  lessons?: string[];  // Optional: can be added later
  tags?: string[];
}

/**
 * Response from POST /api/programs
 */
export interface CreateProgramResponse extends Program {}

/**
 * Response from GET /api/programs/[id]
 * Includes populated lesson details
 */
export interface GetProgramResponse {
  program: Program;
  lessonDetails: any[];  // Import Lesson type from types/lesson.ts when needed
}

/**
 * Request body for PATCH /api/programs/[id]
 * All fields optional for partial updates
 */
export interface UpdateProgramRequest {
  title?: string;
  description?: string;
  category?: Category;
  difficulty?: Difficulty;
  durationDays?: number;
  coverImageUrl?: string | null;
  status?: ProgramStatus;
  tags?: string[];
}

/**
 * Response from PATCH /api/programs/[id]
 */
export interface UpdateProgramResponse {
  program: Program;
}

/**
 * Response from DELETE /api/programs/[id]
 */
export interface DeleteProgramResponse {
  message: string;
}

/**
 * Request body for POST /api/programs/[id]/lessons
 */
export interface UpdateProgramLessonsRequest {
  lessons: string[];  // Array of lesson IDs in new order
}

/**
 * Response from POST /api/programs/[id]/lessons
 */
export interface UpdateProgramLessonsResponse {
  lessons: string[];
}

// ============================================================================
// Mapper Functions
// ============================================================================

/**
 * Converts a Firestore document to a client-side Program object
 *
 * @param id - Document ID from Firestore
 * @param doc - Firestore document data (snake_case)
 * @returns Program object with camelCase fields
 */
export function mapProgramFromFirestore(id: string, doc: ProgramDocument): Program {
  return {
    id,
    title: doc.title,
    description: doc.description,
    category: doc.category as Category,
    difficulty: doc.difficulty as Difficulty,
    durationDays: doc.duration_days,
    lessons: doc.lessons || [],
    coverImageUrl: doc.cover_image_url,
    status: doc.status as ProgramStatus,
    authorId: doc.author_id,
    tags: doc.tags || [],
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

/**
 * Converts a client-side Program object to Firestore document format
 *
 * @param program - Program object (camelCase)
 * @returns Firestore document data (snake_case)
 */
export function mapProgramToFirestore(program: Omit<Program, 'id'>): ProgramDocument {
  return {
    title: program.title,
    description: program.description,
    category: program.category,
    difficulty: program.difficulty,
    duration_days: program.durationDays,
    lessons: program.lessons || [],
    cover_image_url: program.coverImageUrl,
    status: program.status,
    author_id: program.authorId,
    tags: program.tags || [],
    created_at: program.createdAt,
    updated_at: program.updatedAt,
  };
}

/**
 * Type guard to check if a value is a valid Category
 */
export function isCategory(value: string): value is Category {
  return CATEGORIES.includes(value as Category);
}

/**
 * Type guard to check if a value is a valid Difficulty
 */
export function isDifficulty(value: string): value is Difficulty {
  return DIFFICULTIES.includes(value as Difficulty);
}

/**
 * Type guard to check if a value is a valid ProgramStatus
 */
export function isProgramStatus(value: string): value is ProgramStatus {
  return PROGRAM_STATUSES.includes(value as ProgramStatus);
}
