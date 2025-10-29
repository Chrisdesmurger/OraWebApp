import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { mapProgramFromFirestore, type ProgramDocument } from '@/types/program';
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

    const firestore = getFirestore();

    console.log('[GET /api/programs] Fetching programs for user role:', user.role, 'with filters:', { category, status, search });

    let snapshot;
    try {
      let query = firestore.collection('programs').orderBy('created_at', 'desc');

      // Teachers only see their own programs
      if (user.role === 'teacher') {
        query = query.where('author_id', '==', user.uid) as any;
      }

      // Apply category filter
      if (category) {
        query = query.where('category', '==', category) as any;
      }

      // Apply status filter
      if (status) {
        query = query.where('status', '==', status) as any;
      }

      snapshot = await query.get();
      console.log('[GET /api/programs] With orderBy - Found', snapshot.size, 'programs');
    } catch (orderError: any) {
      console.warn('[GET /api/programs] orderBy failed, trying without:', orderError.message);
      // Fallback: fetch without ordering
      let query = firestore.collection('programs');

      if (user.role === 'teacher') {
        query = query.where('author_id', '==', user.uid) as any;
      }

      if (category) {
        query = query.where('category', '==', category) as any;
      }

      if (status) {
        query = query.where('status', '==', status) as any;
      }

      snapshot = await query.get();
      console.log('[GET /api/programs] Without orderBy - Found', snapshot.size, 'programs');
    }

    // Map Firestore documents to client-side Program objects
    let programs = snapshot.docs.map((doc) => {
      const data = doc.data() as ProgramDocument;
      return mapProgramFromFirestore(doc.id, data);
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

    const { title, description, category, difficulty, durationDays, lessons = [], tags = [], coverImageUrl = null } = validation.data;

    const firestore = getFirestore();
    const programRef = firestore.collection('programs').doc();

    const now = new Date().toISOString();

    // Create Firestore document with snake_case fields
    const programDocument: ProgramDocument = {
      title,
      description,
      category,
      difficulty,
      duration_days: durationDays,
      lessons,
      cover_image_url: coverImageUrl,
      cover_storage_path: null,
      status: 'draft',
      author_id: user.uid,
      tags,
      created_at: now,
      updated_at: now,
    };

    await programRef.set(programDocument);

    // Return camelCase response
    const program = mapProgramFromFirestore(programRef.id, programDocument);

    // Log audit event (don't await - fire and forget)
    logCreate({
      resourceType: 'program',
      resourceId: programRef.id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: programDocument,
      request,
    });

    console.log('[POST /api/programs] Created program:', program.id);
    return apiSuccess(program, 201);
  } catch (error: any) {
    console.error('POST /api/programs error:', error);
    return apiError(error.message || 'Failed to create program', 500);
  }
}

