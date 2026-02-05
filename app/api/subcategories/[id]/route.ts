/**
 * API routes for individual subcategory operations
 *
 * GET    /api/subcategories/[id] - Get subcategory by ID
 * PATCH  /api/subcategories/[id] - Update subcategory
 * DELETE /api/subcategories/[id] - Delete subcategory
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import {
  mapSubcategoryFromFirestore,
  mapSubcategoryUpdateToFirestore,
  type SubcategoryDocument,
} from '@/types/subcategory';
import { validateUpdateSubcategory } from '@/lib/validators/lesson';
import { logUpdate, logDelete } from '@/lib/audit/logger';

/**
 * GET /api/subcategories/[id] - Get specific subcategory
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id } = await params;

    const supabase = createSupabaseServiceClient();
    const { data: row, error } = await supabase
      .from('subcategories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      return apiError('Subcategory not found', 404);
    }

    const subcategory = mapSubcategoryFromFirestore(id, row as unknown as SubcategoryDocument);

    console.log('[GET /api/subcategories/[id]] Returning subcategory:', subcategory.id);
    return apiSuccess({ subcategory });
  } catch (error: unknown) {
    console.error('GET /api/subcategories/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch subcategory';
    return apiError(message, 500);
  }
}

/**
 * PATCH /api/subcategories/[id] - Update subcategory
 *
 * Request body (all fields optional):
 * - name?: { fr?: string, en?: string, es?: string }
 * - description?: { fr?: string, en?: string, es?: string }
 * - slug?: string
 * - displayOrder?: number
 * - iconUrl?: string
 * - status?: 'active' | 'inactive'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id } = await params;

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions - admin only', 403);
    }

    const body = await request.json();

    // Validate request body
    const validation = validateUpdateSubcategory(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return apiError(`Validation failed: ${errors}`, 400);
    }

    const supabase = createSupabaseServiceClient();

    // Fetch existing subcategory
    const { data: existing, error: fetchError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return apiError('Subcategory not found', 404);
    }

    const subcategoryData = existing as unknown as SubcategoryDocument;

    // Save before state for audit log
    const beforeState = { ...subcategoryData };

    // Check for duplicate slug if slug is being updated
    if (validation.data.slug && validation.data.slug !== subcategoryData.slug) {
      const { data: existingSlug } = await supabase
        .from('subcategories')
        .select('id')
        .eq('category', subcategoryData.category)
        .eq('slug', validation.data.slug)
        .limit(1);

      if (existingSlug && existingSlug.length > 0) {
        return apiError(`A subcategory with slug "${validation.data.slug}" already exists in this category`, 409);
      }
    }

    // Convert to database format
    const updateData = {
      ...mapSubcategoryUpdateToFirestore(validation.data),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('subcategories')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('[PATCH /api/subcategories/[id]] Update error:', updateError);
      return apiError('Failed to update subcategory', 500);
    }

    // Fetch updated subcategory
    const { data: updated, error: refetchError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('id', id)
      .single();

    if (refetchError || !updated) {
      return apiError('Failed to fetch updated subcategory', 500);
    }

    const updatedData = updated as unknown as SubcategoryDocument;
    const subcategory = mapSubcategoryFromFirestore(id, updatedData);

    // Log audit event
    logUpdate({
      resourceType: 'subcategory',
      resourceId: id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      before: beforeState,
      after: updatedData,
      request,
    });

    console.log('[PATCH /api/subcategories/[id]] Updated subcategory:', subcategory.id);
    return apiSuccess({ subcategory });
  } catch (error: unknown) {
    console.error('PATCH /api/subcategories/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update subcategory';
    return apiError(message, 500);
  }
}

/**
 * DELETE /api/subcategories/[id] - Delete subcategory
 *
 * Admin only. Cannot delete if lessons are assigned to this subcategory.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id } = await params;

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions - admin only', 403);
    }

    const supabase = createSupabaseServiceClient();

    // Fetch existing subcategory
    const { data: existing, error: fetchError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return apiError('Subcategory not found', 404);
    }

    const subcategoryData = existing as unknown as SubcategoryDocument;

    // Check if any lessons are assigned to this subcategory
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('subcategory_id', id)
      .limit(1);

    if (lessons && lessons.length > 0) {
      return apiError(
        'Cannot delete subcategory with assigned lessons. Please reassign or remove lessons first.',
        409
      );
    }

    // Save state before deletion for audit log
    const beforeState = { ...subcategoryData };

    const { error: deleteError } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/subcategories/[id]] Delete error:', deleteError);
      return apiError('Failed to delete subcategory', 500);
    }

    // Log audit event
    logDelete({
      resourceType: 'subcategory',
      resourceId: id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: beforeState,
      request,
    });

    console.log('[DELETE /api/subcategories/[id]] Deleted subcategory:', id);
    return apiSuccess({ message: 'Subcategory deleted successfully' });
  } catch (error: unknown) {
    console.error('DELETE /api/subcategories/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete subcategory';
    return apiError(message, 500);
  }
}
