/**
 * Script to adjust program categories and difficulties based on titles
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

  try {
    let updated = 0;
    let notFound = 0;

    for (const [docId, updates] of Object.entries(adjustments)) {
      console.log(`📝 Adjusting: ${docId}`);

      // Check if the program exists
      const { data: existing, error: fetchError } = await supabase
        .from('programs')
        .select('id')
        .eq('id', docId)
        .single();

      if (fetchError || !existing) {
        console.log(`  ⚠️  Not found\n`);
        notFound++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('programs')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId);

      if (updateError) {
        throw updateError;
      }

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
