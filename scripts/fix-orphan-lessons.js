/**
 * Fix Orphan Lessons Script
 *
 * Assigns orphan lessons to appropriate programs based on their category
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

// Mapping rules based on lesson ID prefix
const PROGRAM_MAPPING = {
  'med-': 'meditation-debutant-7j',          // Méditation pour Débutants
  'yoga-': 'yoga-matinal-14j',               // Yoga Matinal Énergisant
  'pilates-': 'pilates-renforcement-28j',    // Pilates Renforcement Profond
  'resp-': 'respiration-energie-14j',        // Respiration & Énergie
  'sommeil-': 'sommeil-reparateur-10j',      // Sommeil Réparateur
  'travail-': 'bien-etre-travail-7j',        // Bien-être au Travail
};

function getProgramForLesson(lessonId) {
  for (const [prefix, programId] of Object.entries(PROGRAM_MAPPING)) {
    if (lessonId.startsWith(prefix)) {
      return programId;
    }
  }
  // Default fallback
  return 'meditation-debutant-7j';
}

async function fixOrphanLessons() {
  try {
    // Get all program IDs
    const programsSnapshot = await firestore.collection('programs').get();
    const validProgramIds = new Set();
    const programNames = {};

    programsSnapshot.forEach(doc => {
      validProgramIds.add(doc.id);
      programNames[doc.id] = doc.data().title;
    });

    console.log('🔧 Fixing orphan lessons...\n');

    // Get all lessons with default-program
    const lessonsSnapshot = await firestore.collection('lessons')
      .where('program_id', '==', 'default-program')
      .get();

    if (lessonsSnapshot.empty) {
      console.log('✅ No orphan lessons found!');
      process.exit(0);
      return;
    }

    console.log(`Found ${lessonsSnapshot.size} orphan lesson(s). Updating...\n`);

    const batch = firestore.batch();
    const updates = [];

    lessonsSnapshot.forEach(doc => {
      const lessonId = doc.id;
      const lessonData = doc.data();
      const newProgramId = getProgramForLesson(lessonId);

      if (!validProgramIds.has(newProgramId)) {
        console.warn(`⚠️ Warning: Target program ${newProgramId} doesn't exist for lesson ${lessonId}`);
        return;
      }

      batch.update(doc.ref, {
        program_id: newProgramId,
        updated_at: new Date().toISOString()
      });

      updates.push({
        id: lessonId,
        title: lessonData.title,
        newProgram: programNames[newProgramId]
      });
    });

    // Commit batch update
    await batch.commit();

    console.log('✅ Successfully updated all orphan lessons!\n');
    console.log('Summary of updates:');
    console.log('===================\n');

    updates.forEach(update => {
      console.log(`📝 ${update.id}`);
      console.log(`   Title: ${update.title}`);
      console.log(`   New Program: ${update.newProgram}`);
      console.log('');
    });

    console.log(`\n✅ Total lessons updated: ${updates.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixOrphanLessons();
