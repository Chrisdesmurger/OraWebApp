/**
 * API routes for program cover image management
 *
 * POST   /api/programs/[id]/cover - Upload cover image
 * DELETE /api/programs/[id]/cover - Delete cover image
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore, getStorage } from '@/lib/firebase/admin';
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

    const firestore = getFirestore();
    const programRef = firestore.collection('programs').doc(programId);
    const programDoc = await programRef.get();

    if (!programDoc.exists) {
      return apiError('Program not found', 404);
    }

    const programData = programDoc.data() as ProgramDocument;

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
        const storage = getStorage();
        const bucket = storage.bucket();
        const oldFile = bucket.file(programData.cover_storage_path);
        await oldFile.delete();
      } catch (deleteError: any) {
        console.warn('[POST /api/programs/[id]/cover] Failed to delete old cover:', deleteError.message);
      }
    }

    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const storagePath = `programs/${programId}/cover_${timestamp}.${fileExtension}`;

    const storage = getStorage();
    const bucket = storage.bucket();
    const fileUpload = bucket.file(storagePath);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fileUpload.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: user.uid,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
        },
      },
    });

    await fileUpload.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    await programRef.update({
      cover_image_url: publicUrl,
      cover_storage_path: storagePath,
      updated_at: new Date().toISOString(),
    });

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

    const firestore = getFirestore();
    const programRef = firestore.collection('programs').doc(programId);
    const programDoc = await programRef.get();

    if (!programDoc.exists) {
      return apiError('Program not found', 404);
    }

    const programData = programDoc.data() as ProgramDocument;

    if (user.role === 'teacher' && programData.author_id !== user.uid) {
      return apiError('You can only delete covers for your own programs', 403);
    }

    if (programData.cover_storage_path) {
      try {
        const storage = getStorage();
        const bucket = storage.bucket();
        const file = bucket.file(programData.cover_storage_path);
        await file.delete();
      } catch (deleteError: any) {
        console.warn('[DELETE /api/programs/[id]/cover] Failed to delete file:', deleteError.message);
      }
    }

    await programRef.update({
      cover_image_url: null,
      cover_storage_path: null,
      updated_at: new Date().toISOString(),
    });

    return apiSuccess({ message: 'Cover image deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/programs/[id]/cover] Error:', error);
    return apiError(error.message || 'Failed to delete cover image', 500);
  }
}
