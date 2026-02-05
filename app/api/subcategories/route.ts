import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import {
  mapSubcategoryFromFirestore,
  mapSubcategoryToFirestore,
  type SubcategoryDocument,
  type SubcategoryWithCount,
} from '@/types/subcategory';
import { validateCreateSubcategory } from '@/lib/validators/lesson';
import { logCreate } from '@/lib/audit/logger';

/**
 * GET /api/subcategories - List all subcategories
 *
 * Query parameters:
 * - category?: string (filter by category: yoga, pilates, meditation, breathing, self_massage)
 * - status?: 'active' | 'inactive' (filter by status)
 * - includeCounts?: boolean (include lessons count per subcategory)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const includeCounts = searchParams.get('includeCounts') === 'true';

    const supabase = createSupabaseServiceClient();

    console.log('[GET /api/subcategories] Fetching subcategories with filters:', { category, status, includeCounts });

    let query = supabase
      .from('subcategories')
      .select('*')
      .order('display_order', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[GET /api/subcategories] Supabase error:', error);
      return apiError('Failed to fetch subcategories', 500);
    }

    // Map to frontend format
    let subcategories = (rows || []).map((row) => {
      return mapSubcategoryFromFirestore(row.id, row as unknown as SubcategoryDocument);
    });

    // Optionally include lessons count
    if (includeCounts) {
      const { data: lessonRows, error: lessonsError } = await supabase
        .from('lessons')
        .select('subcategory_id');

      if (lessonsError) {
        console.error('[GET /api/subcategories] Error fetching lesson counts:', lessonsError);
      }

      const lessonsBySubcategory = new Map<string, number>();

      (lessonRows || []).forEach((row) => {
        const subcategoryId = row.subcategory_id;
        if (subcategoryId) {
          lessonsBySubcategory.set(
            subcategoryId,
            (lessonsBySubcategory.get(subcategoryId) || 0) + 1
          );
        }
      });

      const subcategoriesWithCounts: SubcategoryWithCount[] = subcategories.map((sub) => ({
        ...sub,
        lessonsCount: lessonsBySubcategory.get(sub.id) || 0,
      }));

      console.log('[GET /api/subcategories] Returning', subcategoriesWithCounts.length, 'subcategories with counts');
      return apiSuccess({ subcategories: subcategoriesWithCounts });
    }

    console.log('[GET /api/subcategories] Returning', subcategories.length, 'subcategories');
    return apiSuccess({ subcategories });
  } catch (error: unknown) {
    console.error('GET /api/subcategories error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch subcategories';
    return apiError(message, 500);
  }
}

/**
 * POST /api/subcategories - Create a new subcategory
 *
 * Request body:
 * - category: string (yoga, pilates, meditation, breathing, self_massage)
 * - name: { fr: string, en?: string, es?: string }
 * - description?: { fr?: string, en?: string, es?: string }
 * - slug?: string (auto-generated from name.fr if not provided)
 * - displayOrder?: number (default 0)
 * - iconUrl?: string
 * - status?: 'active' | 'inactive' (default 'active')
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions - admin only', 403);
    }

    const body = await request.json();

    // Validate request body
    const validation = validateCreateSubcategory(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return apiError(`Validation failed: ${errors}`, 400);
    }

    const supabase = createSupabaseServiceClient();

    const now = new Date().toISOString();

    // Convert to database format
    const subcategoryDocument = {
      ...mapSubcategoryToFirestore(validation.data, user.uid),
      created_at: now,
      updated_at: now,
    };

    // Check for duplicate slug in same category
    const { data: existingSlug, error: slugError } = await supabase
      .from('subcategories')
      .select('id')
      .eq('category', subcategoryDocument.category)
      .eq('slug', subcategoryDocument.slug)
      .limit(1);

    if (slugError) {
      console.error('[POST /api/subcategories] Slug check error:', slugError);
      return apiError('Failed to check for duplicate slug', 500);
    }

    if (existingSlug && existingSlug.length > 0) {
      return apiError(`A subcategory with slug "${subcategoryDocument.slug}" already exists in this category`, 409);
    }

    const { data: created, error: insertError } = await supabase
      .from('subcategories')
      .insert(subcategoryDocument)
      .select()
      .single();

    if (insertError || !created) {
      console.error('[POST /api/subcategories] Insert error:', insertError);
      return apiError('Failed to create subcategory', 500);
    }

    // Return camelCase response
    const subcategory = mapSubcategoryFromFirestore(created.id, created as unknown as SubcategoryDocument);

    // Log audit event
    logCreate({
      resourceType: 'subcategory',
      resourceId: created.id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: subcategoryDocument,
      request,
    });

    console.log('[POST /api/subcategories] Created subcategory:', subcategory.id, subcategory.name.fr);
    return apiSuccess(subcategory, 201);
  } catch (error: unknown) {
    console.error('POST /api/subcategories error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create subcategory';
    return apiError(message, 500);
  }
}
