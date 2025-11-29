/**
 * API routes for lesson preview image management
 *
 * POST   /api/lessons/[id]/preview-image - Upload preview image
 * DELETE /api/lessons/[id]/preview-image - Delete preview image
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore, getStorage } from '@/lib/firebase/admin';
import type { LessonDocument } from '@/types/lesson';

/**
 * POST /api/lessons/[id]/preview-image - Upload lesson preview image
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id: lessonId } = await params;

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const firestore = getFirestore();
    const lessonRef = firestore.collection('lessons').doc(lessonId);
    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return apiError('Lesson not found', 404);
    }

    const lessonData = lessonDoc.data() as LessonDocument;

    if (user.role === 'teacher' && lessonData.author_id !== user.uid) {
      return apiError('You can only upload preview images for your own lessons', 403);
    }

    const formData = await request.formData();
    const file = formData.get('preview') as File;

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

    // Delete old preview image if exists
    if (lessonData.preview_storage_path) {
      try {
        const storage = getStorage();
        const bucket = storage.bucket();
        const oldFile = bucket.file(lessonData.preview_storage_path);
        await oldFile.delete();
      } catch (deleteError: any) {
        console.warn('[POST /api/lessons/[id]/preview-image] Failed to delete old preview:', deleteError.message);
      }
    }

    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const storagePath = `lessons/${lessonId}/preview_${timestamp}.${fileExtension}`;

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

    await lessonRef.update({
      preview_image_url: publicUrl,
      preview_storage_path: storagePath,
      updated_at: new Date().toISOString(),
    });

    return apiSuccess({ previewImageUrl: publicUrl, storagePath });
  } catch (error: any) {
    console.error('[POST /api/lessons/[id]/preview-image] Error:', error);
    return apiError(error.message || 'Failed to upload preview image', 500);
  }
}

/**
 * DELETE /api/lessons/[id]/preview-image - Delete lesson preview image
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id: lessonId } = await params;

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const firestore = getFirestore();
    const lessonRef = firestore.collection('lessons').doc(lessonId);
    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return apiError('Lesson not found', 404);
    }

    const lessonData = lessonDoc.data() as LessonDocument;

    if (user.role === 'teacher' && lessonData.author_id !== user.uid) {
      return apiError('You can only delete preview images for your own lessons', 403);
    }

    if (lessonData.preview_storage_path) {
      try {
        const storage = getStorage();
        const bucket = storage.bucket();
        const file = bucket.file(lessonData.preview_storage_path);
        await file.delete();
      } catch (deleteError: any) {
        console.warn('[DELETE /api/lessons/[id]/preview-image] Failed to delete file:', deleteError.message);
      }
    }

    await lessonRef.update({
      preview_image_url: null,
      preview_storage_path: null,
      updated_at: new Date().toISOString(),
    });

    return apiSuccess({ message: 'Preview image deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/lessons/[id]/preview-image] Error:', error);
    return apiError(error.message || 'Failed to delete preview image', 500);
  }
}
