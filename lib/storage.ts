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
    'audio/wav': 'wav',
    'application/pdf': 'pdf',
  };

  return extensions[mimeType] || 'bin';
}
