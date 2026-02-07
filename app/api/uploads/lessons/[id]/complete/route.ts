import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/uploads/lessons/[id]/complete - Mark upload as complete
 *
 * Called by the frontend after the file has been uploaded to Supabase Storage.
 * Sets lesson status to 'ready' directly (bypasses transcoding).
 * When transcoding is enabled later, this endpoint can trigger Cloud Run instead.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { id: lessonId } = await params;
    const supabase = createSupabaseServiceClient();

    // Verify lesson exists
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, status, storage_path_original, author_id, type')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return apiError('Lesson not found', 404);
    }

    // Teachers can only complete their own uploads
    if (user.role === 'teacher' && lesson.author_id !== user.uid) {
      return apiError('You can only complete uploads for your own lessons', 403);
    }

    // Verify lesson is in 'uploading' status
    if (lesson.status !== 'uploading') {
      return apiError(`Lesson is in '${lesson.status}' status, expected 'uploading'`, 400);
    }

    // Verify file exists in storage
    if (lesson.storage_path_original) {
      const parsed = parseStoragePath(lesson.storage_path_original);
      if (parsed) {
        const { data: files } = await supabase.storage
          .from(parsed.bucket)
          .list(parsed.folder, { limit: 1, search: parsed.fileName });

        if (!files || files.length === 0) {
          return apiError('File not found in storage. Upload may not have completed.', 400);
        }
      }
    }

    // Update lesson status to 'ready' (bypass transcoding)
    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (updateError) {
      console.error(`[Upload Complete] Failed to update lesson ${lessonId}:`, updateError);
      return apiError('Failed to update lesson status', 500);
    }

    console.log(`[Upload Complete] Lesson ${lessonId} marked as ready (no transcoding)`);

    return apiSuccess({ lessonId, status: 'ready' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/uploads/lessons/[id]/complete error:', error);
    return apiError(errorMessage || 'Failed to complete upload', 500);
  }
}

/**
 * Parse a storage path into bucket, folder, and fileName
 * e.g. "media/lessons/abc/original/video.mp4" → { bucket: "media-lessons", folder: "abc/original", fileName: "video.mp4" }
 */
function parseStoragePath(storagePath: string): { bucket: string; folder: string; fileName: string } | null {
  if (!storagePath) return null;

  let bucket = 'media-lessons';
  let relativePath = storagePath;

  if (storagePath.startsWith('media/lessons/')) {
    bucket = 'media-lessons';
    relativePath = storagePath.replace('media/lessons/', '');
  } else if (storagePath.startsWith('media/programs/')) {
    bucket = 'media-programs';
    relativePath = storagePath.replace('media/programs/', '');
  } else if (storagePath.startsWith('media/users/')) {
    bucket = 'media-users';
    relativePath = storagePath.replace('media/users/', '');
  }

  const lastSlash = relativePath.lastIndexOf('/');
  if (lastSlash === -1) return null;

  return {
    bucket,
    folder: relativePath.substring(0, lastSlash),
    fileName: relativePath.substring(lastSlash + 1),
  };
}
