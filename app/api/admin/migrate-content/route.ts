import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';

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

    const firestore = getFirestore();

    // Step 1: Fetch all content documents
    const contentSnapshot = await firestore.collection('content').get();
    const contentDocs = contentSnapshot.docs;

    console.log(`[migrate-content] Found ${contentDocs.length} content documents`);

    if (contentDocs.length === 0) {
      return apiSuccess({
        message: 'No content documents to migrate',
        migrated: 0,
        errors: []
      });
    }

    // Step 2: Convert to lesson format
    const lessonsToCreate: Array<{ id: string; data: any }> = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const doc of contentDocs) {
      try {
        const contentData = doc.data();
        const lessonData = mapContentToLesson(doc.id, contentData, user.uid);

        lessonsToCreate.push({
          id: doc.id,
          data: lessonData
        });
      } catch (error: any) {
        errors.push({ id: doc.id, error: error.message });
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

    // Step 3: Write to lessons collection
    const batch = firestore.batch();
    let written = 0;

    for (const lesson of lessonsToCreate) {
      const lessonRef = firestore.collection('lessons').doc(lesson.id);
      batch.set(lessonRef, lesson.data);
      written++;

      // Firestore batch limit is 500
      if (written >= 500) {
        await batch.commit();
        console.log(`[migrate-content] Committed batch of ${written} lessons`);
        written = 0;
      }
    }

    if (written > 0) {
      await batch.commit();
      console.log(`[migrate-content] Committed final batch of ${written} lessons`);
    }

    console.log(`[migrate-content] Migration complete - ${lessonsToCreate.length} lessons created`);

    return apiSuccess({
      message: 'Migration complete',
      migrated: lessonsToCreate.length,
      errors
    });
  } catch (error: any) {
    console.error('POST /api/admin/migrate-content error:', error);
    return apiError(error.message || 'Migration failed', 500);
  }
}

/**
 * Maps legacy content document to new LessonDocument format
 */
function mapContentToLesson(contentId: string, contentData: any, authorId: string) {
  const now = new Date().toISOString();

  // Extract category from content
  const category = contentData.category || 'wellness';

  // Determine lesson type based on media URLs
  const hasVideo = !!contentData.videoUrl;
  const hasAudio = !!contentData.audioUrl;
  const type = hasVideo ? 'video' : (hasAudio ? 'audio' : 'video');

  // Build tags from existing data
  const tags = [
    category.toLowerCase(),
    ...(contentData.tags || [])
  ];

  // Add instructor tag if present
  if (contentData.instructor) {
    tags.push(`instructor:${contentData.instructor}`);
  }

  // Convert duration (minutes → seconds)
  const durationMinutes = contentData.durationMinutes || contentData.duration || 0;
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

  // Map to LessonDocument schema (snake_case)
  return {
    // Basic Information
    title: contentData.title || 'Untitled Lesson',
    description: contentData.description || null,
    type: type,

    // Program Association (default to first program if not specified)
    program_id: contentData.programId || 'default-program',
    order: contentData.order || 0,

    // Media Details
    duration_sec: duration_sec > 0 ? duration_sec : null,
    tags: tags,
    transcript: null,

    // Storage & Processing
    status: contentData.isActive === false ? 'draft' : 'ready',
    storage_path_original: null,
    renditions: renditions,
    audio_variants: audio_variants,
    codec: null,
    size_bytes: null,
    mime_type: null,

    // Metadata
    thumbnail_url: contentData.thumbnailUrl || null,

    // Timestamps
    created_at: contentData.createdAt?.toDate?.()?.toISOString() || now,
    updated_at: contentData.updatedAt?.toDate?.()?.toISOString() || now,

    // Authorship (use admin who ran migration)
    author_id: authorId,

    // Scheduling
    scheduled_publish_at: null,
    scheduled_archive_at: null,
    auto_publish_enabled: false
  };
}
