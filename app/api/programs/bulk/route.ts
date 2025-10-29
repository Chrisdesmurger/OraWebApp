import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { isProgramStatus, type ProgramStatus } from '@/types/program';

/**
 * Bulk operation response format
 */
interface BulkOperationResponse {
  success: boolean;
  deleted?: number;
  updated?: number;
  failed: number;
  errors?: string[];
}

/**
 * DELETE /api/programs/bulk - Bulk delete programs
 *
 * Request body:
 * - programIds: string[] (array of program IDs to delete)
 *
 * Authorization:
 * - Admins can delete any programs
 * - Teachers can only delete their own programs (checks author_id)
 *
 * Respects Firestore batch limit of 500 operations
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const { programIds } = body;

    // Validate input
    if (!programIds || !Array.isArray(programIds) || programIds.length === 0) {
      return apiError('programIds must be a non-empty array', 400);
    }

    if (programIds.some((id: any) => typeof id !== 'string' || !id.trim())) {
      return apiError('All programIds must be valid strings', 400);
    }

    const firestore = getFirestore();
    const errors: string[] = [];
    let deleted = 0;
    let failed = 0;

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    for (let i = 0; i < programIds.length; i += batchSize) {
      const batchIds = programIds.slice(i, i + batchSize);
      const batch = firestore.batch();
      let batchOperations = 0;

      for (const programId of batchIds) {
        try {
          const programRef = firestore.collection('programs').doc(programId);
          const programDoc = await programRef.get();

          if (!programDoc.exists) {
            errors.push(`Program ${programId}: Not found`);
            failed++;
            continue;
          }

          const programData = programDoc.data();

          // Teachers can only delete their own programs
          if (user.role === 'teacher' && programData?.author_id !== user.uid) {
            errors.push(`Program ${programId}: Permission denied (not your program)`);
            failed++;
            continue;
          }

          // Add to batch
          batch.delete(programRef);
          batchOperations++;
          deleted++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Program ${programId}: ${errorMessage}`);
          failed++;
        }
      }

      // Commit batch if there are operations
      if (batchOperations > 0) {
        try {
          await batch.commit();
          console.log(`[DELETE /api/programs/bulk] Committed batch with ${batchOperations} operations`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[DELETE /api/programs/bulk] Batch commit failed:', errorMessage);
          errors.push(`Batch commit failed: ${errorMessage}`);
          // Mark all operations in this batch as failed
          failed += batchOperations;
          deleted -= batchOperations;
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

    console.log('[DELETE /api/programs/bulk] Result:', response);
    return apiSuccess(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('DELETE /api/programs/bulk error:', error);
    return apiError(errorMessage, 500);
  }
}

/**
 * PATCH /api/programs/bulk - Bulk update program status
 *
 * Request body:
 * - programIds: string[] (array of program IDs to update)
 * - status: 'draft' | 'published' | 'archived' (new status)
 *
 * Authorization:
 * - Admins can update any programs
 * - Teachers can only update their own programs (checks author_id)
 *
 * Respects Firestore batch limit of 500 operations
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const { programIds, status } = body;

    // Validate input
    if (!programIds || !Array.isArray(programIds) || programIds.length === 0) {
      return apiError('programIds must be a non-empty array', 400);
    }

    if (programIds.some((id: any) => typeof id !== 'string' || !id.trim())) {
      return apiError('All programIds must be valid strings', 400);
    }

    if (!status || !isProgramStatus(status)) {
      return apiError('status must be one of: draft, published, archived', 400);
    }

    const firestore = getFirestore();
    const errors: string[] = [];
    let updated = 0;
    let failed = 0;

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    for (let i = 0; i < programIds.length; i += batchSize) {
      const batchIds = programIds.slice(i, i + batchSize);
      const batch = firestore.batch();
      let batchOperations = 0;

      for (const programId of batchIds) {
        try {
          const programRef = firestore.collection('programs').doc(programId);
          const programDoc = await programRef.get();

          if (!programDoc.exists) {
            errors.push(`Program ${programId}: Not found`);
            failed++;
            continue;
          }

          const programData = programDoc.data();

          // Teachers can only update their own programs
          if (user.role === 'teacher' && programData?.author_id !== user.uid) {
            errors.push(`Program ${programId}: Permission denied (not your program)`);
            failed++;
            continue;
          }

          // Add to batch (use snake_case for Firestore)
          batch.update(programRef, {
            status,
            updated_at: new Date().toISOString(),
          });
          batchOperations++;
          updated++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Program ${programId}: ${errorMessage}`);
          failed++;
        }
      }

      // Commit batch if there are operations
      if (batchOperations > 0) {
        try {
          await batch.commit();
          console.log(`[PATCH /api/programs/bulk] Committed batch with ${batchOperations} operations`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[PATCH /api/programs/bulk] Batch commit failed:', errorMessage);
          errors.push(`Batch commit failed: ${errorMessage}`);
          // Mark all operations in this batch as failed
          failed += batchOperations;
          updated -= batchOperations;
        }
      }
    }

    const response: BulkOperationResponse = {
      success: failed === 0,
      updated,
      failed,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    console.log('[PATCH /api/programs/bulk] Result:', response);
    return apiSuccess(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('PATCH /api/programs/bulk error:', error);
    return apiError(errorMessage, 500);
  }
}
