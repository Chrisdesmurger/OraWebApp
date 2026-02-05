/**
 * Migration script for programs collection
 *
 * Converts old program format to new format:
 * - Old: camelCase fields (authorId, createdAt, coverUrl, etc.)
 * - New: snake_case fields (author_id, created_at, cover_image_url, etc.)
 * - Adds missing fields: category, difficulty, duration_days, lessons, tags
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OldProgram {
  title: string;
  description?: string;
  level?: string;
  tags?: string[];
  status?: string;
  authorId?: string;
  coverUrl?: string;
  mediaCount?: number;
  createdAt?: string;
  updatedAt?: string;
  published?: boolean;
  duration?: number;
  lessonCount?: number;
  // Also check for already-migrated snake_case fields
  author_id?: string;
  created_at?: string;
}

interface NewProgram {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration_days: number;
  lessons: string[];
  cover_image_url: string | null;
  status: string;
  author_id: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const DEFAULT_AUTHOR = 'admin-migration';

async function migratePrograms() {
  console.log('🔄 Starting programs migration...\n');

  try {
    // Fetch all existing programs
    const { data: rows, error } = await supabase
      .from('programs')
      .select('*');

    if (error) {
      throw error;
    }

    const programs = rows || [];
    console.log(`📊 Found ${programs.length} programs to migrate\n`);

    if (programs.length === 0) {
      console.log('✅ No programs to migrate');
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of programs) {
      const oldData = row as OldProgram & { id: string };

      console.log(`📝 Processing: ${oldData.id} - "${oldData.title}"`);

      // Check if already migrated (has snake_case fields)
      if (oldData.author_id || oldData.created_at) {
        console.log(`  ⏭️  Skipped (already migrated)\n`);
        skipped++;
        continue;
      }

      try {
        // Map old level to new difficulty
        let difficulty = 'beginner';
        if (oldData.level) {
          const levelMap: Record<string, string> = {
            'beginner': 'beginner',
            'intermediate': 'intermediate',
            'advanced': 'advanced',
            'easy': 'beginner',
            'medium': 'intermediate',
            'hard': 'advanced',
          };
          difficulty = levelMap[oldData.level.toLowerCase()] || 'beginner';
        }

        // Determine category from tags or title
        let category = 'wellness'; // default
        const titleLower = oldData.title?.toLowerCase() || '';
        const tagsLower = oldData.tags?.map(t => t.toLowerCase()) || [];

        if (titleLower.includes('meditation') || tagsLower.includes('meditation')) {
          category = 'meditation';
        } else if (titleLower.includes('yoga') || tagsLower.includes('yoga')) {
          category = 'yoga';
        } else if (titleLower.includes('mindfulness') || tagsLower.includes('mindfulness')) {
          category = 'mindfulness';
        }

        // Map old status
        let status = 'draft';
        if (oldData.published === true) {
          status = 'published';
        } else if (oldData.status) {
          status = oldData.status === 'published' ? 'published' : 'draft';
        }

        // Create new format
        const newData: NewProgram = {
          title: oldData.title || 'Untitled Program',
          description: oldData.description || '',
          category,
          difficulty,
          duration_days: oldData.duration || 7, // default 7 days
          lessons: [], // Will need to be populated manually or with another migration
          cover_image_url: oldData.coverUrl || null,
          status,
          author_id: oldData.authorId || DEFAULT_AUTHOR,
          tags: oldData.tags || [],
          created_at: oldData.createdAt || new Date().toISOString(),
          updated_at: oldData.updatedAt || new Date().toISOString(),
        };

        // Update the row (upsert to overwrite all fields)
        const { error: upsertError } = await supabase
          .from('programs')
          .upsert({ id: oldData.id, ...newData });

        if (upsertError) {
          throw upsertError;
        }

        console.log(`  ✅ Migrated successfully`);
        console.log(`     Category: ${category} | Difficulty: ${difficulty} | Status: ${status}\n`);
        migrated++;

      } catch (error: any) {
        console.error(`  ❌ Error migrating: ${error.message}\n`);
        errors++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${programs.length}\n`);

    if (errors === 0) {
      console.log('✨ Migration completed successfully!\n');
    } else {
      console.log('⚠️  Migration completed with some errors. Please review.\n');
    }

  } catch (error: any) {
    console.error('💥 Migration failed:', error.message);
    throw error;
  }
}

// Run migration
migratePrograms()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
