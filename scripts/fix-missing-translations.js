const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixMissingTranslations() {
  try {
    const docRef = db.collection('onboarding_configs').doc('personalization-v1');
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log('Document not found');
      process.exit(1);
    }

    const data = doc.data();
    let updated = false;

    // Fix information screens features
    if (data.informationScreens) {
      data.informationScreens.forEach((screen, idx) => {
        if (screen.features) {
          screen.features.forEach((feature, fIdx) => {
            // Feature 1: "Profil personnalisé"
            if (feature.title === 'Profil personnalisé' && !feature.titleEn) {
              feature.titleEn = 'Personalized profile';
              feature.titleEs = 'Perfil personalizado';
              feature.descriptionEn = feature.descriptionEn || 'A few questions to tailor your interface, notifications, and recommendations.';
              feature.descriptionEs = feature.descriptionEs || 'Algunas preguntas para personalizar tu interfaz, notificaciones y recomendaciones.';
              updated = true;
              console.log(`✓ Translated feature "${feature.title}" in screen ${idx}`);
            }
            // Feature 2: "Notifications adaptées"
            if (feature.title === 'Notifications adaptées' && !feature.titleEn) {
              feature.titleEn = 'Tailored notifications';
              feature.titleEs = 'Notificaciones adaptadas';
              updated = true;
              console.log(`✓ Translated feature "${feature.title}" in screen ${idx}`);
            }
            // Feature 3: "Recommandations ciblées"
            if (feature.title === 'Recommandations ciblées' && !feature.titleEn) {
              feature.titleEn = 'Targeted recommendations';
              feature.titleEs = 'Recomendaciones específicas';
              updated = true;
              console.log(`✓ Translated feature "${feature.title}" in screen ${idx}`);
            }
          });
        }
      });
    }

    // Fix PROFILE_GROUP question
    if (data.questions) {
      data.questions.forEach((question, qIdx) => {
        if (question.type?.type === 'PROFILE_GROUP') {
          // Question title
          if (question.title === 'Construisons ton profil' && !question.titleEn) {
            question.titleEn = "Let's build your profile";
            question.titleEs = 'Construyamos tu perfil';
            updated = true;
            console.log('✓ Translated PROFILE_GROUP question title');
          }

          // Question subtitle
          if (question.subtitle && question.subtitle.includes('personnaliser') && !question.subtitleEn) {
            question.subtitleEn = 'To personalize your ORA experience';
            question.subtitleEs = 'Para personalizar tu experiencia ORA';
            updated = true;
            console.log('✓ Translated PROFILE_GROUP question subtitle');
          }

          // Fix fields
          if (question.type.fields) {
            question.type.fields.forEach((field, fIdx) => {
              // firstName field
              if (field.id === 'firstName') {
                if (!field.labelEn) {
                  field.labelEn = 'First name';
                  field.labelEs = 'Nombre';
                  updated = true;
                  console.log('✓ Translated firstName label');
                }
                if (!field.placeholderEn) {
                  field.placeholderEn = 'Your first name';
                  field.placeholderEs = 'Tu nombre';
                  updated = true;
                  console.log('✓ Translated firstName placeholder');
                }
              }

              // lastName field
              if (field.id === 'lastName') {
                if (!field.labelEn) {
                  field.labelEn = 'Last name';
                  field.labelEs = 'Apellido';
                  updated = true;
                  console.log('✓ Translated lastName label');
                }
                if (!field.placeholderEn) {
                  field.placeholderEn = 'Your last name';
                  field.placeholderEs = 'Tu apellido';
                  updated = true;
                  console.log('✓ Translated lastName placeholder');
                }
              }

              // birthDate field
              if (field.id === 'birthDate') {
                if (!field.labelEn) {
                  field.labelEn = 'Date of birth';
                  field.labelEs = 'Fecha de nacimiento';
                  updated = true;
                  console.log('✓ Translated birthDate label');
                }
                if (!field.placeholderEn) {
                  field.placeholderEn = 'DD/MM/YYYY';
                  field.placeholderEs = 'DD/MM/AAAA';
                  updated = true;
                  console.log('✓ Translated birthDate placeholder');
                }
              }

              // gender field
              if (field.id === 'gender') {
                if (!field.labelEn) {
                  field.labelEn = 'Gender';
                  field.labelEs = 'Género';
                  updated = true;
                  console.log('✓ Translated gender label');
                }

                // Translate gender options
                if (field.options) {
                  field.options.forEach((option, oIdx) => {
                    if (option.label === 'Femme' && !option.labelEn) {
                      option.labelEn = 'Female';
                      option.labelEs = 'Mujer';
                      updated = true;
                      console.log('✓ Translated Femme option');
                    }
                    if (option.label === 'Homme' && !option.labelEn) {
                      option.labelEn = 'Male';
                      option.labelEs = 'Hombre';
                      updated = true;
                      console.log('✓ Translated Homme option');
                    }
                    if (option.label === 'Non binaire' && !option.labelEn) {
                      option.labelEn = 'Non-binary';
                      option.labelEs = 'No binario';
                      updated = true;
                      console.log('✓ Translated Non binaire option');
                    }
                    if (option.label === "Je préfère ne pas le dire" && !option.labelEn) {
                      option.labelEn = "I'd rather not say";
                      option.labelEs = 'Prefiero no decirlo';
                      updated = true;
                      console.log('✓ Translated "Je préfère ne pas le dire" option');
                    }
                  });
                }
              }
            });
          }
        }
      });
    }

    if (updated) {
      await docRef.set(data);
      console.log('\n✅ Successfully updated all missing translations');
    } else {
      console.log('✅ No updates needed - all translations already exist');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixMissingTranslations();
