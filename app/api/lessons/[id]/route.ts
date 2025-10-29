import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { validateUpdateLesson, type UpdateLessonInput } from '@/lib/validators/lesson';
import { mapLessonFromFirestore, mapLessonToFirestore } from '@/types/lesson';
import type { LessonDocument } from '@/types/lesson';
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

    const firestore = getFirestore();
    const lessonDoc = await firestore.collection('lessons').doc(lessonId).get();

    if (!lessonDoc.exists) {
      return apiError('Lesson not found', 404);
    }

    const lessonData = lessonDoc.data() as LessonDocument;

    // Teachers can only view their own lessons
    if (user.role === 'teacher' && lessonData.author_id !== user.uid) {
      return apiError('You can only view your own lessons', 403);
    }

    const lesson = mapLessonFromFirestore(lessonId, lessonData);

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
 * - title: string (optional)
 * - order: number (optional)
 * - tags: string[] (optional)
 * - transcript: string (optional)
 * - programId: string (optional) - Move to different program
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

    const firestore = getFirestore();
    const lessonRef = firestore.collection('lessons').doc(lessonId);
    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return apiError('Lesson not found', 404);
    }

    const lessonData = lessonDoc.data() as LessonDocument;

    // Teachers can only edit their own lessons
    if (user.role === 'teacher' && lessonData.author_id !== user.uid) {
      return apiError('You can only edit your own lessons', 403);
    }

    // Save before state for audit log
    const beforeState = { ...lessonData };

    // If moving to a different program, verify permissions
    if (validatedData.programId && validatedData.programId !== lessonData.program_id) {
      const newProgramDoc = await firestore.collection('programs').doc(validatedData.programId).get();

      if (!newProgramDoc.exists) {
        return apiError('Target program not found', 404);
      }

      const newProgramData = newProgramDoc.data();

      // Teachers can only move to their own programs
      if (user.role === 'teacher' && newProgramData?.author_id !== user.uid) {
        return apiError('You can only move lessons to your own programs', 403);
      }

      // Update media counts
      const oldProgramRef = firestore.collection('programs').doc(lessonData.program_id);
      const oldProgramDoc = await oldProgramRef.get();

      if (oldProgramDoc.exists) {
        const oldProgramData = oldProgramDoc.data();
        await oldProgramRef.update({
          media_count: Math.max(0, (oldProgramData?.media_count || 0) - 1),
          updated_at: new Date().toISOString(),
        });
      }

      await firestore.collection('programs').doc(validatedData.programId).update({
        media_count: (newProgramData?.media_count || 0) + 1,
        updated_at: new Date().toISOString(),
      });
    }

    // Prepare update data
    const updateData: Partial<LessonDocument> = {
      ...mapLessonToFirestore({
        title: validatedData.title,
        description: validatedData.description,
        order: validatedData.order,
        tags: validatedData.tags,
        transcript: validatedData.transcript,
        programId: validatedData.programId,
      }),
      updated_at: new Date().toISOString(),
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    await lessonRef.update(updateData);
    console.log(`✅ Updated lesson ${lessonId}`);

    // Fetch updated lesson
    const updatedDoc = await lessonRef.get();
    const updatedData = updatedDoc.data() as LessonDocument;
    const updatedLesson = mapLessonFromFirestore(lessonId, updatedData);

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
    const firestore = getFirestore();
    const lessonRef = firestore.collection('lessons').doc(lessonId);
    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return apiError('Lesson not found', 404);
    }

    const lessonData = lessonDoc.data() as LessonDocument;

    // Save state before deletion for audit log
    const beforeState = { ...lessonData };

    // Update program media count
    if (lessonData.program_id) {
      const programRef = firestore.collection('programs').doc(lessonData.program_id);
      const programDoc = await programRef.get();

      if (programDoc.exists) {
        const programData = programDoc.data();
        await programRef.update({
          media_count: Math.max(0, (programData?.media_count || 0) - 1),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Delete all media files from Storage
    try {
      await deleteLessonMedia(lessonId);
      console.log(`✅ Deleted media files for lesson ${lessonId}`);
    } catch (storageError) {
      console.warn(`⚠️ Failed to delete media files for lesson ${lessonId}:`, storageError);
      // Continue with Firestore deletion even if storage cleanup fails
    }

    // Delete Firestore document
    await lessonRef.delete();
    console.log(`✅ Deleted lesson ${lessonId}`);

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
