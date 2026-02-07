/**
 * Script to list all programs with their new format
 */

import { createClient } from '@supabase/supabase-js';
import { mapProgramFromFirestore, type ProgramDocument } from '../types/program';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listPrograms() {
  console.log('📋 Listing all programs...\n');

  try {
    const { data: rows, error } = await supabase
      .from('programs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const programs = rows || [];
    console.log(`📊 Found ${programs.length} programs:\n`);

    programs.forEach((row) => {
      const program = mapProgramFromFirestore(row.id, row as ProgramDocument);

      console.log(`🔹 ${program.title}`);
      console.log(`   ID: ${program.id}`);
      console.log(`   Category: ${program.category} | Difficulty: ${program.difficulty}`);
      console.log(`   Duration: ${program.durationDays} days | Lessons: ${program.lessons?.length || 0}`);
      console.log(`   Status: ${program.status}`);
      console.log(`   Tags: ${program.tags?.join(', ') || 'none'}`);
      console.log(`   Created: ${program.createdAt}`);
      console.log('');
    });

    console.log('✅ Listing completed\n');

  } catch (error: any) {
    console.error('💥 Listing failed:', error.message);
    throw error;
  }
}

// Run listing
listPrograms()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
