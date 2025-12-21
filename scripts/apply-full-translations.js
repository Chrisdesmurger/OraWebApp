const admin = require('firebase-admin');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Load translation dictionary
const translations = require('./full-translation-dict.json');

// Helper function to add translations
function addTranslations(obj, key) {
  if (!obj || !key) return;

  const value = obj[key];
  if (!value || typeof value !== 'string') return;

  const trans = translations[value];
  if (!trans) {
    // Log untranslated strings
    if (!obj[`${key}En`] || !obj[`${key}Es`]) {
      console.log(`⚠️  No translation for: "${value.substring(0, 50)}..."`);
    }
    return;
  }

  // Add EN translation if missing
  if (!obj[`${key}En`]) {
    obj[`${key}En`] = trans.en;
    console.log(`✅ Added EN: ${key} = "${trans.en.substring(0, 40)}..."`);
  }

  // Add ES translation if missing
  if (!obj[`${key}Es`]) {
    obj[`${key}Es`] = trans.es;
    console.log(`✅ Added ES: ${key} = "${trans.es.substring(0, 40)}..."`);
  }
}

// Recursive function to process all objects
function processObject(obj) {
  if (!obj || typeof obj !== 'object') return;

  // Check for translatable fields
  const translatableKeys = ['title', 'subtitle', 'hint', 'label', 'description', 'placeholder', 'ctaText'];

  translatableKeys.forEach(key => {
    if (obj.hasOwnProperty(key)) {
      addTranslations(obj, key);
    }
  });

  // Recursively process nested objects and arrays
  Object.keys(obj).forEach(key => {
    if (Array.isArray(obj[key])) {
      obj[key].forEach(item => processObject(item));
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      processObject(obj[key]);
    }
  });
}

async function applyFullTranslations() {
  try {
    console.log('📥 Fetching current onboarding config...');
    const doc = await db.collection('onboarding_configs').doc('personalization-v1').get();

    if (!doc.exists) {
      console.error('❌ Document not found');
      process.exit(1);
    }

    const config = doc.data();
    console.log('✅ Config fetched\n');

    console.log('🔄 Applying translations...\n');

    // Process the entire config recursively
    processObject(config);

    console.log('\n💾 Saving translated config to Firestore...');

    // Save to Firestore
    await db.collection('onboarding_configs').doc('personalization-v1').set(config);

    console.log('✅ Translation complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Questions: ${config.questions?.length || 0}`);
    console.log(`   - Information screens: ${config.informationScreens?.length || 0}`);
    console.log(`   - Languages: FR (default), EN, ES`);

    // Save translated config to file for review
    fs.writeFileSync(
      'onboarding-complete.json',
      JSON.stringify(config, null, 2),
      'utf8'
    );
    console.log('📄 Saved to: onboarding-complete.json');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

applyFullTranslations();
