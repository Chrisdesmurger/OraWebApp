/**
 * Script to adjust program categories and difficulties based on titles
 */

import { getFirestore } from '../lib/firebase/admin';

const adjustments: Record<string, { category?: string; difficulty?: string }> = {
  'meditation-debutant-7j': { category: 'meditation', difficulty: 'beginner' },
  'meditation-avancee-30j': { category: 'meditation', difficulty: 'advanced' },
  'defi-meditation-quotidienne': { category: 'meditation', difficulty: 'intermediate' },
  'yoga-matinal-14j': { category: 'yoga', difficulty: 'beginner' },
  'yoga-souplesse-21j': { category: 'yoga', difficulty: 'intermediate' },
  'pilates-renforcement-28j': { category: 'wellness', difficulty: 'intermediate' },
  'respiration-energie-14j': { category: 'mindfulness', difficulty: 'beginner' },
  'defi-gratitude-21j': { category: 'mindfulness', difficulty: 'beginner' },
  'sommeil-reparateur-10j': { category: 'mindfulness', difficulty: 'beginner' },
  'bien-etre-travail-7j': { category: 'wellness', difficulty: 'beginner' },
};

async function adjustPrograms() {
  console.log('🔧 Starting programs adjustment...\n');

  const firestore = getFirestore();
  const programsRef = firestore.collection('programs');

  try {
    let updated = 0;
    let notFound = 0;

    for (const [docId, updates] of Object.entries(adjustments)) {
      console.log(`📝 Adjusting: ${docId}`);

      const docRef = programsRef.doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.log(`  ⚠️  Not found\n`);
        notFound++;
        continue;
      }

      await docRef.update({
        ...updates,
        updated_at: new Date().toISOString(),
      });

      console.log(`  ✅ Updated: category=${updates.category}, difficulty=${updates.difficulty}\n`);
      updated++;
    }

    console.log('\n📈 Adjustment Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Not Found: ${notFound}`);
    console.log(`   📊 Total: ${Object.keys(adjustments).length}\n`);

    console.log('✨ Adjustment completed successfully!\n');

  } catch (error: any) {
    console.error('💥 Adjustment failed:', error.message);
    throw error;
  }
}

// Run adjustment
adjustPrograms()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
