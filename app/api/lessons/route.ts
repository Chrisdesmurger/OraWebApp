import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import {
  validateCreateLesson,
  validateLessonFilters,
  type CreateLessonInput,
  type LessonFiltersInput
} from '@/lib/validators/lesson';
import { mapLessonFromFirestore, mapLessonToFirestore } from '@/types/lesson';
import type { LessonDocument, Lesson } from '@/types/lesson';
import { logCreate } from '@/lib/audit/logger';

/**
 * GET /api/lessons - List lessons with filters
 *
 * Query params:
 * - programId: string (optional) - Filter by program
 * - status: 'draft'|'uploading'|'processing'|'ready'|'failed' (optional)
 * - type: 'video'|'audio' (optional)
 * - search: string (optional) - Search in title
 * - limit: number (default 100, max 500) - Increased from 20 to show all lessons (Issue #64)
 * - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);

    // Parse and validate filters
    const filters: LessonFiltersInput = validateLessonFilters({
      programId: searchParams.get('programId') || undefined,
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    });

    console.log('[GET /api/lessons] User:', user.uid, 'Role:', user.role);
    console.log('[GET /api/lessons] Filters:', JSON.stringify(filters));

    const firestore = getFirestore();
    let query = firestore.collection('lessons');

    // Apply filters
    if (filters.programId) {
      query = query.where('program_id', '==', filters.programId) as any;
    }

    if (filters.status) {
      query = query.where('status', '==', filters.status) as any;
    }

    if (filters.type) {
      query = query.where('type', '==', filters.type) as any;
    }

    // For teachers, only show their own lessons unless admin
    if (user.role === 'teacher') {
      query = query.where('author_id', '==', user.uid) as any;
      console.log('[GET /api/lessons] Filtering by author_id:', user.uid);
    }

    // Order by updated_at descending
    try {
      query = query.orderBy('updated_at', 'desc') as any;
    } catch (orderError) {
      console.warn('[GET /api/lessons] orderBy failed, trying without ordering');
    }

    // Apply limit and offset
    if (filters.offset && filters.offset > 0) {
      query = query.offset(filters.offset) as any;
    }
    query = query.limit(filters.limit) as any;

    const snapshot = await query.get();
    console.log('[GET /api/lessons] Found', snapshot.size, 'lessons in Firestore');

    // Map and filter invalid lessons
    let invalidCount = 0;
    const lessons: Lesson[] = [];

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data() as LessonDocument;
      const mapped = mapLessonFromFirestore(doc.id, data);

      if (mapped === null) {
        invalidCount++;
        console.warn(`[GET /api/lessons] Skipping invalid lesson ${doc.id} (${data.title || 'no title'})`);
      } else {
        lessons.push(mapped);
      }
    });

    if (invalidCount > 0) {
      console.warn(`[GET /api/lessons] Skipped ${invalidCount} invalid lessons`);
    }

    // Client-side search filter (if needed)
    let filteredLessons = lessons;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredLessons = lessons.filter(lesson => {
        const titleMatch =
          lesson.title.fr?.toLowerCase().includes(searchLower) ||
          lesson.title.en?.toLowerCase().includes(searchLower) ||
          lesson.title.es?.toLowerCase().includes(searchLower);
        return titleMatch;
      });
      console.log('[GET /api/lessons] After search filter:', filteredLessons.length, 'lessons');
    }

    console.log('[GET /api/lessons] Returning', filteredLessons.length, 'valid lessons');

    return apiSuccess({
      lessons: filteredLessons,
      total: filteredLessons.length,
      limit: filters.limit,
      offset: filters.offset,
      // Include debug info for admin
      _debug: user.role === 'admin' ? {
        totalInFirestore: snapshot.size,
        invalidSkipped: invalidCount,
        appliedFilters: filters,
      } : undefined,
    });
  } catch (error: any) {
    console.error('GET /api/lessons error:', error);
    return apiError(error.message || 'Failed to fetch lessons', 500);
  }
}

/**
 * POST /api/lessons - Create a new lesson
 *
 * Body:
 * - title: string (required)
 * - type: 'video'|'audio' (required)
 * - programId: string (required)
 * - order: number (optional, default 0)
 * - tags: string[] (optional)
 * - transcript: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();

    // Validate request body
    const validatedData: CreateLessonInput = validateCreateLesson(body);

    // Verify program exists and user has permission
    const firestore = getFirestore();
    const programDoc = await firestore.collection('programs').doc(validatedData.programId).get();

    if (!programDoc.exists) {
      return apiError('Program not found', 404);
    }

    const programData = programDoc.data();

    // Teachers can only add lessons to their own programs
    if (user.role === 'teacher' && programData?.author_id !== user.uid) {
      return apiError('You can only add lessons to your own programs', 403);
    }

    // Create new lesson document
    const lessonRef = firestore.collection('lessons').doc();
    const now = new Date().toISOString();

    // Map validated data to Firestore format (handles i18n conversion)
    const mappedData = mapLessonToFirestore(validatedData as Partial<Lesson>);

    const lessonData: LessonDocument = {
      ...mappedData,
      type: validatedData.type,
      program_id: validatedData.programId,
      order: validatedData.order || 0,
      duration_sec: null,
      tags: validatedData.tags || [],

      // Upload & processing status
      status: 'draft', // Will become 'uploading' when file upload starts
      storage_path_original: null,
      // Omit optional fields instead of setting to null/undefined

      // Metadata
      codec: null,
      size_bytes: null,
      mime_type: null,
      thumbnail_url: null,

      // Scheduling (nullable, defaults to null)
      scheduled_publish_at: null,
      scheduled_archive_at: null,
      auto_publish_enabled: false,

      // Ownership & timestamps
      author_id: user.uid,
      created_at: now,
      updated_at: now,
    } as LessonDocument;

    await lessonRef.set(lessonData);
    console.log(`[POST /api/lessons] Created lesson ${lessonRef.id} in program ${validatedData.programId}`);

    // Update program media_count (snake_case for Firestore)
    await firestore
      .collection('programs')
      .doc(validatedData.programId)
      .update({
        media_count: (programData?.media_count || 0) + 1,
        updated_at: now,
      });

    // Return mapped lesson
    const lesson = mapLessonFromFirestore(lessonRef.id, lessonData);

    // Log audit event (don't await - fire and forget)
    logCreate({
      resourceType: 'lesson',
      resourceId: lessonRef.id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: lessonData,
      request,
    });

    return apiSuccess({ lesson }, 201);
  } catch (error: any) {
    console.error('POST /api/lessons error:', error);

    // Return validation errors with details
    if (error.name === 'ZodError') {
      return apiError(`Validation failed: ${error.errors.map((e: any) => e.message).join(', ')}`, 400);
    }

    return apiError(error.message || 'Failed to create lesson', 500);
  }
}
