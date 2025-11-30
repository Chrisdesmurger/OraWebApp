/**
 * Find Stress Lesson Script
 *
 * Searches for lessons containing "stress" in the title
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

async function findStressLesson() {
  try {
    console.log('🔍 Searching for lessons containing "stress"...\n');

    const snapshot = await firestore.collection('lessons').get();

    const stressLessons = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.title && data.title.toLowerCase().includes('stress')) {
        stressLessons.push({
          id: doc.id,
          ...data
        });
      }
    });

    if (stressLessons.length === 0) {
      console.log('❌ No lessons found containing "stress"');
    } else {
      console.log(`✅ Found ${stressLessons.length} lesson(s) containing "stress":\n`);

      stressLessons.forEach(lesson => {
        console.log(`ID: ${lesson.id}`);
        console.log(`Title: ${lesson.title}`);
        console.log(`Description: ${lesson.description || 'N/A'}`);
        console.log(`Program ID: ${lesson.program_id}`);
        console.log(`Type: ${lesson.type}`);
        console.log(`Status: ${lesson.status}`);
        console.log(`Order: ${lesson.order}`);
        console.log(`Duration: ${lesson.duration_sec ? `${lesson.duration_sec}s` : 'N/A'}`);
        console.log(`Preview Image URL: ${lesson.preview_image_url || 'N/A'}`);
        console.log('========================================\n');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findStressLesson();
