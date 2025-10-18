import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { uploadFile, isValidFileType, isValidFileSize, getFileExtension } from '@/lib/storage';
import { getFirestore } from '@/lib/firebase/admin';

/**
 * POST /api/upload - Upload a file to Cloud Storage
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

    // Generate destination path
    const ext = getFileExtension(file.type);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
    const destinationPath = `media/${uploadType}s/${linkedTo}/${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloud Storage
    const storagePath = await uploadFile(buffer, destinationPath, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        linkedTo,
        uploadType,
      },
    });

    // Save media metadata to Firestore
    const firestore = getFirestore();
    const mediaRef = firestore.collection('media').doc();

    await mediaRef.set({
      type: file.type.split('/')[0], // 'image', 'video', 'audio'
      storagePath,
      mimeType: file.type,
      size: file.size,
      uploadedBy: user.uid,
      linkedTo,
      uploadType,
      createdAt: new Date().toISOString(),
    });

    return apiSuccess(
      {
        id: mediaRef.id,
        storagePath,
        type: file.type.split('/')[0],
        mimeType: file.type,
        size: file.size,
      },
      201
    );
  } catch (error: any) {
    console.error('POST /api/upload error:', error);
    return apiError(error.message || 'Failed to upload file', 500);
  }
}
