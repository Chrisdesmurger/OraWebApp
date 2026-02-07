/**
 * Script d'import pour la configuration d'onboarding de personnalisation v1.1
 * Inclut le nouveau type profile_group
 *
 * Usage: npm run import-personalization
 *
 * Prerequisites:
 * - Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importPersonalizationConfig() {
  console.log('Import de la configuration d\'onboarding de personnalisation v1.1...\n');

  // Lire le fichier JSON
  const configPath = resolve(__dirname, 'onboarding_personalization_config.json');
  const configData = JSON.parse(readFileSync(configPath, 'utf8'));

  console.log(`Configuration lue: ${configData.id}`);
  console.log(`Version: ${configData.version}`);
  console.log(`Questions: ${configData.questions.length}`);
  console.log(`Information Screens: ${configData.informationScreens.length}`);

  // Verifier que le type profile_group est bien present
  const profileGroupQuestion = configData.questions.find(
    (q: any) => q.type.kind === 'profile_group'
  );

  if (profileGroupQuestion) {
    console.log(`Question profile_group trouvee: ${profileGroupQuestion.id}`);
    console.log(`   Champs: ${profileGroupQuestion.type.fields.length}`);
    profileGroupQuestion.type.fields.forEach((field: any) => {
      console.log(`   - ${field.id} (${field.inputType})`);
    });
  } else {
    console.warn('Aucune question profile_group trouvee dans la config');
  }

  try {
    const now = new Date().toISOString();

    // Archiver l'ancienne config active si elle existe
    const { data: existingConfigs, error: queryError } = await supabase
      .from('onboarding_configs')
      .select('id')
      .eq('status', 'active');

    if (queryError) {
      throw new Error(`Failed to query existing configs: ${queryError.message}`);
    }

    if (existingConfigs && existingConfigs.length > 0) {
      console.log(`\nArchivage de ${existingConfigs.length} config(s) active(s)...`);

      const { error: archiveError } = await supabase
        .from('onboarding_configs')
        .update({
          status: 'archived',
          updated_at: now,
        })
        .eq('status', 'active');

      if (archiveError) {
        throw new Error(`Failed to archive configs: ${archiveError.message}`);
      }

      console.log('Configs archivees');
    }

    // Inserer la nouvelle configuration
    const { error: upsertError } = await supabase
      .from('onboarding_configs')
      .upsert({
        id: configData.id,
        ...configData,
        created_at: now,
        updated_at: now,
        published_at: configData.status === 'active' ? now : null,
        published_by: configData.status === 'active' ? configData.createdBy : null,
      });

    if (upsertError) {
      throw new Error(`Failed to upsert config: ${upsertError.message}`);
    }

    console.log('\nConfiguration importee avec succes !');
    console.log(`ID: ${configData.id}`);
    console.log(`Status: ${configData.status}`);
    console.log(`Nombre de questions: ${configData.questions.length}`);
    console.log(`Information screens: ${configData.informationScreens.length}`);

    console.log('\nQuestions par type:');
    const questionsByType = configData.questions.reduce((acc: any, q: any) => {
      acc[q.type.kind] = (acc[q.type.kind] || 0) + 1;
      return acc;
    }, {});
    Object.entries(questionsByType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

    console.log('\nImport termine !');
    console.log(`URL: http://localhost:3000/admin/onboarding/${configData.id}\n`);
  } catch (error) {
    console.error('Erreur lors de l\'import:', error);
    throw error;
  }
}

// Executer le script
importPersonalizationConfig()
  .then(() => {
    console.log('Script termine avec succes');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
