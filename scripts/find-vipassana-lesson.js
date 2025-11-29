/**
 * Find Vipassana Lesson Script
 *
 * Searches for lessons containing "Vipassana" in the title
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');

if (!serviceAccount.project_id) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT_JSON not found in .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

async function findVipassanaLesson() {
  try {
    console.log('🔍 Searching for lessons containing "Vipassana"...\n');

    const snapshot = await firestore.collection('lessons').get();

    console.log(`Total lessons in database: ${snapshot.size}\n`);

    const vipassanaLessons = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.title && data.title.toLowerCase().includes('vipassana')) {
        vipassanaLessons.push({
          id: doc.id,
          ...data
        });
      }
    });

    if (vipassanaLessons.length === 0) {
      console.log('❌ No lessons found containing "Vipassana"');
      console.log('\nShowing first 10 lessons instead:\n');

      let count = 0;
      snapshot.forEach(doc => {
        if (count < 10) {
          const data = doc.data();
          console.log(`ID: ${doc.id}`);
          console.log(`Title: ${data.title}`);
          console.log(`Program ID: ${data.program_id}`);
          console.log(`Status: ${data.status}`);
          console.log(`Author ID: ${data.author_id}`);
          console.log('---');
          count++;
        }
      });
    } else {
      console.log(`✅ Found ${vipassanaLessons.length} lesson(s) containing "Vipassana":\n`);

      vipassanaLessons.forEach(lesson => {
        console.log(`ID: ${lesson.id}`);
        console.log(`Title: ${lesson.title}`);
        console.log(`Description: ${lesson.description || 'N/A'}`);
        console.log(`Program ID: ${lesson.program_id}`);
        console.log(`Type: ${lesson.type}`);
        console.log(`Status: ${lesson.status}`);
        console.log(`Author ID: ${lesson.author_id}`);
        console.log(`Order: ${lesson.order}`);
        console.log(`Duration: ${lesson.duration_sec ? `${lesson.duration_sec}s` : 'N/A'}`);
        console.log(`Thumbnail URL: ${lesson.thumbnail_url || 'N/A'}`);
        console.log(`Preview Image URL: ${lesson.preview_image_url || 'N/A'}`);
        console.log(`Created: ${lesson.created_at}`);
        console.log(`Updated: ${lesson.updated_at}`);
        console.log('========================================\n');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findVipassanaLesson();
