/**
 * API route for managing lessons in a program
 *
 * POST /api/programs/[id]/lessons - Update lesson order
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { type ProgramDocument } from '@/types/program';
import { safeValidateUpdateProgramLessons } from '@/lib/validators/program';

/**
 * POST /api/programs/[id]/lessons - Update lesson order in program
 *
 * Request body:
 * - lessons: string[] (array of lesson IDs in desired order)
 *
 * This endpoint allows adding, removing, and reordering lessons in a program.
 * The lessons array will completely replace the existing lessons.
 *
 * Use cases:
 * - Add lessons: include new lesson IDs in the array
 * - Remove lessons: omit lesson IDs from the array
 * - Reorder lessons: change the order of lesson IDs in the array
 * - Clear all lessons: send empty array []
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id } = await params;

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();

    // Validate request body
    const validation = safeValidateUpdateProgramLessons(body);

    if (!validation.success) {
      const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return apiError(`Validation failed: ${errors}`, 400);
    }

    const { lessons } = validation.data;

    const supabase = createSupabaseServiceClient();

    // Fetch current program
    const { data: programRow, error: fetchError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !programRow) {
      return apiError('Program not found', 404);
    }

    const programData = programRow as ProgramDocument & { id: string };

    // Check permissions: admin can edit all, teacher can edit own
    if (user.role === 'teacher' && programData.author_id !== user.uid) {
      return apiError('You can only edit your own programs', 403);
    }

    // Verify all lesson IDs exist (optional but recommended)
    if (lessons.length > 0) {
      try {
        const { data: existingLessons, error: lessonError } = await supabase
          .from('lessons')
          .select('id')
          .in('id', lessons);

        if (lessonError) {
          console.warn('[POST /api/programs/[id]/lessons] Failed to verify lessons:', lessonError.message);
          // Continue anyway - lesson verification is optional
        } else if (existingLessons) {
          const existingIds = new Set(existingLessons.map((l) => l.id));
          const invalidLessons = lessons.filter((lessonId) => !existingIds.has(lessonId));

          if (invalidLessons.length > 0) {
            console.warn('[POST /api/programs/[id]/lessons] Invalid lesson IDs:', invalidLessons);
            return apiError(
              `Invalid lesson IDs: ${invalidLessons.join(', ')}`,
              400
            );
          }
        }
      } catch (lessonError: any) {
        console.warn('[POST /api/programs/[id]/lessons] Failed to verify lessons:', lessonError.message);
        // Continue anyway - lesson verification is optional
      }
    }

    // Update program with new lesson order
    const { error: updateError } = await supabase
      .from('programs')
      .update({
        lessons,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('[POST /api/programs/[id]/lessons] Supabase update error:', updateError);
      return apiError('Failed to update program lessons', 500);
    }

    console.log('[POST /api/programs/[id]/lessons] Updated lessons for program:', id, 'New count:', lessons.length);
    return apiSuccess({ lessons });
  } catch (error: any) {
    console.error('POST /api/programs/[id]/lessons error:', error);
    return apiError(error.message || 'Failed to update program lessons', 500);
  }
}
