import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { uploadFile, isValidFileType, isValidFileSize, getFileExtension } from '@/lib/storage';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/upload - Upload a file to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadType = formData.get('type') as string; // 'program', 'lesson', 'user'
    const linkedTo = formData.get('linkedTo') as string; // programId, lessonId, userId

    if (!file) {
      return apiError('No file provided', 400);
    }

    if (!uploadType || !linkedTo) {
      return apiError('Upload type and linkedTo are required', 400);
    }

    // Validate file type
    const allowedTypes =
      uploadType === 'user' ? ['image/*'] : ['image/*', 'video/*', 'audio/*'];

    if (!isValidFileType(file.type, allowedTypes)) {
      return apiError(`Invalid file type: ${file.type}`, 400);
    }

    // Validate file size
    const maxSizeMB = uploadType === 'user' ? 5 : uploadType === 'program' ? 100 : 500;

    if (!isValidFileSize(file.size, maxSizeMB)) {
      return apiError(`File too large. Max size: ${maxSizeMB}MB`, 400);
    }

    // Generate destination path (Firebase-style, parsed by storage module)
    const ext = getFileExtension(file.type);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
    const destinationPath = `media/${uploadType}s/${linkedTo}/${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const storagePath = await uploadFile(buffer, destinationPath, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        linkedTo,
        uploadType,
      },
    });

    // Save media metadata to Supabase
    const supabase = createSupabaseServiceClient();
    const mediaRecord = {
      type: file.type.split('/')[0], // 'image', 'video', 'audio'
      storage_path: storagePath,
      mime_type: file.type,
      size: file.size,
      uploaded_by: user.uid,
      linked_to: linkedTo,
      upload_type: uploadType,
      created_at: new Date().toISOString(),
    };

    const { data: insertedMedia, error: insertError } = await supabase
      .from('media')
      .insert(mediaRecord)
      .select('id')
      .single();

    if (insertError) {
      console.error('POST /api/upload: Failed to save media metadata:', insertError);
      // File was uploaded successfully; return the storage path even if metadata insert fails
    }

    return apiSuccess(
      {
        id: insertedMedia?.id || storagePath,
        storagePath,
        type: file.type.split('/')[0],
        mimeType: file.type,
        size: file.size,
      },
      201
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/upload error:', error);
    return apiError(errorMessage || 'Failed to upload file', 500);
  }
}
