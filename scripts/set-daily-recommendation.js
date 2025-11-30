/**
 * Set Daily Recommendation Script
 *
 * Sets "Méditation anti-stress" as the daily recommendation (order = -1)
 * and resets "Introduction au Vipassana" to normal order (order = 0)
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

async function setDailyRecommendation() {
  try {
    console.log('🔧 Setting "Méditation anti-stress" as daily recommendation...\n');

    const stressLessonId = 'vUycBRVBYwbUCYWgMW8S'; // Méditation anti-stress
    const vipassanaLessonId = 'med-vipassana-intro'; // Introduction au Vipassana

    // Update Méditation anti-stress to order -1 (top priority)
    await firestore.collection('lessons').doc(stressLessonId).update({
      order: -1,
      updated_at: new Date().toISOString()
    });

    console.log('✅ Set "Méditation anti-stress" to order = -1 (daily recommendation)');

    // Reset Introduction au Vipassana to order 0 (normal)
    await firestore.collection('lessons').doc(vipassanaLessonId).update({
      order: 1,
      updated_at: new Date().toISOString()
    });

    console.log('✅ Set "Introduction au Vipassana" to order = 1 (normal)');

    // Verify the changes
    console.log('\nVerification:');
    const stressDoc = await firestore.collection('lessons').doc(stressLessonId).get();
    const vipassanaDoc = await firestore.collection('lessons').doc(vipassanaLessonId).get();

    console.log('\nMéditation anti-stress:');
    console.log('  Order:', stressDoc.data()?.order);
    console.log('  Title:', stressDoc.data()?.title);

    console.log('\nIntroduction au Vipassana:');
    console.log('  Order:', vipassanaDoc.data()?.order);
    console.log('  Title:', vipassanaDoc.data()?.title);

    console.log('\n✅ Daily recommendation updated successfully!');
    console.log('📱 "Méditation anti-stress" will now appear first on the home screen.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setDailyRecommendation();
