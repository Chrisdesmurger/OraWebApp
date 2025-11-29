/**
 * Find Orphan Lessons Script
 *
 * Finds lessons assigned to non-existent programs
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

async function findOrphanLessons() {
  try {
    // Get all program IDs
    const programsSnapshot = await firestore.collection('programs').get();
    const validProgramIds = new Set();
    programsSnapshot.forEach(doc => validProgramIds.add(doc.id));

    console.log('Valid program IDs:', Array.from(validProgramIds).join(', '));
    console.log('\nChecking all lessons...\n');

    // Get all lessons
    const lessonsSnapshot = await firestore.collection('lessons').get();
    const orphanLessons = [];

    lessonsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.program_id && !validProgramIds.has(data.program_id)) {
        orphanLessons.push({
          id: doc.id,
          title: data.title,
          program_id: data.program_id,
          status: data.status
        });
      }
    });

    if (orphanLessons.length === 0) {
      console.log('✅ All lessons are assigned to valid programs!');
    } else {
      console.log(`⚠️ Found ${orphanLessons.length} lesson(s) with invalid program_id:\n`);
      orphanLessons.forEach(lesson => {
        console.log(`ID: ${lesson.id}`);
        console.log(`Title: ${lesson.title}`);
        console.log(`Invalid Program ID: ${lesson.program_id}`);
        console.log(`Status: ${lesson.status}`);
        console.log('---');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findOrphanLessons();
