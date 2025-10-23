import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import {
  validateCreateLesson,
  validateLessonFilters,
  type CreateLessonInput,
  type LessonFiltersInput
} from '@/lib/validators/lesson';
import { mapLessonFromFirestore } from '@/types/lesson';
import type { LessonDocument } from '@/types/lesson';

/**
 * GET /api/lessons - List lessons with filters
 *
 * Query params:
 * - programId: string (optional) - Filter by program
 * - status: 'draft'|'uploading'|'processing'|'ready'|'failed' (optional)
 * - type: 'video'|'audio' (optional)
 * - search: string (optional) - Search in title
 * - limit: number (default 20, max 100)
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
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    });

    console.log('[GET /api/lessons] Filters:', filters);

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
    console.log('[GET /api/lessons] Found', snapshot.size, 'lessons');

    let lessons = snapshot.docs.map((doc) => {
      const data = doc.data() as LessonDocument;
      return mapLessonFromFirestore(doc.id, data);
    });

    // Client-side search filter (if needed)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      lessons = lessons.filter(lesson =>
        lesson.title.toLowerCase().includes(searchLower)
      );
    }

    return apiSuccess({
      lessons,
      total: lessons.length,
      limit: filters.limit,
      offset: filters.offset,
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

    const lessonData: LessonDocument = {
      title: validatedData.title,
      type: validatedData.type,
      program_id: validatedData.programId,
      order: validatedData.order || 0,
      duration_sec: null,
      tags: validatedData.tags || [],
      transcript: validatedData.transcript || null,

      // Upload & processing status
      status: 'draft', // Will become 'uploading' when file upload starts
      storage_path_original: null,
      renditions: undefined,
      audio_variants: undefined,

      // Metadata
      codec: null,
      size_bytes: null,
      mime_type: null,
      thumbnail_url: null,

      // Ownership & timestamps
      author_id: user.uid,
      created_at: now,
      updated_at: now,
    };

    await lessonRef.set(lessonData);
    console.log(`✅ Created lesson ${lessonRef.id} in program ${validatedData.programId}`);

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
