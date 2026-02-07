import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { validateUpdateLesson, type UpdateLessonInput } from '@/lib/validators/lesson';
import { mapLessonFromFirestore, mapLessonToFirestore } from '@/types/lesson';
import type { LessonDocument, Lesson } from '@/types/lesson';
import { deleteLessonMedia } from '@/lib/storage';
import { logUpdate, logDelete } from '@/lib/audit/logger';

/**
 * GET /api/lessons/[id] - Get single lesson by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id: lessonId } = await params;

    const supabase = createSupabaseServiceClient();
    const { data: row, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error || !row) {
      return apiError('Lesson not found', 404);
    }

    const lessonData = row as unknown as LessonDocument;

    // Teachers can only view their own lessons
    if (user.role === 'teacher' && lessonData.author_id !== user.uid) {
      return apiError('You can only view your own lessons', 403);
    }

    const lesson = mapLessonFromFirestore(lessonId, lessonData);

    // Return error if lesson data is invalid (Issue #64: validation returns null)
    if (lesson === null) {
      console.error(`[GET /api/lessons/${lessonId}] Lesson has invalid data`);
      return apiError('Lesson data is corrupted or incomplete', 500);
    }

    return apiSuccess({ lesson });
  } catch (error: any) {
    console.error(`GET /api/lessons/[id] error:`, error);
    return apiError(error.message || 'Failed to fetch lesson', 500);
  }
}

/**
 * PATCH /api/lessons/[id] - Update lesson metadata
 *
 * Body:
 * - title: string | MultilingualText (optional)
 * - description: string | MultilingualText (optional)
 * - order: number (optional)
 * - tags: string[] (optional)
 * - transcript: string | MultilingualText (optional)
 * - programId: string (optional) - Move to different program
 * - yogaPoses: YogaPose[] (optional) - Yoga poses for yoga/pilates lessons (Issue #74)
 * - subcategoryId: string | null (optional) - Assign to a subcategory
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { id: lessonId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData: UpdateLessonInput = validateUpdateLesson(body);

    const supabase = createSupabaseServiceClient();

    // Fetch existing lesson
    const { data: existingRow, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (fetchError || !existingRow) {
      return apiError('Lesson not found', 404);
    }

    const lessonData = existingRow as unknown as LessonDocument;

    // Teachers can only edit their own lessons
    if (user.role === 'teacher' && lessonData.author_id !== user.uid) {
      return apiError('You can only edit your own lessons', 403);
    }

    // Save before state for audit log
    const beforeState = { ...lessonData };

    // If moving to a different program, verify permissions
    if (validatedData.programId && validatedData.programId !== lessonData.program_id) {
      const { data: newProgram, error: newProgramError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', validatedData.programId)
        .single();

      if (newProgramError || !newProgram) {
        return apiError('Target program not found', 404);
      }

      // Teachers can only move to their own programs
      if (user.role === 'teacher' && newProgram?.author_id !== user.uid) {
        return apiError('You can only move lessons to your own programs', 403);
      }

      // Update media counts - decrement old program
      if (lessonData.program_id) {
        const { data: oldProgram } = await supabase
          .from('programs')
          .select('media_count')
          .eq('id', lessonData.program_id)
          .single();

        if (oldProgram) {
          await supabase
            .from('programs')
            .update({
              media_count: Math.max(0, (oldProgram.media_count || 0) - 1),
              updated_at: new Date().toISOString(),
            })
            .eq('id', lessonData.program_id);
        }
      }

      // Update media counts - increment new program
      await supabase
        .from('programs')
        .update({
          media_count: (newProgram.media_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', validatedData.programId);
    }

    // Prepare update data
    const updateData: Partial<LessonDocument> = {
      ...mapLessonToFirestore(validatedData as Partial<Lesson>),
      updated_at: new Date().toISOString(),
    };

    // Remove undefined fields (Supabase ignores undefined but explicit is better)
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const { error: updateError } = await supabase
      .from('lessons')
      .update(updateData)
      .eq('id', lessonId);

    if (updateError) {
      console.error(`[PATCH /api/lessons/${lessonId}] Supabase update error:`, updateError);
      throw new Error(updateError.message);
    }

    console.log(`[PATCH /api/lessons/${lessonId}] Updated lesson`);

    // Fetch updated lesson
    const { data: updatedRow, error: refetchError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (refetchError || !updatedRow) {
      throw new Error('Failed to fetch updated lesson');
    }

    const updatedData = updatedRow as unknown as LessonDocument;
    const updatedLesson = mapLessonFromFirestore(lessonId, updatedData);

    // Return error if lesson data is invalid after update (Issue #64: validation returns null)
    if (updatedLesson === null) {
      console.error(`[PATCH /api/lessons/${lessonId}] Updated lesson has invalid data`);
      return apiError('Lesson data became corrupted after update', 500);
    }

    // Log audit event (don't await - fire and forget)
    logUpdate({
      resourceType: 'lesson',
      resourceId: lessonId,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      before: beforeState,
      after: updatedData,
      request,
    });

    return apiSuccess({ lesson: updatedLesson });
  } catch (error: any) {
    console.error(`PATCH /api/lessons/[id] error:`, error);

    if (error.name === 'ZodError') {
      return apiError(`Validation failed: ${error.errors.map((e: any) => e.message).join(', ')}`, 400);
    }

    return apiError(error.message || 'Failed to update lesson', 500);
  }
}

/**
 * DELETE /api/lessons/[id] - Delete lesson (admin only)
 *
 * Deletes the lesson document and all associated media files from Storage.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);

    // Only admins can delete lessons
    if (!requireRole(user, ['admin'])) {
      return apiError('Only admins can delete lessons', 403);
    }

    const { id: lessonId } = await params;
    const supabase = createSupabaseServiceClient();

    // Fetch lesson before deletion
    const { data: row, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (fetchError || !row) {
      return apiError('Lesson not found', 404);
    }

    const lessonData = row as unknown as LessonDocument;

    // Save state before deletion for audit log
    const beforeState = { ...lessonData };

    // Update program media count
    if (lessonData.program_id) {
      const { data: program } = await supabase
        .from('programs')
        .select('media_count')
        .eq('id', lessonData.program_id)
        .single();

      if (program) {
        await supabase
          .from('programs')
          .update({
            media_count: Math.max(0, (program.media_count || 0) - 1),
            updated_at: new Date().toISOString(),
          })
          .eq('id', lessonData.program_id);
      }
    }

    // Delete all media files from Storage
    try {
      await deleteLessonMedia(lessonId);
      console.log(`[DELETE /api/lessons/${lessonId}] Deleted media files`);
    } catch (storageError) {
      console.warn(`[DELETE /api/lessons/${lessonId}] Failed to delete media files:`, storageError);
      // Continue with database deletion even if storage cleanup fails
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (deleteError) {
      console.error(`[DELETE /api/lessons/${lessonId}] Supabase delete error:`, deleteError);
      throw new Error(deleteError.message);
    }

    console.log(`[DELETE /api/lessons/${lessonId}] Deleted lesson`);

    // Log audit event (don't await - fire and forget)
    logDelete({
      resourceType: 'lesson',
      resourceId: lessonId,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: beforeState,
      request,
    });

    return apiSuccess({ success: true, id: lessonId });
  } catch (error: any) {
    console.error(`DELETE /api/lessons/[id] error:`, error);
    return apiError(error.message || 'Failed to delete lesson', 500);
  }
}
