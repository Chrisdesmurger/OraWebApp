import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { deleteLessonMedia } from '@/lib/storage';
import type { LessonDocument } from '@/types/lesson';
import {
  BulkOperationResponse,
  BulkDeleteLessonsRequest,
  isStringArray,
} from '@/types/bulk-operations';

/**
 * DELETE /api/lessons/bulk - Bulk delete lessons
 *
 * Request body:
 * - lessonIds: string[] (array of lesson IDs to delete)
 *
 * Authorization:
 * - Admins can delete any lessons
 * - Teachers can only delete their own lessons (checks author_id)
 *
 * Implementation:
 * - Uses Firestore batch operations (500 operation limit)
 * - Deletes media files from Cloud Storage for each lesson
 * - Updates program media_count for affected programs
 * - Continues processing even if some operations fail
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body: unknown = await request.json();

    // Type validation
    if (typeof body !== 'object' || body === null) {
      return apiError('Invalid request body', 400);
    }

    const { lessonIds } = body as Partial<BulkDeleteLessonsRequest>;

    // Validate input
    if (!isStringArray(lessonIds)) {
      return apiError('lessonIds must be a non-empty array of valid strings', 400);
    }

    const firestore = getFirestore();
    const errors: string[] = [];
    let deleted = 0;
    let failed = 0;

    // Track program media counts that need updating
    const programMediaCounts = new Map<string, number>();

    // Process in batches of 500 (Firestore limit)
    // Note: We need to fetch lesson data first, so we process in smaller chunks
    const batchSize = 100; // Smaller to account for media deletion overhead

    for (let i = 0; i < lessonIds.length; i += batchSize) {
      const batchIds = lessonIds.slice(i, i + batchSize);
      const batch = firestore.batch();
      let batchOperations = 0;

      for (const lessonId of batchIds) {
        try {
          const lessonRef = firestore.collection('lessons').doc(lessonId);
          const lessonDoc = await lessonRef.get();

          if (!lessonDoc.exists) {
            errors.push(`Lesson ${lessonId}: Not found`);
            failed++;
            continue;
          }

          const lessonData = lessonDoc.data() as LessonDocument;

          // Teachers can only delete their own lessons
          if (user.role === 'teacher' && lessonData.author_id !== user.uid) {
            errors.push(`Lesson ${lessonId}: Permission denied (not your lesson)`);
            failed++;
            continue;
          }

          // Delete media files from Cloud Storage
          try {
            await deleteLessonMedia(lessonId);
            console.log(`[DELETE /api/lessons/bulk] Deleted media for lesson ${lessonId}`);
          } catch (storageError: unknown) {
            const storageErrorMessage = storageError instanceof Error ? storageError.message : 'Unknown error';
            console.warn(`[DELETE /api/lessons/bulk] Failed to delete media for lesson ${lessonId}:`, storageErrorMessage);
            // Continue with Firestore deletion even if storage cleanup fails
            errors.push(`Lesson ${lessonId}: Storage cleanup failed - ${storageErrorMessage}`);
          }

          // Track program media count
          if (lessonData.program_id) {
            const currentCount = programMediaCounts.get(lessonData.program_id) || 0;
            programMediaCounts.set(lessonData.program_id, currentCount + 1);
          }

          // Add to batch
          batch.delete(lessonRef);
          batchOperations++;
          deleted++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Lesson ${lessonId}: ${errorMessage}`);
          failed++;
        }
      }

      // Commit batch if there are operations
      if (batchOperations > 0) {
        try {
          await batch.commit();
          console.log(`[DELETE /api/lessons/bulk] Committed batch with ${batchOperations} operations`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[DELETE /api/lessons/bulk] Batch commit failed:', errorMessage);
          errors.push(`Batch commit failed: ${errorMessage}`);
          // Mark all operations in this batch as failed
          failed += batchOperations;
          deleted -= batchOperations;
        }
      }
    }

    // Update program media counts
    if (programMediaCounts.size > 0) {
      console.log(`[DELETE /api/lessons/bulk] Updating media counts for ${programMediaCounts.size} programs`);

      const programBatch = firestore.batch();
      let programBatchOps = 0;

      for (const [programId, lessonsDeleted] of programMediaCounts.entries()) {
        try {
          const programRef = firestore.collection('programs').doc(programId);
          const programDoc = await programRef.get();

          if (programDoc.exists) {
            const programData = programDoc.data();
            const currentMediaCount = programData?.media_count || 0;
            const newMediaCount = Math.max(0, currentMediaCount - lessonsDeleted);

            programBatch.update(programRef, {
              media_count: newMediaCount,
              updated_at: new Date().toISOString(),
            });
            programBatchOps++;

            // Commit if we reach batch limit
            if (programBatchOps >= 500) {
              await programBatch.commit();
              console.log(`[DELETE /api/lessons/bulk] Committed program update batch`);
              programBatchOps = 0;
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`[DELETE /api/lessons/bulk] Failed to update program ${programId}:`, errorMessage);
          // Don't add to errors array - this is a non-critical operation
        }
      }

      // Commit remaining program updates
      if (programBatchOps > 0) {
        try {
          await programBatch.commit();
          console.log(`[DELETE /api/lessons/bulk] Committed final program update batch`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn('[DELETE /api/lessons/bulk] Failed to commit program updates:', errorMessage);
        }
      }
    }

    const response: BulkOperationResponse = {
      success: failed === 0,
      deleted,
      failed,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    console.log('[DELETE /api/lessons/bulk] Result:', response);
    return apiSuccess(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('DELETE /api/lessons/bulk error:', error);
    return apiError(errorMessage, 500);
  }
}
