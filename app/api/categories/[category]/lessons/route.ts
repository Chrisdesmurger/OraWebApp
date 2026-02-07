/**
 * API route for getting lessons grouped by subcategory
 *
 * GET /api/categories/[category]/lessons - Get lessons grouped by subcategory
 *
 * This endpoint is optimized for the Android app to display
 * horizontal carousels of lessons organized by subcategory.
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import {
  mapLessonFromFirestore,
  type LessonDocument,
  type Lesson,
  type LessonCategory,
} from '@/types/lesson';
import {
  mapSubcategoryFromFirestore,
  type SubcategoryDocument,
  type Subcategory,
} from '@/types/subcategory';

/**
 * Response structure for grouped lessons
 */
interface SubcategoryWithLessons {
  subcategory: Subcategory | null; // null for "Autres" (uncategorized)
  lessons: Lesson[];
}

interface GroupedLessonsResponse {
  category: LessonCategory;
  groups: SubcategoryWithLessons[];
  totalLessons: number;
}

// Map frontend category to Firestore category
const CATEGORY_MAP: Record<string, LessonCategory> = {
  'yoga': 'yoga',
  'pilates': 'pilates',
  'meditation': 'meditation',
  'breathing': 'respiration',
  'respiration': 'respiration',
  'self_massage': 'auto-massage',
  'auto-massage': 'auto-massage',
  'self-massage': 'auto-massage',
};

/**
 * GET /api/categories/[category]/lessons
 *
 * Returns lessons grouped by subcategory for a given category.
 * Lessons without a subcategory are grouped in an "Autres" section at the end.
 *
 * Query parameters:
 * - status?: 'ready' | 'draft' | 'all' (default: 'ready' for published lessons)
 * - lang?: 'fr' | 'en' | 'es' (default: 'fr' - for ordering/filtering)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { category: rawCategory } = await params;

    // Map category to lesson category
    const category = CATEGORY_MAP[rawCategory.toLowerCase()];
    if (!category) {
      return apiError(
        `Invalid category: ${rawCategory}. Valid categories: yoga, pilates, meditation, breathing, self_massage`,
        400
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'ready';

    const supabase = createSupabaseServiceClient();

    console.log('[GET /api/categories/[category]/lessons] Fetching for category:', category, 'status:', statusFilter);

    // 1. Fetch all active subcategories for this category, ordered by display_order
    const { data: subcategoryRows, error: subcatError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('category', category)
      .eq('status', 'active')
      .order('display_order', { ascending: true });

    if (subcatError) {
      console.error('[GET /api/categories/[category]/lessons] Subcategories error:', subcatError);
      throw new Error(subcatError.message);
    }

    const subcategories: Subcategory[] = (subcategoryRows ?? []).map((row) =>
      mapSubcategoryFromFirestore(row.id, row as unknown as SubcategoryDocument)
    );

    console.log('[GET /api/categories/[category]/lessons] Found', subcategories.length, 'subcategories');

    // 2. Fetch all lessons for this category
    let lessonsQuery = supabase
      .from('lessons')
      .select('*')
      .eq('category', category);

    // Apply status filter (for Android app, usually 'ready')
    if (statusFilter !== 'all') {
      lessonsQuery = lessonsQuery.eq('status', statusFilter);
    }

    const { data: lessonRows, error: lessonsError } = await lessonsQuery;

    if (lessonsError) {
      console.error('[GET /api/categories/[category]/lessons] Lessons error:', lessonsError);
      throw new Error(lessonsError.message);
    }

    const allLessons: Lesson[] = [];
    (lessonRows ?? []).forEach((row) => {
      const lesson = mapLessonFromFirestore(row.id, row as unknown as LessonDocument);
      if (lesson) {
        allLessons.push(lesson);
      }
    });

    console.log('[GET /api/categories/[category]/lessons] Found', allLessons.length, 'lessons');

    // 3. Group lessons by subcategory
    const lessonsBySubcategory = new Map<string | null, Lesson[]>();

    // Initialize groups for each subcategory
    subcategories.forEach((sub) => {
      lessonsBySubcategory.set(sub.id, []);
    });
    lessonsBySubcategory.set(null, []); // For uncategorized lessons

    // Distribute lessons
    allLessons.forEach((lesson) => {
      const subcategoryId = lesson.subcategoryId || null;
      if (lessonsBySubcategory.has(subcategoryId)) {
        lessonsBySubcategory.get(subcategoryId)!.push(lesson);
      } else {
        // Subcategory doesn't exist (maybe deleted) - add to "Autres"
        lessonsBySubcategory.get(null)!.push(lesson);
      }
    });

    // 4. Build response with non-empty groups
    const groups: SubcategoryWithLessons[] = [];

    // Add subcategory groups (in display_order)
    subcategories.forEach((subcategory) => {
      const lessons = lessonsBySubcategory.get(subcategory.id) || [];
      if (lessons.length > 0) {
        // Sort lessons by order within each group
        lessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        groups.push({
          subcategory,
          lessons,
        });
      }
    });

    // Add "Autres" group at the end if there are uncategorized lessons
    const uncategorizedLessons = lessonsBySubcategory.get(null) || [];
    if (uncategorizedLessons.length > 0) {
      uncategorizedLessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      groups.push({
        subcategory: null, // Android will display this as "Autres"
        lessons: uncategorizedLessons,
      });
    }

    const response: GroupedLessonsResponse = {
      category,
      groups,
      totalLessons: allLessons.length,
    };

    console.log('[GET /api/categories/[category]/lessons] Returning', groups.length, 'groups with', allLessons.length, 'total lessons');
    return apiSuccess(response);
  } catch (error: unknown) {
    console.error('GET /api/categories/[category]/lessons error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch grouped lessons';
    return apiError(message, 500);
  }
}
