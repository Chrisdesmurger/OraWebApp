import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
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

    const supabase = createSupabaseServiceClient();
    let query = supabase.from('lessons').select('*', { count: 'exact' });

    // Apply filters
    if (filters.programId) {
      query = query.eq('program_id', filters.programId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    // For teachers, only show their own lessons unless admin
    if (user.role === 'teacher') {
      query = query.eq('author_id', user.uid);
      console.log('[GET /api/lessons] Filtering by author_id:', user.uid);
    }

    // Order by updated_at descending
    query = query.order('updated_at', { ascending: false });

    // Apply limit and offset
    const from = filters.offset || 0;
    const to = from + filters.limit - 1;
    query = query.range(from, to);

    const { data: rows, error, count } = await query;

    if (error) {
      console.error('[GET /api/lessons] Supabase error:', error);
      throw new Error(error.message);
    }

    console.log('[GET /api/lessons] Found', rows?.length ?? 0, 'lessons in Supabase');

    // Map and filter invalid lessons
    let invalidCount = 0;
    const lessons: Lesson[] = [];

    (rows ?? []).forEach((row) => {
      const mapped = mapLessonFromFirestore(row.id, row as unknown as LessonDocument);

      if (mapped === null) {
        invalidCount++;
        console.warn(`[GET /api/lessons] Skipping invalid lesson ${row.id} (${row.title_fr || 'no title'})`);
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
        totalInSupabase: count ?? rows?.length ?? 0,
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

    const supabase = createSupabaseServiceClient();
    let programData: Record<string, any> | undefined;

    // If programId is provided, verify program exists and user has permission
    if (validatedData.programId) {
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', validatedData.programId)
        .single();

      if (programError || !program) {
        return apiError('Program not found', 404);
      }

      programData = program;

      // Teachers can only add lessons to their own programs
      if (user.role === 'teacher' && programData?.author_id !== user.uid) {
        return apiError('You can only add lessons to your own programs', 403);
      }
    }

    const now = new Date().toISOString();

    // Map validated data to Firestore format (handles i18n conversion)
    const mappedData = mapLessonToFirestore(validatedData as Partial<Lesson>);

    const lessonData: LessonDocument = {
      ...mappedData,
      type: validatedData.type,
      program_id: validatedData.programId || null,
      order: validatedData.order || 0,
      duration_sec: null,
      tags: validatedData.tags || [],

      // Upload & processing status
      status: 'draft', // Will become 'uploading' when file upload starts
      storage_path_original: null,

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

    // Insert into Supabase and get the generated id
    const { data: insertedRow, error: insertError } = await supabase
      .from('lessons')
      .insert(lessonData)
      .select('id')
      .single();

    if (insertError || !insertedRow) {
      console.error('[POST /api/lessons] Supabase insert error:', insertError);
      throw new Error(insertError?.message || 'Failed to insert lesson');
    }

    const lessonId = insertedRow.id;
    console.log(`[POST /api/lessons] Created lesson ${lessonId}${validatedData.programId ? ` in program ${validatedData.programId}` : ' (standalone)'}`);

    // Update program media_count only if programId is provided
    if (validatedData.programId && programData) {
      await supabase
        .from('programs')
        .update({
          media_count: (programData.media_count || 0) + 1,
          updated_at: now,
        })
        .eq('id', validatedData.programId);
    }

    // Return mapped lesson
    const lesson = mapLessonFromFirestore(lessonId, lessonData);

    // Log audit event (don't await - fire and forget)
    logCreate({
      resourceType: 'lesson',
      resourceId: lessonId,
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
