/**
 * API routes for program cover image management
 *
 * POST   /api/programs/[id]/cover - Upload cover image
 * DELETE /api/programs/[id]/cover - Delete cover image
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { uploadFile, getSignedUrl, deleteFile } from '@/lib/storage';
import type { ProgramDocument } from '@/types/program';

/**
 * POST /api/programs/[id]/cover - Upload program cover image
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id: programId } = await params;

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const supabase = createSupabaseServiceClient();

    const { data: programRow, error: fetchError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (fetchError || !programRow) {
      return apiError('Program not found', 404);
    }

    const programData = programRow as ProgramDocument & { id: string };

    if (user.role === 'teacher' && programData.author_id !== user.uid) {
      return apiError('You can only upload covers for your own programs', 403);
    }

    const formData = await request.formData();
    const file = formData.get('cover') as File;

    if (!file) {
      return apiError('No file provided', 400);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return apiError('Invalid file type. Only JPG, PNG, and WebP are allowed', 400);
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return apiError('File too large. Maximum size is 5MB', 400);
    }

    // Delete old cover if exists
    if (programData.cover_storage_path) {
      try {
        await deleteFile(programData.cover_storage_path);
      } catch (deleteError: any) {
        console.warn('[POST /api/programs/[id]/cover] Failed to delete old cover:', deleteError.message);
      }
    }

    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const storagePath = `media/programs/${programId}/cover_${timestamp}.${fileExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadFile(buffer, storagePath, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
      },
    });

    // Get a signed URL for the uploaded cover image
    const publicUrl = await getSignedUrl(storagePath, 60 * 24 * 365); // 1 year expiry

    const { error: updateError } = await supabase
      .from('programs')
      .update({
        cover_image_url: publicUrl,
        cover_storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId);

    if (updateError) {
      console.error('[POST /api/programs/[id]/cover] Supabase update error:', updateError);
      return apiError('Failed to update program cover', 500);
    }

    return apiSuccess({ coverUrl: publicUrl, storagePath });
  } catch (error: any) {
    console.error('[POST /api/programs/[id]/cover] Error:', error);
    return apiError(error.message || 'Failed to upload cover image', 500);
  }
}

/**
 * DELETE /api/programs/[id]/cover - Delete program cover image
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id: programId } = await params;

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const supabase = createSupabaseServiceClient();

    const { data: programRow, error: fetchError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (fetchError || !programRow) {
      return apiError('Program not found', 404);
    }

    const programData = programRow as ProgramDocument & { id: string };

    if (user.role === 'teacher' && programData.author_id !== user.uid) {
      return apiError('You can only delete covers for your own programs', 403);
    }

    if (programData.cover_storage_path) {
      try {
        await deleteFile(programData.cover_storage_path);
      } catch (deleteError: any) {
        console.warn('[DELETE /api/programs/[id]/cover] Failed to delete file:', deleteError.message);
      }
    }

    const { error: updateError } = await supabase
      .from('programs')
      .update({
        cover_image_url: null,
        cover_storage_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId);

    if (updateError) {
      console.error('[DELETE /api/programs/[id]/cover] Supabase update error:', updateError);
      return apiError('Failed to update program cover', 500);
    }

    return apiSuccess({ message: 'Cover image deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/programs/[id]/cover] Error:', error);
    return apiError(error.message || 'Failed to delete cover image', 500);
  }
}
