import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
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

    const firestore = getFirestore();

    console.log('[GET /api/subcategories] Fetching subcategories with filters:', { category, status, includeCounts });

    let query = firestore.collection('subcategories').orderBy('display_order', 'asc');

    if (category) {
      query = query.where('category', '==', category) as typeof query;
    }

    if (status) {
      query = query.where('status', '==', status) as typeof query;
    }

    const snapshot = await query.get();

    // Map to frontend format
    let subcategories = snapshot.docs.map((doc) => {
      const data = doc.data() as SubcategoryDocument;
      return mapSubcategoryFromFirestore(doc.id, data);
    });

    // Optionally include lessons count
    if (includeCounts) {
      const lessonsSnapshot = await firestore.collection('lessons').get();
      const lessonsBySubcategory = new Map<string, number>();

      lessonsSnapshot.docs.forEach((doc) => {
        const subcategoryId = doc.data().subcategory_id;
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

    const firestore = getFirestore();
    const subcategoryRef = firestore.collection('subcategories').doc();

    const now = new Date().toISOString();

    // Convert to Firestore format
    const subcategoryDocument = {
      ...mapSubcategoryToFirestore(validation.data, user.uid),
      created_at: now,
      updated_at: now,
    };

    // Check for duplicate slug in same category
    const existingSlug = await firestore
      .collection('subcategories')
      .where('category', '==', subcategoryDocument.category)
      .where('slug', '==', subcategoryDocument.slug)
      .get();

    if (!existingSlug.empty) {
      return apiError(`A subcategory with slug "${subcategoryDocument.slug}" already exists in this category`, 409);
    }

    await subcategoryRef.set(subcategoryDocument);

    // Return camelCase response
    const subcategory = mapSubcategoryFromFirestore(subcategoryRef.id, subcategoryDocument as SubcategoryDocument);

    // Log audit event
    logCreate({
      resourceType: 'subcategory',
      resourceId: subcategoryRef.id,
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
