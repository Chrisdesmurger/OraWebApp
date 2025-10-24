import { getStorage } from '@/lib/firebase/admin';

/**
 * Upload file to Firebase Cloud Storage
 */
export async function uploadFile(
  file: Buffer,
  destinationPath: string,
  metadata?: {
    contentType?: string;
    customMetadata?: Record<string, string>;
  }
): Promise<string> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const fileRef = bucket.file(destinationPath);

    await fileRef.save(file, {
      metadata: {
        contentType: metadata?.contentType || 'application/octet-stream',
        metadata: metadata?.customMetadata,
      },
    });

    console.log(`✅ File uploaded: ${destinationPath}`);
    return destinationPath;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Get signed URL for file download
 */
export async function getSignedUrl(filePath: string, expiresInMinutes: number = 60): Promise<string> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  } catch (error) {
    console.error('❌ Failed to get signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    await file.delete();
    console.log(`✅ File deleted: ${filePath}`);
  } catch (error) {
    console.error('❌ Delete failed:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Validate file type
 */
export function isValidFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      const prefix = type.split('/')[0];
      return mimeType.startsWith(prefix + '/');
    }
    return mimeType === type;
  });
}

/**
 * Validate file size
 */
export function isValidFileSize(sizeInBytes: number, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return sizeInBytes <= maxSizeBytes;
}

/**
 * Get file extension from MIME type
 */
export function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/wav': 'wav',
    'application/pdf': 'pdf',
  };

  return extensions[mimeType] || 'bin';
}

/**
 * Lesson Storage Helpers
 */

/**
 * Get storage path for lesson original file
 */
export function getLessonOriginalPath(lessonId: string, fileName: string): string {
  return `media/lessons/${lessonId}/original/${fileName}`;
}

/**
 * Get storage path for video rendition
 */
export function getVideoRenditionPath(lessonId: string, quality: 'high' | 'medium' | 'low'): string {
  return `media/lessons/${lessonId}/video/${quality}.mp4`;
}

/**
 * Get storage path for audio variant
 */
export function getAudioVariantPath(lessonId: string, quality: 'high' | 'medium' | 'low'): string {
  return `media/lessons/${lessonId}/audio/${quality}.m4a`;
}

/**
 * Get storage path for lesson thumbnail
 */
export function getLessonThumbnailPath(lessonId: string): string {
  return `media/lessons/${lessonId}/thumb.jpg`;
}

/**
 * Get resumable upload URL for lesson
 */
export async function getResumableUploadUrl(
  lessonId: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const path = getLessonOriginalPath(lessonId, fileName);
    const file = bucket.file(path);

    const [url] = await file.createResumableUpload({
      metadata: {
        contentType: mimeType,
        metadata: {
          lessonId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ Generated resumable upload URL for lesson ${lessonId}`);
    return url;
  } catch (error: any) {
    console.error('❌ Failed to create resumable upload URL:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack,
    });
    throw new Error(`Failed to create upload URL: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete all lesson media files
 */
export async function deleteLessonMedia(lessonId: string): Promise<void> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const prefix = `media/lessons/${lessonId}/`;

    await bucket.deleteFiles({ prefix });
    console.log(`✅ Deleted all media for lesson ${lessonId}`);
  } catch (error) {
    console.error('❌ Failed to delete lesson media:', error);
    throw new Error('Failed to delete lesson media');
  }
}

/**
 * Check if file exists in storage
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error('❌ Failed to check file existence:', error);
    return false;
  }
}

/**
 * Get file metadata from storage
 */
export async function getFileMetadata(filePath: string): Promise<{
  size: number;
  contentType: string;
  updated: string;
} | null> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    const [metadata] = await file.getMetadata();

    return {
      size: typeof metadata.size === 'string' ? parseInt(metadata.size, 10) : (metadata.size || 0),
      contentType: metadata.contentType || 'application/octet-stream',
      updated: metadata.updated || new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Failed to get file metadata:', error);
    return null;
  }
}
