import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Parse a Firebase-style storage path into Supabase bucket + relative path.
 *
 * Examples:
 *   "media/lessons/{id}/original/file.mp4" -> { bucket: "media-lessons", path: "{id}/original/file.mp4" }
 *   "media/programs/{id}/cover.jpg"        -> { bucket: "media-programs", path: "{id}/cover.jpg" }
 *   "media/users/{id}/avatar.png"          -> { bucket: "media-users",    path: "{id}/avatar.png" }
 */
export function parseStoragePath(firebasePath: string): { bucket: string; path: string } {
  const parts = firebasePath.replace(/^\/+/, '').split('/');
  if (parts[0] === 'media' && parts.length >= 3) {
    const type = parts[1]; // 'lessons', 'programs', 'users'
    const bucket = `media-${type}`;
    const path = parts.slice(2).join('/');
    return { bucket, path };
  }
  // Fallback: use first part as bucket
  return { bucket: parts[0] || 'media-lessons', path: parts.slice(1).join('/') };
}

/**
 * Upload file to Supabase Storage
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
    const supabase = createSupabaseServiceClient();
    const { bucket, path } = parseStoragePath(destinationPath);

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: metadata?.contentType || 'application/octet-stream',
      upsert: true,
      metadata: metadata?.customMetadata,
    });

    if (error) {
      throw error;
    }

    console.log(`File uploaded: ${destinationPath}`);
    return destinationPath;
  } catch (error: unknown) {
    console.error('Upload failed:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Get signed URL for file download
 */
export async function getSignedUrl(filePath: string, expiresInMinutes: number = 60): Promise<string> {
  try {
    const supabase = createSupabaseServiceClient();
    const { bucket, path } = parseStoragePath(filePath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInMinutes * 60);

    if (error || !data?.signedUrl) {
      throw error || new Error('No signed URL returned');
    }

    return data.signedUrl;
  } catch (error: unknown) {
    console.error('Failed to get signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    const { bucket, path } = parseStoragePath(filePath);

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw error;
    }

    console.log(`File deleted: ${filePath}`);
  } catch (error: unknown) {
    console.error('Delete failed:', error);
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
 * Get a signed upload URL for a lesson file.
 *
 * Supabase does not support Firebase-style resumable uploads, so this returns
 * a signed upload URL that the client can PUT the file to directly.
 */
export async function getResumableUploadUrl(
  lessonId: string,
  fileName: string,
  _mimeType: string
): Promise<string> {
  try {
    const supabase = createSupabaseServiceClient();
    const fullPath = getLessonOriginalPath(lessonId, fileName);
    const { bucket, path } = parseStoragePath(fullPath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !data?.signedUrl) {
      throw error || new Error('No signed upload URL returned');
    }

    console.log(`Generated signed upload URL for lesson ${lessonId}`);
    return data.signedUrl;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create signed upload URL:', {
      message,
      lessonId,
      fileName,
    });
    throw new Error(`Failed to create upload URL: ${message}`);
  }
}

/**
 * Delete all lesson media files
 */
export async function deleteLessonMedia(lessonId: string): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    const bucket = 'media-lessons';
    const prefix = `${lessonId}/`;

    // List all files under the lesson prefix
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(lessonId, { limit: 1000 });

    if (listError) {
      throw listError;
    }

    if (!files || files.length === 0) {
      console.log(`No media files found for lesson ${lessonId}`);
      return;
    }

    // Recursively collect all file paths (Supabase list returns immediate children,
    // so we need to handle nested folders)
    const allPaths = await collectAllFiles(supabase, bucket, prefix);

    if (allPaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove(allPaths);

      if (deleteError) {
        throw deleteError;
      }
    }

    console.log(`Deleted all media for lesson ${lessonId} (${allPaths.length} files)`);
  } catch (error: unknown) {
    console.error('Failed to delete lesson media:', error);
    throw new Error('Failed to delete lesson media');
  }
}

/**
 * Recursively collect all file paths under a given prefix in a Supabase Storage bucket.
 */
async function collectAllFiles(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  // Remove trailing slash for the list call's folder parameter
  const folder = prefix.replace(/\/+$/, '');

  const { data: items, error } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 1000 });

  if (error || !items) {
    return paths;
  }

  for (const item of items) {
    const itemPath = folder ? `${folder}/${item.name}` : item.name;

    if (item.id) {
      // It is a file (files have an id, folders do not)
      paths.push(itemPath);
    } else {
      // It is a folder -- recurse into it
      const nested = await collectAllFiles(supabase, bucket, `${itemPath}/`);
      paths.push(...nested);
    }
  }

  return paths;
}

/**
 * Check if file exists in storage
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const metadata = await getFileMetadata(filePath);
    return metadata !== null;
  } catch {
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
    const supabase = createSupabaseServiceClient();
    const { bucket, path } = parseStoragePath(filePath);

    // Supabase does not have a direct "get metadata" call for a single file.
    // We list the parent folder and find the file by name.
    const lastSlash = path.lastIndexOf('/');
    const folder = lastSlash >= 0 ? path.substring(0, lastSlash) : '';
    const fileName = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;

    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit: 1000, search: fileName });

    if (error || !files) {
      return null;
    }

    const file = files.find((f) => f.name === fileName);
    if (!file) {
      return null;
    }

    return {
      size: file.metadata?.size ?? 0,
      contentType: file.metadata?.mimetype || 'application/octet-stream',
      updated: file.updated_at || new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error('Failed to get file metadata:', error);
    return null;
  }
}
