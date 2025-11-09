/**
 * Migration Script: content → lessons
 *
 * Migrates legacy content documents to the new lessons collection format.
 *
 * Usage:
 *   node scripts/migrate-content-to-lessons.js [--dry-run]
 *
 * Options:
 *   --dry-run: Preview changes without writing to Firestore
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: service-account.json not found');
  console.error('   Please download it from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

// Parse command-line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

console.log('🔄 Content → Lessons Migration Script');
console.log('=====================================\n');

if (isDryRun) {
  console.log('⚠️  DRY RUN MODE - No data will be written\n');
}

/**
 * Maps legacy content document to new LessonDocument format
 */
function mapContentToLesson(contentId, contentData) {
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

    // Authorship (default to system if not specified)
    author_id: contentData.authorId || 'system',

    // Scheduling
    scheduled_publish_at: null,
    scheduled_archive_at: null,
    auto_publish_enabled: false
  };
}

/**
 * Main migration function
 */
async function migrateContent() {
  try {
    console.log('📋 Step 1: Fetching documents from "content" collection...\n');

    const contentSnapshot = await firestore.collection('content').get();
    const contentDocs = contentSnapshot.docs;

    console.log(`   Found ${contentDocs.length} documents in "content" collection\n`);

    if (contentDocs.length === 0) {
      console.log('✅ No documents to migrate. Exiting.');
      return;
    }

    console.log('🔄 Step 2: Converting to LessonDocument format...\n');

    const lessonsToCreate = [];
    const errors = [];

    for (const doc of contentDocs) {
      try {
        const contentData = doc.data();
        const lessonData = mapContentToLesson(doc.id, contentData);

        lessonsToCreate.push({
          id: doc.id,
          data: lessonData
        });

        console.log(`   ✓ ${doc.id}: "${lessonData.title}" (${lessonData.type}, ${lessonData.duration_sec}s)`);
      } catch (error) {
        errors.push({ id: doc.id, error: error.message });
        console.error(`   ✗ ${doc.id}: ${error.message}`);
      }
    }

    console.log(`\n   Converted: ${lessonsToCreate.length} documents`);
    console.log(`   Errors: ${errors.length} documents\n`);

    if (errors.length > 0) {
      console.log('⚠️  Errors encountered:');
      errors.forEach(err => {
        console.log(`   - ${err.id}: ${err.error}`);
      });
      console.log();
    }

    if (isDryRun) {
      console.log('⚠️  DRY RUN - Preview of first 3 lessons:\n');
      lessonsToCreate.slice(0, 3).forEach(lesson => {
        console.log('---');
        console.log(JSON.stringify(lesson, null, 2));
      });
      console.log('\n✅ Dry run complete. Run without --dry-run to apply changes.');
      return;
    }

    console.log('💾 Step 3: Writing to "lessons" collection...\n');

    const batch = firestore.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit

    for (const lesson of lessonsToCreate) {
      const lessonRef = firestore.collection('lessons').doc(lesson.id);
      batch.set(lessonRef, lesson.data);
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`   ✓ Committed batch of ${batchCount} documents`);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`   ✓ Committed final batch of ${batchCount} documents`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Migrated: ${lessonsToCreate.length} lessons`);
    console.log(`   - Failed: ${errors.length} lessons`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Verify lessons in Firebase Console: https://console.firebase.google.com`);
    console.log(`   2. Test in Android app (debug screen should show more lessons)`);
    console.log(`   3. If everything looks good, you can delete the old "content" collection`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close Firestore connection
    await admin.app().delete();
  }
}

// Run migration
migrateContent();
