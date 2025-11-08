#!/usr/bin/env node
/**
 * Simple Migration Script: content → lessons
 *
 * Uses Firebase credentials from .env.local
 *
 * Usage: node scripts/migrate-simple.js [--dry-run]
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Parse args
const isDryRun = process.argv.includes('--dry-run');

console.log('🔄 Content → Lessons Migration');
console.log('==============================\n');

if (isDryRun) {
  console.log('⚠️  DRY RUN MODE - No data will be written\n');
}

// Initialize Firebase Admin from env
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');

if (!serviceAccount.project_id) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT_JSON not found in .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

/**
 * Convert content document to lesson format
 */
function mapContentToLesson(contentId, contentData, authorId = 'system') {
  const now = new Date().toISOString();

  // Extract category
  const category = contentData.category || 'wellness';

  // Determine type
  const hasVideo = !!contentData.videoUrl;
  const hasAudio = !!contentData.audioUrl;
  const type = hasVideo ? 'video' : (hasAudio ? 'audio' : 'video');

  // Build tags
  const tags = [
    category.toLowerCase(),
    ...(contentData.tags || [])
  ];

  if (contentData.instructor) {
    tags.push(`instructor:${contentData.instructor}`);
  }

  // Duration
  const durationMinutes = contentData.durationMinutes || contentData.duration || 0;
  const duration_sec = durationMinutes * 60;

  // Renditions
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

  // Audio variants
  let audio_variants = null;
  if (contentData.audioUrl) {
    audio_variants = {
      high: {
        path: contentData.audioUrl,
        bitrate_kbps: 320
      }
    };
  }

  // Map to LessonDocument
  return {
    title: contentData.title || 'Untitled Lesson',
    description: contentData.description || null,
    type: type,
    program_id: contentData.programId || 'default-program',
    order: contentData.order || 0,
    duration_sec: duration_sec > 0 ? duration_sec : null,
    tags: tags,
    transcript: null,
    status: contentData.isActive === false ? 'draft' : 'ready',
    storage_path_original: null,
    renditions: renditions,
    audio_variants: audio_variants,
    codec: null,
    size_bytes: null,
    mime_type: null,
    thumbnail_url: contentData.thumbnailUrl || null,
    created_at: contentData.createdAt?.toDate?.()?.toISOString() || now,
    updated_at: contentData.updatedAt?.toDate?.()?.toISOString() || now,
    author_id: authorId,
    scheduled_publish_at: null,
    scheduled_archive_at: null,
    auto_publish_enabled: false
  };
}

async function migrate() {
  try {
    console.log('📋 Step 1: Fetching documents from "content" collection...\n');

    const contentSnapshot = await firestore.collection('content').get();
    const contentDocs = contentSnapshot.docs;

    console.log(`   Found ${contentDocs.length} documents\n`);

    if (contentDocs.length === 0) {
      console.log('✅ No documents to migrate.');
      await admin.app().delete();
      return;
    }

    console.log('🔄 Step 2: Converting to lesson format...\n');

    const lessons = [];
    const errors = [];

    for (const doc of contentDocs) {
      try {
        const contentData = doc.data();
        const lessonData = mapContentToLesson(doc.id, contentData);

        lessons.push({ id: doc.id, data: lessonData });
        console.log(`   ✓ ${doc.id}: "${lessonData.title}" (${lessonData.type}, ${lessonData.duration_sec}s)`);
      } catch (error) {
        errors.push({ id: doc.id, error: error.message });
        console.error(`   ✗ ${doc.id}: ${error.message}`);
      }
    }

    console.log(`\n   Converted: ${lessons.length}`);
    console.log(`   Errors: ${errors.length}\n`);

    if (isDryRun) {
      console.log('⚠️  DRY RUN - Preview of first lesson:\n');
      console.log(JSON.stringify(lessons[0], null, 2));
      console.log('\n✅ Dry run complete. Run without --dry-run to apply.');
      await admin.app().delete();
      return;
    }

    console.log('💾 Step 3: Writing to "lessons" collection...\n');

    const batch = firestore.batch();

    for (const lesson of lessons) {
      const lessonRef = firestore.collection('lessons').doc(lesson.id);
      batch.set(lessonRef, lesson.data);
    }

    await batch.commit();
    console.log(`   ✓ Committed ${lessons.length} lessons\n`);

    console.log('✅ Migration complete!');
    console.log(`   - Migrated: ${lessons.length} lessons`);
    console.log(`   - Failed: ${errors.length} lessons\n`);

    console.log('📝 Next steps:');
    console.log('   1. Verify in Firebase Console');
    console.log('   2. Test in Android app (debug screen)');
    console.log('   3. Delete old "content" collection if OK');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

migrate();
