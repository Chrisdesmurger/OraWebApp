import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/migrate-content - Migrate legacy content to lessons
 *
 * ADMIN ONLY endpoint to migrate old content documents to new lessons format.
 *
 * Body:
 * - dryRun: boolean (optional, default false) - Preview without writing
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Admin access required', 403);
    }

    const body = await request.json();
    const dryRun = body.dryRun === true;

    console.log(`[POST /api/admin/migrate-content] Starting migration (dryRun=${dryRun})`);

    const supabase = createSupabaseServiceClient();

    // Step 1: Fetch all content documents
    const { data: contentRows, error: contentError } = await supabase
      .from('content')
      .select('*');

    if (contentError) {
      console.error('[migrate-content] Error fetching content:', contentError);
      return apiError('Failed to fetch content documents', 500);
    }

    const contentDocs = contentRows || [];

    console.log(`[migrate-content] Found ${contentDocs.length} content documents`);

    if (contentDocs.length === 0) {
      return apiSuccess({
        message: 'No content documents to migrate',
        migrated: 0,
        errors: []
      });
    }

    // Step 2: Convert to lesson format
    const lessonsToCreate: Array<{ id: string; data: Record<string, unknown> }> = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const doc of contentDocs) {
      try {
        const lessonData = mapContentToLesson(doc.id, doc, user.uid);

        lessonsToCreate.push({
          id: doc.id,
          data: lessonData
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ id: doc.id, error: message });
        console.error(`[migrate-content] Error mapping ${doc.id}:`, error);
      }
    }

    console.log(`[migrate-content] Converted ${lessonsToCreate.length} documents, ${errors.length} errors`);

    if (dryRun) {
      return apiSuccess({
        message: 'Dry run complete - no data written',
        preview: lessonsToCreate.slice(0, 3),
        total: lessonsToCreate.length,
        errors
      });
    }

    // Step 3: Write to lessons table
    let written = 0;

    // Supabase supports bulk inserts, batch by 500
    for (let i = 0; i < lessonsToCreate.length; i += 500) {
      const batch = lessonsToCreate.slice(i, i + 500);
      const insertRows = batch.map(lesson => ({
        id: lesson.id,
        ...lesson.data,
      }));

      const { error: insertError } = await supabase
        .from('lessons')
        .upsert(insertRows);

      if (insertError) {
        console.error(`[migrate-content] Batch insert error at offset ${i}:`, insertError);
        errors.push({ id: `batch-${i}`, error: insertError.message });
      } else {
        written += batch.length;
        console.log(`[migrate-content] Inserted batch of ${batch.length} lessons`);
      }
    }

    console.log(`[migrate-content] Migration complete - ${written} lessons created`);

    return apiSuccess({
      message: 'Migration complete',
      migrated: written,
      errors
    });
  } catch (error: unknown) {
    console.error('POST /api/admin/migrate-content error:', error);
    const message = error instanceof Error ? error.message : 'Migration failed';
    return apiError(message, 500);
  }
}

/**
 * Maps legacy content document to new lesson format
 */
function mapContentToLesson(contentId: string, contentData: Record<string, unknown>, authorId: string) {
  const now = new Date().toISOString();

  // Extract category from content
  const category = (contentData.category as string) || 'wellness';

  // Determine lesson type based on media URLs
  const hasVideo = !!contentData.videoUrl;
  const hasAudio = !!contentData.audioUrl;
  const type = hasVideo ? 'video' : (hasAudio ? 'audio' : 'video');

  // Build tags from existing data
  const tags = [
    category.toLowerCase(),
    ...((contentData.tags as string[]) || [])
  ];

  // Add instructor tag if present
  if (contentData.instructor) {
    tags.push(`instructor:${contentData.instructor}`);
  }

  // Convert duration (minutes to seconds)
  const durationMinutes = (contentData.durationMinutes as number) || (contentData.duration as number) || 0;
  const duration_sec = durationMinutes * 60;

  // Build renditions from videoUrl (if available)
  let renditions = null;
  if (contentData.videoUrl) {
    renditions = {
      high: {
        path: contentData.videoUrl,
        width: 1920,
        height: 1080,
        bitrate_kbps: 5000
      }
    };
  }

  // Build audio_variants from audioUrl (if available)
  let audio_variants = null;
  if (contentData.audioUrl) {
    audio_variants = {
      high: {
        path: contentData.audioUrl,
        bitrate_kbps: 320
      }
    };
  }

  // Map to lesson schema (snake_case)
  return {
    // Basic Information
    title: (contentData.title as string) || 'Untitled Lesson',
    description: (contentData.description as string) || null,
    type: type,

    // Program Association (default to first program if not specified)
    program_id: (contentData.programId as string) || 'default-program',
    order: (contentData.order as number) || 0,

    // Media Details
    duration_sec: duration_sec > 0 ? duration_sec : null,
    tags: tags,
    transcript: null,

    // Storage & Processing
    status: (contentData.isActive as boolean) === false ? 'draft' : 'ready',
    storage_path_original: null,
    renditions: renditions,
    audio_variants: audio_variants,
    codec: null,
    size_bytes: null,
    mime_type: null,

    // Metadata
    thumbnail_url: (contentData.thumbnailUrl as string) || null,

    // Timestamps
    created_at: (contentData.created_at as string) || now,
    updated_at: (contentData.updated_at as string) || now,

    // Authorship (use admin who ran migration)
    author_id: authorId,

    // Scheduling
    scheduled_publish_at: null,
    scheduled_archive_at: null,
    auto_publish_enabled: false
  };
}
