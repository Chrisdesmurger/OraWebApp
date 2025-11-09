/**
 * Verification Script: Lessons Collection
 *
 * Verifies the lessons collection structure and data integrity.
 *
 * Usage:
 *   node scripts/verify-lessons.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: service-account.json not found');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

console.log('🔍 Lessons Collection Verification');
console.log('==================================\n');

/**
 * Validates a lesson document
 */
function validateLesson(lessonId, lessonData) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!lessonData.title || lessonData.title.trim() === '') {
    errors.push('Missing or empty title');
  }

  if (!lessonData.type || !['video', 'audio'].includes(lessonData.type)) {
    errors.push(`Invalid type: ${lessonData.type} (must be 'video' or 'audio')`);
  }

  if (!lessonData.program_id || lessonData.program_id.trim() === '') {
    warnings.push('Missing program_id');
  }

  if (!lessonData.status || !['draft', 'uploading', 'processing', 'ready', 'failed'].includes(lessonData.status)) {
    errors.push(`Invalid status: ${lessonData.status}`);
  }

  // Media validation
  if (lessonData.type === 'video' && !lessonData.renditions) {
    warnings.push('Video lesson missing renditions');
  }

  if (lessonData.type === 'audio' && !lessonData.audio_variants) {
    warnings.push('Audio lesson missing audio_variants');
  }

  // Duration validation
  if (!lessonData.duration_sec || lessonData.duration_sec <= 0) {
    warnings.push('Missing or invalid duration_sec');
  }

  // Timestamp validation
  if (!lessonData.created_at) {
    warnings.push('Missing created_at timestamp');
  }

  if (!lessonData.updated_at) {
    warnings.push('Missing updated_at timestamp');
  }

  // Tags validation
  if (!lessonData.tags || !Array.isArray(lessonData.tags)) {
    warnings.push('Missing or invalid tags array');
  }

  return { errors, warnings };
}

/**
 * Main verification function
 */
async function verifyLessons() {
  try {
    console.log('📋 Fetching lessons from Firestore...\n');

    const lessonsSnapshot = await firestore.collection('lessons').get();
    const lessons = lessonsSnapshot.docs;

    console.log(`Found ${lessons.length} lessons\n`);

    if (lessons.length === 0) {
      console.log('⚠️  No lessons found in collection');
      return;
    }

    // Statistics
    const stats = {
      total: lessons.length,
      byStatus: {},
      byType: {},
      valid: 0,
      withErrors: 0,
      withWarnings: 0
    };

    const detailedResults = [];

    console.log('🔍 Validating lessons...\n');

    for (const doc of lessons) {
      const lessonData = doc.data();
      const validation = validateLesson(doc.id, lessonData);

      // Update stats
      const status = lessonData.status || 'unknown';
      const type = lessonData.type || 'unknown';

      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      if (validation.errors.length === 0 && validation.warnings.length === 0) {
        stats.valid++;
      }

      if (validation.errors.length > 0) {
        stats.withErrors++;
        console.log(`❌ ${doc.id}: "${lessonData.title}"`);
        validation.errors.forEach(err => console.log(`   - Error: ${err}`));
      }

      if (validation.warnings.length > 0) {
        stats.withWarnings++;
        console.log(`⚠️  ${doc.id}: "${lessonData.title}"`);
        validation.warnings.forEach(warn => console.log(`   - Warning: ${warn}`));
      }

      if (validation.errors.length === 0 && validation.warnings.length === 0) {
        console.log(`✅ ${doc.id}: "${lessonData.title}" (${lessonData.status}, ${lessonData.type})`);
      }

      detailedResults.push({
        id: doc.id,
        title: lessonData.title,
        status: lessonData.status,
        type: lessonData.type,
        duration_sec: lessonData.duration_sec,
        program_id: lessonData.program_id,
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Print summary
    console.log('\n📊 Summary');
    console.log('==========\n');
    console.log(`Total lessons: ${stats.total}`);
    console.log(`Valid (no errors/warnings): ${stats.valid}`);
    console.log(`With errors: ${stats.withErrors}`);
    console.log(`With warnings: ${stats.withWarnings}`);

    console.log('\nBy Status:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    console.log('\nBy Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

    // Sample lesson
    if (lessons.length > 0) {
      console.log('\n📝 Sample Lesson Document:\n');
      const sampleLesson = lessons[0].data();
      console.log(JSON.stringify(sampleLesson, null, 2));
    }

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

// Run verification
verifyLessons();
