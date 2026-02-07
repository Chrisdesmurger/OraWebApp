import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getResumableUploadUrl, getLessonOriginalPath } from '@/lib/storage';
import { validateFileUpload, validateFileType } from '@/lib/validators/lesson';
import { ZodError } from 'zod';

/**
 * POST /api/uploads/lessons/[id]/init - Initialize resumable upload
 *
 * Body:
 * - fileName: string (required) - Original file name
 * - fileSize: number (required) - File size in bytes
 * - mimeType: string (required) - MIME type
 * - lessonType: 'video'|'audio' (required) - For validation
 *
 * Returns:
 * - uploadUrl: string - Signed upload URL
 * - lessonId: string - Lesson ID
 * - storagePath: string - Storage path where file will be uploaded
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
    const body = await request.json();

    // Validate file upload data
    const validatedData = validateFileUpload({
      fileName: body.fileName,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      lessonType: body.lessonType,
    });

    console.log('[Upload Init] Validating upload for lesson:', lessonId, validatedData);

    // Verify lesson exists and user has permission
    const supabase = createSupabaseServiceClient();
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lessonData) {
      return apiError('Lesson not found', 404);
    }

    // Verify lesson type matches file type
    if (lessonData.type !== validatedData.lessonType) {
      return apiError(`File type mismatch: lesson is ${lessonData.type} but file is ${validatedData.lessonType}`, 400);
    }

    // Teachers can only upload to their own lessons
    if (user.role === 'teacher' && lessonData.author_id !== user.uid) {
      return apiError('You can only upload files to your own lessons', 403);
    }

    // Validate MIME type matches lesson type
    if (!validateFileType(validatedData.mimeType, lessonData.type)) {
      return apiError(
        `Invalid file type for ${lessonData.type} lesson. Supported types: ${
          lessonData.type === 'video'
            ? 'mp4, webm'
            : 'm4a, mp3, wav'
        }`,
        400
      );
    }

    // Generate signed upload URL
    const uploadUrl = await getResumableUploadUrl(
      lessonId,
      validatedData.fileName,
      validatedData.mimeType
    );

    const storagePath = getLessonOriginalPath(lessonId, validatedData.fileName);

    // Update lesson status to 'uploading' and store file metadata
    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        status: 'uploading',
        storage_path_original: storagePath,
        mime_type: validatedData.mimeType,
        size_bytes: validatedData.fileSize,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (updateError) {
      console.error(`[Upload Init] Failed to update lesson ${lessonId}:`, updateError);
      return apiError('Failed to update lesson status', 500);
    }

    console.log(`Generated upload URL for lesson ${lessonId}`);

    return apiSuccess({
      uploadUrl,
      lessonId,
      storagePath,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`POST /api/uploads/lessons/[id]/init error:`, error);

    if (error instanceof ZodError) {
      return apiError(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`, 400);
    }

    return apiError(errorMessage || 'Failed to initialize upload', 500);
  }
}
