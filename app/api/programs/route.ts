import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { mapProgramFromFirestore, mapProgramToFirestore, type ProgramDocument, type Program } from '@/types/program';
import { safeValidateGetProgramsQuery } from '@/lib/validators/program';
import { logCreate } from '@/lib/audit/logger';

/**
 * GET /api/programs - List all programs
 *
 * Query parameters:
 * - category?: 'meditation' | 'yoga' | 'mindfulness' | 'wellness'
 * - status?: 'draft' | 'published' | 'archived'
 * - search?: string (searches in title and description)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      category: searchParams.get('category') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const validation = safeValidateGetProgramsQuery(queryParams);
    if (!validation.success) {
      return apiError(`Invalid query parameters: ${validation.error.message}`, 400);
    }

    const { category, status, search } = validation.data;

    const supabase = createSupabaseServiceClient();

    console.log('[GET /api/programs] Fetching programs for user role:', user.role, 'with filters:', { category, status, search });

    let query = supabase
      .from('programs')
      .select('*')
      .order('created_at', { ascending: false });

    // Teachers only see their own programs
    if (user.role === 'teacher') {
      query = query.eq('author_id', user.uid);
    }

    // Apply category filter
    if (category) {
      query = query.eq('category', category);
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    const { data: rows, error: queryError } = await query;

    if (queryError) {
      console.error('[GET /api/programs] Supabase query error:', queryError);
      return apiError('Failed to fetch programs', 500);
    }

    console.log('[GET /api/programs] Found', rows?.length ?? 0, 'programs');

    // Map Supabase rows to client-side Program objects
    let programs = (rows || []).map((row) => {
      const data = row as ProgramDocument & { id: string };
      return mapProgramFromFirestore(data.id, data as ProgramDocument);
    });

    // Apply search filter (client-side for now)
    if (search) {
      const searchLower = search.toLowerCase();
      programs = programs.filter((p) =>
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    console.log('[GET /api/programs] Returning', programs.length, 'programs');
    return apiSuccess({ programs });
  } catch (error: any) {
    console.error('GET /api/programs error:', error);
    return apiError(error.message || 'Failed to fetch programs', 500);
  }
}

/**
 * POST /api/programs - Create a new program
 *
 * Request body:
 * - title: string (3-100 chars)
 * - description: string (10-1000 chars)
 * - category: 'meditation' | 'yoga' | 'mindfulness' | 'wellness'
 * - difficulty: 'beginner' | 'intermediate' | 'advanced'
 * - durationDays: number (1-365)
 * - lessons?: string[] (optional, lesson IDs)
 * - tags?: string[] (optional, max 10)
 * - scheduledPublishAt?: string | null (ISO timestamp)
 * - scheduledArchiveAt?: string | null (ISO timestamp)
 * - autoPublishEnabled?: boolean
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();

    // Validate request body
    const { safeValidateCreateProgram } = await import('@/lib/validators/program');
    const validation = safeValidateCreateProgram(body);

    if (!validation.success) {
      const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return apiError(`Validation failed: ${errors}`, 400);
    }

    const {
      title,
      description,
      category,
      difficulty,
      durationDays,
      lessons = [],
      tags = [],
      coverImageUrl = null,
      scheduledPublishAt = null,
      scheduledArchiveAt = null,
      autoPublishEnabled = false,
    } = validation.data;

    const supabase = createSupabaseServiceClient();

    const now = new Date().toISOString();

    // Create document using mapper (handles i18n conversion)
    const programDocument: ProgramDocument = {
      ...mapProgramToFirestore(validation.data as any),
      cover_storage_path: null,
      status: 'draft',
      author_id: user.uid,
      created_at: now,
      updated_at: now,
    };

    const { data: created, error: insertError } = await supabase
      .from('programs')
      .insert(programDocument)
      .select()
      .single();

    if (insertError || !created) {
      console.error('[POST /api/programs] Supabase insert error:', insertError);
      return apiError('Failed to create program', 500);
    }

    // Return camelCase response
    const program = mapProgramFromFirestore(created.id, created as ProgramDocument);

    // Log audit event (don't await - fire and forget)
    logCreate({
      resourceType: 'program',
      resourceId: created.id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: programDocument,
      request,
    });

    console.log('[POST /api/programs] Created program:', program.id, 'with scheduling:', {
      scheduledPublishAt,
      scheduledArchiveAt,
      autoPublishEnabled,
    });
    return apiSuccess(program, 201);
  } catch (error: any) {
    console.error('POST /api/programs error:', error);
    return apiError(error.message || 'Failed to create program', 500);
  }
}
