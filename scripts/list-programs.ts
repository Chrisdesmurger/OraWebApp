/**
 * Script to list all programs with their new format
 */

import { getFirestore } from '../lib/firebase/admin';
import { mapProgramFromFirestore, type ProgramDocument } from '../types/program';

async function listPrograms() {
  console.log('📋 Listing all programs...\n');

  const firestore = getFirestore();
  const programsRef = firestore.collection('programs');

  try {
    const snapshot = await programsRef.orderBy('created_at', 'desc').get();

    console.log(`📊 Found ${snapshot.size} programs:\n`);

    snapshot.forEach((doc) => {
      const data = doc.data() as ProgramDocument;
      const program = mapProgramFromFirestore(doc.id, data);

      console.log(`🔹 ${program.title}`);
      console.log(`   ID: ${program.id}`);
      console.log(`   Category: ${program.category} | Difficulty: ${program.difficulty}`);
      console.log(`   Duration: ${program.durationDays} days | Lessons: ${program.lessons?.length || 0}`);
      console.log(`   Status: ${program.status}`);
      console.log(`   Tags: ${program.tags?.join(', ') || 'none'}`);
      console.log(`   Created: ${program.createdAt}`);
      console.log('');
    });

    console.log('✅ Listing completed\n');

  } catch (error: any) {
    console.error('💥 Listing failed:', error.message);
    throw error;
  }
}

// Run listing
listPrograms()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
