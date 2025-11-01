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
  cover_storage_path: string | null;  // Firebase Storage path for deletion
  status: string;  // ProgramStatus enum
  author_id: string;  // Firebase Auth UID
  tags: string[];
  created_at: string;  // ISO timestamp
  updated_at: string;  // ISO timestamp

  // Scheduling fields (Issue #22)
  scheduled_publish_at: string | null;  // ISO timestamp
  scheduled_archive_at: string | null;  // ISO timestamp
  auto_publish_enabled: boolean;
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
  coverStoragePath: string | null;  // Firebase Storage path for deletion
  status: ProgramStatus;
  authorId: string;
  tags: string[];
  createdAt: string;  // ISO timestamp
  updatedAt: string;  // ISO timestamp

  // Scheduling fields (Issue #22)
  scheduledPublishAt: string | null;  // ISO timestamp
  scheduledArchiveAt: string | null;  // ISO timestamp
  autoPublishEnabled: boolean;
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
  scheduledPublishAt?: string | null;  // ISO timestamp
  scheduledArchiveAt?: string | null;  // ISO timestamp
  autoPublishEnabled?: boolean;
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
  scheduledPublishAt?: string | null;  // ISO timestamp
  scheduledArchiveAt?: string | null;  // ISO timestamp
  autoPublishEnabled?: boolean;
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
 * Maps snake_case Firestore fields to camelCase frontend fields.
 * Use this when reading programs from Firestore API.
 *
 * @param id - Document ID from Firestore
 * @param doc - Firestore document data (snake_case)
 * @returns Program object with camelCase fields
 *
 * @example
 * const snapshot = await firestore.collection('programs').doc('prog-123').get();
 * const program = mapProgramFromFirestore(snapshot.id, snapshot.data());
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
    coverStoragePath: doc.cover_storage_path || null,
    status: doc.status as ProgramStatus,
    authorId: doc.author_id,
    tags: doc.tags || [],
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    scheduledPublishAt: doc.scheduled_publish_at || null,
    scheduledArchiveAt: doc.scheduled_archive_at || null,
    autoPublishEnabled: doc.auto_publish_enabled || false,
  };
}

/**
 * Converts a client-side Program object to Firestore document format
 *
 * Maps camelCase frontend fields to snake_case Firestore fields.
 * Use this when writing programs to Firestore API.
 *
 * @param program - Program object (camelCase, without id)
 * @returns Firestore document data (snake_case)
 *
 * @example
 * const programData = mapProgramToFirestore({
 *   title: '7-Day Meditation',
 *   durationDays: 7,
 *   // ... other fields
 * });
 * await firestore.collection('programs').add(programData);
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
    cover_storage_path: program.coverStoragePath || null,
    status: program.status,
    author_id: program.authorId,
    tags: program.tags || [],
    created_at: program.createdAt,
    updated_at: program.updatedAt,
    scheduled_publish_at: program.scheduledPublishAt || null,
    scheduled_archive_at: program.scheduledArchiveAt || null,
    auto_publish_enabled: program.autoPublishEnabled || false,
  };
}

/**
 * Type guard to check if a value is a valid Category
 *
 * @param value - String to check
 * @returns True if value is a valid Category enum value
 */
export function isCategory(value: string): value is Category {
  return CATEGORIES.includes(value as Category);
}

/**
 * Type guard to check if a value is a valid Difficulty
 *
 * @param value - String to check
 * @returns True if value is a valid Difficulty enum value
 */
export function isDifficulty(value: string): value is Difficulty {
  return DIFFICULTIES.includes(value as Difficulty);
}

/**
 * Type guard to check if a value is a valid ProgramStatus
 *
 * @param value - String to check
 * @returns True if value is a valid ProgramStatus enum value
 */
export function isProgramStatus(value: string): value is ProgramStatus {
  return PROGRAM_STATUSES.includes(value as ProgramStatus);
}
