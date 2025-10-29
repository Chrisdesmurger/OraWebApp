/**
 * API routes for individual program operations
 *
 * GET    /api/programs/[id] - Get program by ID with lesson details
 * PATCH  /api/programs/[id] - Update program
 * DELETE /api/programs/[id] - Delete program
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { mapProgramFromFirestore, type ProgramDocument } from '@/types/program';
import { safeValidateUpdateProgram } from '@/lib/validators/program';
import { logUpdate, logDelete, logStatusChange } from '@/lib/audit/logger';

/**
 * GET /api/programs/[id] - Get specific program with lesson details
 *
 * Returns the program and populated lesson objects
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id } = await params;

    const firestore = getFirestore();
    const programRef = firestore.collection('programs').doc(id);
    const programDoc = await programRef.get();

    if (!programDoc.exists) {
      return apiError('Program not found', 404);
    }

    const programData = programDoc.data() as ProgramDocument;

    // Check permissions: admin can view all, teacher can view own drafts
    if (programData.status === 'draft') {
      if (user.role === 'teacher' && programData.author_id !== user.uid) {
        return apiError('You can only view your own draft programs', 403);
      }
      if (!requireRole(user, ['admin', 'teacher'])) {
        return apiError('Insufficient permissions to view draft programs', 403);
      }
    }

    // Map to camelCase
    const program = mapProgramFromFirestore(id, programData);

    // Fetch lesson details if program has lessons
    let lessonDetails: any[] = [];
    if (program.lessons && program.lessons.length > 0) {
      try {
        const lessonDocs = await Promise.all(
          program.lessons.map((lessonId) =>
            firestore.collection('lessons').doc(lessonId).get()
          )
        );

        lessonDetails = lessonDocs
          .filter((doc) => doc.exists)
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

        console.log('[GET /api/programs/[id]] Fetched', lessonDetails.length, 'lesson details');
      } catch (lessonError: any) {
        console.warn('[GET /api/programs/[id]] Failed to fetch lesson details:', lessonError.message);
        // Continue without lesson details
      }
    }

    console.log('[GET /api/programs/[id]] Returning program:', program.id);
    return apiSuccess({ program, lessonDetails });
  } catch (error: any) {
    console.error('GET /api/programs/[id] error:', error);
    return apiError(error.message || 'Failed to fetch program', 500);
  }
}

/**
 * PATCH /api/programs/[id] - Update program
 *
 * Request body (all fields optional):
 * - title?: string (3-100 chars)
 * - description?: string (10-1000 chars)
 * - category?: 'meditation' | 'yoga' | 'mindfulness' | 'wellness'
 * - difficulty?: 'beginner' | 'intermediate' | 'advanced'
 * - durationDays?: number (1-365)
 * - coverImageUrl?: string | null
 * - status?: 'draft' | 'published' | 'archived'
 * - tags?: string[] (max 10)
 */
export async function PATCH(
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
    const validation = safeValidateUpdateProgram(body);

    if (!validation.success) {
      const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return apiError(`Validation failed: ${errors}`, 400);
    }

    const firestore = getFirestore();
    const programRef = firestore.collection('programs').doc(id);
    const programDoc = await programRef.get();

    if (!programDoc.exists) {
      return apiError('Program not found', 404);
    }

    const programData = programDoc.data() as ProgramDocument;

    // Check permissions: admin can edit all, teacher can edit own
    if (user.role === 'teacher' && programData.author_id !== user.uid) {
      return apiError('You can only edit your own programs', 403);
    }

    // Save before state for audit log
    const beforeState = { ...programData };

    // Build update object with snake_case fields
    const updateData: Partial<ProgramDocument> = {
      updated_at: new Date().toISOString(),
    };

    const { title, description, category, difficulty, durationDays, coverImageUrl, status, tags } = validation.data;

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (durationDays !== undefined) updateData.duration_days = durationDays;
    if (coverImageUrl !== undefined) updateData.cover_image_url = coverImageUrl;
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;

    await programRef.update(updateData);

    // Fetch updated program
    const updatedDoc = await programRef.get();
    const updatedData = updatedDoc.data() as ProgramDocument;
    const program = mapProgramFromFirestore(id, updatedData);

    // Log audit event (don't await - fire and forget)
    const isStatusChange = status !== undefined && status !== beforeState.status;

    if (isStatusChange) {
      logStatusChange({
        resourceType: 'program',
        resourceId: id,
        actorId: user.uid,
        actorEmail: user.email || 'unknown',
        before: { status: beforeState.status },
        after: { status: updatedData.status },
        request,
      });
    } else {
      logUpdate({
        resourceType: 'program',
        resourceId: id,
        actorId: user.uid,
        actorEmail: user.email || 'unknown',
        before: beforeState,
        after: updatedData,
        request,
      });
    }

    console.log('[PATCH /api/programs/[id]] Updated program:', program.id);
    return apiSuccess({ program });
  } catch (error: any) {
    console.error('PATCH /api/programs/[id] error:', error);
    return apiError(error.message || 'Failed to update program', 500);
  }
}

/**
 * DELETE /api/programs/[id] - Delete program
 *
 * Admins can delete any program, teachers can only delete their own
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id } = await params;

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const firestore = getFirestore();
    const programRef = firestore.collection('programs').doc(id);
    const programDoc = await programRef.get();

    if (!programDoc.exists) {
      return apiError('Program not found', 404);
    }

    const programData = programDoc.data() as ProgramDocument;

    // Check permissions: admin can delete all, teacher can delete own
    if (user.role === 'teacher' && programData.author_id !== user.uid) {
      return apiError('You can only delete your own programs', 403);
    }

    // Save state before deletion for audit log
    const beforeState = { ...programData };

    await programRef.delete();

    // Log audit event (don't await - fire and forget)
    logDelete({
      resourceType: 'program',
      resourceId: id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: beforeState,
      request,
    });

    console.log('[DELETE /api/programs/[id]] Deleted program:', id);
    return apiSuccess({ message: 'Program deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/programs/[id] error:', error);
    return apiError(error.message || 'Failed to delete program', 500);
  }
}
