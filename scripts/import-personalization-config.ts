/**
 * Script d'import pour la configuration d'onboarding de personnalisation v1.1
 * Inclut le nouveau type profile_group
 *
 * Usage: npm run import-personalization
 *
 * Prerequisites:
 * - Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { getFirestore } from '../lib/firebase/admin';

async function importPersonalizationConfig() {
  console.log('🌱 Import de la configuration d\'onboarding de personnalisation v1.1...\n');

  const db = getFirestore();
  const onboardingRef = db.collection('onboarding_configs');

  // Lire le fichier JSON
  const configPath = resolve(__dirname, 'onboarding_personalization_config.json');
  const configData = JSON.parse(readFileSync(configPath, 'utf8'));

  console.log(`📋 Configuration lue: ${configData.id}`);
  console.log(`📊 Version: ${configData.version}`);
  console.log(`📊 Questions: ${configData.questions.length}`);
  console.log(`📊 Information Screens: ${configData.informationScreens.length}`);

  // Vérifier que le type profile_group est bien présent
  const profileGroupQuestion = configData.questions.find(
    (q: any) => q.type.kind === 'profile_group'
  );

  if (profileGroupQuestion) {
    console.log(`✅ Question profile_group trouvée: ${profileGroupQuestion.id}`);
    console.log(`   Champs: ${profileGroupQuestion.type.fields.length}`);
    profileGroupQuestion.type.fields.forEach((field: any) => {
      console.log(`   - ${field.id} (${field.inputType})`);
    });
  } else {
    console.warn('⚠️  Aucune question profile_group trouvée dans la config');
  }

  try {
    // Archiver l'ancienne config active si elle existe
    const existingQuery = await onboardingRef
      .where('status', '==', 'active')
      .get();

    if (!existingQuery.empty) {
      console.log(`\n📦 Archivage de ${existingQuery.size} config(s) active(s)...`);
      const batch = db.batch();
      existingQuery.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: 'archived',
          updatedAt: new Date(),
        });
      });
      await batch.commit();
      console.log('✅ Configs archivées');
    }

    // Insérer la nouvelle configuration
    await onboardingRef.doc(configData.id).set({
      ...configData,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: configData.status === 'active' ? new Date() : null,
      publishedBy: configData.status === 'active' ? configData.createdBy : null,
    });

    console.log('\n✅ Configuration importée avec succès !');
    console.log(`📋 ID: ${configData.id}`);
    console.log(`📊 Status: ${configData.status}`);
    console.log(`📊 Nombre de questions: ${configData.questions.length}`);
    console.log(`📊 Information screens: ${configData.informationScreens.length}`);

    console.log('\n📝 Questions par type:');
    const questionsByType = configData.questions.reduce((acc: any, q: any) => {
      acc[q.type.kind] = (acc[q.type.kind] || 0) + 1;
      return acc;
    }, {});
    Object.entries(questionsByType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

    console.log('\n🎉 Import terminé !');
    console.log(`🔗 URL: http://localhost:3000/admin/onboarding/${configData.id}\n`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
    throw error;
  }
}

// Exécuter le script
importPersonalizationConfig()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
