const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fetchOnboardingConfig() {
  try {
    const doc = await db.collection('onboarding_configs').doc('personalization-v1').get();

    if (doc.exists) {
      console.log(JSON.stringify(doc.data(), null, 2));
    } else {
      console.error('Document not found');
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error fetching config:', err);
    process.exit(1);
  }
}

fetchOnboardingConfig();
