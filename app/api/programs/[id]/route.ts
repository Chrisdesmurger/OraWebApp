/**
 * API routes for individual program operations
 *
 * GET    /api/programs/[id] - Get program by ID with lesson details
 * PATCH  /api/programs/[id] - Update program
 * DELETE /api/programs/[id] - Delete program
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { mapProgramFromFirestore, mapProgramToFirestore, type ProgramDocument, type Program } from '@/types/program';
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

    const supabase = createSupabaseServiceClient();

    const { data: programRow, error: fetchError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !programRow) {
      return apiError('Program not found', 404);
    }

    const programData = programRow as ProgramDocument & { id: string };

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
    const program = mapProgramFromFirestore(id, programData as ProgramDocument);

    // Fetch lesson details if program has lessons
    let lessonDetails: any[] = [];
    if (program.lessons && program.lessons.length > 0) {
      try {
        const { data: lessonRows, error: lessonError } = await supabase
          .from('lessons')
          .select('*')
          .in('id', program.lessons);

        if (lessonError) {
          console.warn('[GET /api/programs/[id]] Failed to fetch lesson details:', lessonError.message);
        } else if (lessonRows) {
          // Preserve the lesson order from the program's lessons array
          const lessonMap = new Map(lessonRows.map((row) => [row.id, row]));
          lessonDetails = program.lessons
            .map((lessonId) => lessonMap.get(lessonId))
            .filter(Boolean) as any[];

          console.log('[GET /api/programs/[id]] Fetched', lessonDetails.length, 'lesson details');
        }
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
 * - scheduledPublishAt?: string | null (ISO timestamp)
 * - scheduledArchiveAt?: string | null (ISO timestamp)
 * - autoPublishEnabled?: boolean
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

    // Save before state for audit log
    const beforeState = { ...programData };

    // Build update object with snake_case fields using mapper
    const mappedData = mapProgramToFirestore(validation.data as any);

    // Remove undefined values
    const updateData: Partial<ProgramDocument> = Object.fromEntries(
      Object.entries({
        ...mappedData,
        updated_at: new Date().toISOString(),
      }).filter(([_, value]) => value !== undefined)
    ) as Partial<ProgramDocument>;

    const { error: updateError } = await supabase
      .from('programs')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('[PATCH /api/programs/[id]] Supabase update error:', updateError);
      return apiError('Failed to update program', 500);
    }

    // Fetch updated program
    const { data: updatedRow, error: refetchError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();

    if (refetchError || !updatedRow) {
      return apiError('Failed to fetch updated program', 500);
    }

    const updatedData = updatedRow as ProgramDocument & { id: string };
    const program = mapProgramFromFirestore(id, updatedData as ProgramDocument);

    // Log audit event (don't await - fire and forget)
    const isStatusChange = validation.data.status !== undefined && validation.data.status !== beforeState.status;

    // Check if scheduling fields actually changed (compare values, not just presence)
    const schedulingFieldsChanged =
      (validation.data.scheduledPublishAt !== undefined && validation.data.scheduledPublishAt !== beforeState.scheduled_publish_at) ||
      (validation.data.scheduledArchiveAt !== undefined && validation.data.scheduledArchiveAt !== beforeState.scheduled_archive_at) ||
      (validation.data.autoPublishEnabled !== undefined && validation.data.autoPublishEnabled !== beforeState.auto_publish_enabled);

    // Log status changes
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
    }

    // ALWAYS log scheduling changes separately when they occur (independent of status)
    if (schedulingFieldsChanged) {
      logUpdate({
        resourceType: 'program',
        resourceId: id,
        actorId: user.uid,
        actorEmail: user.email || 'unknown',
        before: {
          scheduled_publish_at: beforeState.scheduled_publish_at,
          scheduled_archive_at: beforeState.scheduled_archive_at,
          auto_publish_enabled: beforeState.auto_publish_enabled,
        },
        after: {
          scheduled_publish_at: updatedData.scheduled_publish_at,
          scheduled_archive_at: updatedData.scheduled_archive_at,
          auto_publish_enabled: updatedData.auto_publish_enabled,
        },
        request,
      });
    }

    // Log other field changes (only if not status/scheduling)
    if (!isStatusChange && !schedulingFieldsChanged) {
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

    console.log('[PATCH /api/programs/[id]] Updated program:', program.id, 'with scheduling:', {
      scheduledPublishAt: updateData.scheduled_publish_at,
      scheduledArchiveAt: updateData.scheduled_archive_at,
      autoPublishEnabled: updateData.auto_publish_enabled,
    });
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

    const supabase = createSupabaseServiceClient();

    // Fetch program to check ownership and save state for audit
    const { data: programRow, error: fetchError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !programRow) {
      return apiError('Program not found', 404);
    }

    const programData = programRow as ProgramDocument & { id: string };

    // Check permissions: admin can delete all, teacher can delete own
    if (user.role === 'teacher' && programData.author_id !== user.uid) {
      return apiError('You can only delete your own programs', 403);
    }

    // Save state before deletion for audit log
    const beforeState = { ...programData };

    const { error: deleteError } = await supabase
      .from('programs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/programs/[id]] Supabase delete error:', deleteError);
      return apiError('Failed to delete program', 500);
    }

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
