const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function addPlaceholderTranslations() {
  try {
    const docRef = db.collection('onboarding_configs').doc('personalization-v1');
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log('Document not found');
      process.exit(1);
    }

    const data = doc.data();
    let updated = false;

    // Find PROFILE_GROUP questions and add placeholder translations
    if (data.questions) {
      data.questions.forEach((question, qIndex) => {
        if (question.type?.type === 'PROFILE_GROUP' && question.type.fields) {
          question.type.fields.forEach((field, fIndex) => {
            // Add placeholder translations based on field ID
            if (field.id === 'firstName' && !field.placeholderEn) {
              field.placeholderEn = 'Your first name';
              field.placeholderEs = 'Tu nombre';
              updated = true;
              console.log('Added placeholders for firstName');
            } else if (field.id === 'lastName' && !field.placeholderEn) {
              field.placeholderEn = 'Your last name';
              field.placeholderEs = 'Tu apellido';
              updated = true;
              console.log('Added placeholders for lastName');
            } else if (field.id === 'birthDate' && !field.placeholderEn) {
              field.placeholderEn = 'DD/MM/YYYY';
              field.placeholderEs = 'DD/MM/AAAA';
              updated = true;
              console.log('Added placeholders for birthDate');
            }

            // Also add label translations if missing
            if (field.options) {
              field.options.forEach((option, oIndex) => {
                if (option.label === 'Homme' && !option.labelEn) {
                  option.labelEn = 'Male';
                  option.labelEs = 'Hombre';
                  updated = true;
                  console.log('Added labels for Homme option');
                } else if (option.label === 'Femme' && !option.labelEn) {
                  option.labelEn = 'Female';
                  option.labelEs = 'Mujer';
                  updated = true;
                  console.log('Added labels for Femme option');
                } else if (option.label === 'Non-binaire' && !option.labelEn) {
                  option.labelEn = 'Non-binary';
                  option.labelEs = 'No binario';
                  updated = true;
                  console.log('Added labels for Non-binaire option');
                } else if (option.label === 'Autre' && !option.labelEn) {
                  option.labelEn = 'Other';
                  option.labelEs = 'Otro';
                  updated = true;
                  console.log('Added labels for Autre option');
                }
              });
            }
          });
        }
      });
    }

    if (updated) {
      await docRef.set(data);
      console.log('✅ Successfully updated placeholder translations');
    } else {
      console.log('✅ No updates needed - all placeholders already exist');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

addPlaceholderTranslations();
