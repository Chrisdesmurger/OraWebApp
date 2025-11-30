/**
 * Check Stress Lesson Details Script
 *
 * Verifies audio/video data for Méditation anti-stress
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');

if (!serviceAccount.project_id) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT_JSON not found in .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

async function checkStressLesson() {
  try {
    const doc = await firestore.collection('lessons').doc('vUycBRVBYwbUCYWgMW8S').get();

    if (!doc.exists) {
      console.log('❌ Lesson not found');
      process.exit(1);
      return;
    }

    const data = doc.data();
    console.log('📄 Méditation anti-stress (vUycBRVBYwbUCYWgMW8S)');
    console.log('========================================');
    console.log('Title:', data.title);
    console.log('Type:', data.type);
    console.log('Order:', data.order);
    console.log('Program ID:', data.program_id);
    console.log('');
    console.log('Audio Variants:');
    if (data.audio_variants) {
      console.log(JSON.stringify(data.audio_variants, null, 2));
    } else {
      console.log('  (none)');
    }
    console.log('');
    console.log('Video Renditions:');
    if (data.renditions) {
      console.log(JSON.stringify(data.renditions, null, 2));
    } else {
      console.log('  (none)');
    }
    console.log('');
    console.log('Storage Paths:');
    console.log('  audio_storage_path:', data.audio_storage_path || '(none)');
    console.log('  video_storage_path:', data.video_storage_path || '(none)');
    console.log('');
    console.log('Media URLs:');
    console.log('  thumbnail_url:', data.thumbnail_url || '(none)');
    console.log('  preview_image_url:', data.preview_image_url || '(none)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStressLesson();
