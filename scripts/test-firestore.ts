/**
 * Script to test Firestore connection and list collections
 * Run with: npx tsx scripts/test-firestore.ts
 */

import { getFirestore } from '../lib/firebase/admin';

async function testFirestore() {
  console.log('🔍 Testing Firestore connection...\n');

  try {
    const firestore = getFirestore();

    // List all collections
    console.log('📂 Listing all root collections:');
    const collections = await firestore.listCollections();

    if (collections.length === 0) {
      console.log('⚠️  No collections found!');
    } else {
      collections.forEach((collection) => {
        console.log(`  - ${collection.id}`);
      });
    }

    console.log('\n📊 Checking specific collections:\n');

    // Check users collection
    const usersSnapshot = await firestore.collection('users').limit(5).get();
    console.log(`Users collection: ${usersSnapshot.size} documents (showing first 5)`);
    usersSnapshot.forEach((doc) => {
      console.log(`  - ${doc.id}:`, Object.keys(doc.data()));
    });

    // Check programs collection
    const programsSnapshot = await firestore.collection('programs').limit(5).get();
    console.log(`\nPrograms collection: ${programsSnapshot.size} documents (showing first 5)`);
    programsSnapshot.forEach((doc) => {
      console.log(`  - ${doc.id}:`, Object.keys(doc.data()));
    });

    // Check lessons collection
    const lessonsSnapshot = await firestore.collection('lessons').limit(5).get();
    console.log(`\nLessons collection: ${lessonsSnapshot.size} documents (showing first 5)`);
    lessonsSnapshot.forEach((doc) => {
      console.log(`  - ${doc.id}:`, Object.keys(doc.data()));
    });

    console.log('\n✅ Firestore connection test completed!');
  } catch (error) {
    console.error('❌ Firestore test failed:', error);
  }
}

testFirestore();
