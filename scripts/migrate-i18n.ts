/**
 * Migration Script: Add Multilingual Fields (FR/EN/ES)
 *
 * Issue #68: Backend i18n Support
 *
 * This script migrates existing Firestore content to support multilingual fields:
 * - Lessons: title -> title_fr, description -> description_fr, etc.
 * - Programs: title -> title_fr, description -> description_fr, etc.
 * - Onboarding: Copy existing French content to _fr fields
 *
 * Strategy:
 * 1. Read all existing documents
 * 2. Copy single-language fields to _fr fields (French is primary)
 * 3. Leave _en and _es fields as null (to be translated later via admin portal)
 * 4. Preserve existing data (non-destructive migration)
 * 5. Add migration metadata for tracking
 *
 * Usage:
 *   npx ts-node scripts/migrate-i18n.ts [--dry-run] [--collection=lessons|programs|onboarding]
 *
 * Options:
 *   --dry-run       Preview changes without writing to Firestore
 *   --collection    Migrate only a specific collection (default: all)
 *   --batch-size    Number of documents per batch (default: 50)
 *   --verbose       Show detailed output
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

// ============================================================================
// Configuration
// ============================================================================

interface MigrationConfig {
  dryRun: boolean;
  collection: 'lessons' | 'programs' | 'onboarding' | 'all';
  batchSize: number;
  verbose: boolean;
}

function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    collection: (args.find(a => a.startsWith('--collection='))?.split('=')[1] as MigrationConfig['collection']) || 'all',
    batchSize: parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '50'),
    verbose: args.includes('--verbose'),
  };
}

// ============================================================================
// Migration Statistics
// ============================================================================

interface MigrationStats {
  collection: string;
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

// ============================================================================
// Lesson Migration
// ============================================================================

interface LegacyLesson {
  title?: string;
  description?: string | null;
  transcript?: string | null;
  category?: string | null;
  chapters?: LegacyChapter[];
  body_zones?: LegacyBodyZone[];
  phases?: LegacyPhase[];
  ambient_sound_name?: string | null;
  breathing_instruction?: string | null;
  // i18n fields (may already exist)
  title_fr?: string;
  title_en?: string;
  title_es?: string;
  description_fr?: string | null;
  description_en?: string | null;
  description_es?: string | null;
}

interface LegacyChapter {
  id: string;
  name?: string;
  name_fr?: string;
  name_en?: string;
  name_es?: string;
  order: number;
  start_time_sec: number;
  end_time_sec: number;
  instructions?: LegacyInstruction[];
}

interface LegacyInstruction {
  text?: string;
  text_fr?: string;
  text_en?: string;
  text_es?: string;
  duration_sec: number;
  side?: string;
}

interface LegacyBodyZone {
  id: string;
  name?: string;
  name_fr?: string;
  name_en?: string;
  name_es?: string;
  order: number;
  start_time_sec: number;
  end_time_sec: number;
  pressure_level?: string;
  pressure_level_fr?: string;
  pressure_level_en?: string;
  pressure_level_es?: string;
  instructions?: LegacyInstruction[];
}

interface LegacyPhase {
  id: string;
  name?: string;
  name_fr?: string;
  name_en?: string;
  name_es?: string;
  order: number;
  start_time_sec: number;
  end_time_sec: number;
  breathing_instruction?: string;
  breathing_instruction_fr?: string;
  breathing_instruction_en?: string;
  breathing_instruction_es?: string;
  ambient_sound_name?: string;
  ambient_sound_name_fr?: string;
  ambient_sound_name_en?: string;
  ambient_sound_name_es?: string;
}

async function migrateLessons(config: MigrationConfig): Promise<MigrationStats> {
  const stats: MigrationStats = {
    collection: 'lessons',
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    startTime: new Date(),
  };

  console.log('\n=== Migrating Lessons Collection ===');

  const snapshot = await db.collection('lessons').get();
  stats.total = snapshot.size;
  console.log(`Found ${stats.total} lessons to process`);

  const batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as LegacyLesson;
    const updates: Record<string, unknown> = {};

    try {
      // Skip if already migrated (has title_fr but no legacy title, or vice versa)
      if (data.title_fr && !data.title) {
        if (config.verbose) console.log(`  [SKIP] ${doc.id}: Already migrated`);
        stats.skipped++;
        continue;
      }

      // Basic text fields
      if (data.title && !data.title_fr) {
        updates.title_fr = data.title;
        updates.title_en = null;
        updates.title_es = null;
      }

      if (data.description && !data.description_fr) {
        updates.description_fr = data.description;
        updates.description_en = null;
        updates.description_es = null;
      }

      if (data.transcript && !data.transcript) {
        updates.transcript_fr = data.transcript;
        updates.transcript_en = null;
        updates.transcript_es = null;
      }

      if (data.category) {
        updates.category_fr = data.category;
        updates.category_en = null;
        updates.category_es = null;
      }

      // Meditation-specific fields
      if (data.ambient_sound_name) {
        updates.ambient_sound_name_fr = data.ambient_sound_name;
        updates.ambient_sound_name_en = null;
        updates.ambient_sound_name_es = null;
      }

      if (data.breathing_instruction) {
        updates.breathing_instruction_fr = data.breathing_instruction;
        updates.breathing_instruction_en = null;
        updates.breathing_instruction_es = null;
      }

      // Migrate nested chapters (yoga)
      if (data.chapters && data.chapters.length > 0) {
        updates.chapters = data.chapters.map(ch => ({
          ...ch,
          name_fr: ch.name || ch.name_fr,
          name_en: ch.name_en || null,
          name_es: ch.name_es || null,
          instructions: ch.instructions?.map(inst => ({
            ...inst,
            text_fr: inst.text || inst.text_fr,
            text_en: inst.text_en || null,
            text_es: inst.text_es || null,
          })) || [],
        }));
      }

      // Migrate nested body zones (massage)
      if (data.body_zones && data.body_zones.length > 0) {
        updates.body_zones = data.body_zones.map(zone => ({
          ...zone,
          name_fr: zone.name || zone.name_fr,
          name_en: zone.name_en || null,
          name_es: zone.name_es || null,
          pressure_level_fr: zone.pressure_level || zone.pressure_level_fr,
          pressure_level_en: zone.pressure_level_en || null,
          pressure_level_es: zone.pressure_level_es || null,
          instructions: zone.instructions?.map(inst => ({
            ...inst,
            text_fr: inst.text || inst.text_fr,
            text_en: inst.text_en || null,
            text_es: inst.text_es || null,
          })) || [],
        }));
      }

      // Migrate nested phases (meditation)
      if (data.phases && data.phases.length > 0) {
        updates.phases = data.phases.map(phase => ({
          ...phase,
          name_fr: phase.name || phase.name_fr,
          name_en: phase.name_en || null,
          name_es: phase.name_es || null,
          breathing_instruction_fr: phase.breathing_instruction || phase.breathing_instruction_fr,
          breathing_instruction_en: phase.breathing_instruction_en || null,
          breathing_instruction_es: phase.breathing_instruction_es || null,
          ambient_sound_name_fr: phase.ambient_sound_name || phase.ambient_sound_name_fr,
          ambient_sound_name_en: phase.ambient_sound_name_en || null,
          ambient_sound_name_es: phase.ambient_sound_name_es || null,
        }));
      }

      // Add migration metadata
      updates._i18n_migrated_at = admin.firestore.FieldValue.serverTimestamp();
      updates._i18n_migration_version = '1.0.0';

      if (Object.keys(updates).length > 2) { // More than just metadata
        if (config.dryRun) {
          console.log(`  [DRY RUN] ${doc.id} (${data.title})`);
          if (config.verbose) console.log(`    Updates:`, Object.keys(updates));
        } else {
          batch.update(doc.ref, updates);
          batchCount++;
        }
        stats.migrated++;
      } else {
        stats.skipped++;
      }

      // Commit batch when full
      if (!config.dryRun && batchCount >= config.batchSize) {
        await batch.commit();
        console.log(`  Committed batch of ${batchCount} documents`);
        batchCount = 0;
      }
    } catch (error) {
      console.error(`  [ERROR] ${doc.id}:`, error);
      stats.errors++;
    }
  }

  // Commit remaining
  if (!config.dryRun && batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount} documents`);
  }

  stats.endTime = new Date();
  return stats;
}

// ============================================================================
// Program Migration
// ============================================================================

interface LegacyProgram {
  title?: string;
  description?: string;
  category?: string;
  difficulty?: string;
  prerequisites?: string;
  expected_results?: string;
  objectives?: LegacyObjective[];
  // i18n fields (may already exist)
  title_fr?: string;
  title_en?: string;
  title_es?: string;
  description_fr?: string;
  description_en?: string;
  description_es?: string;
}

interface LegacyObjective {
  id: string;
  text?: string;
  text_fr?: string;
  text_en?: string;
  text_es?: string;
  order: number;
}

async function migratePrograms(config: MigrationConfig): Promise<MigrationStats> {
  const stats: MigrationStats = {
    collection: 'programs',
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    startTime: new Date(),
  };

  console.log('\n=== Migrating Programs Collection ===');

  const snapshot = await db.collection('programs').get();
  stats.total = snapshot.size;
  console.log(`Found ${stats.total} programs to process`);

  const batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as LegacyProgram;
    const updates: Record<string, unknown> = {};

    try {
      // Skip if already migrated
      if (data.title_fr && !data.title) {
        if (config.verbose) console.log(`  [SKIP] ${doc.id}: Already migrated`);
        stats.skipped++;
        continue;
      }

      // Basic text fields
      if (data.title && !data.title_fr) {
        updates.title_fr = data.title;
        updates.title_en = null;
        updates.title_es = null;
      }

      if (data.description && !data.description_fr) {
        updates.description_fr = data.description;
        updates.description_en = null;
        updates.description_es = null;
      }

      if (data.category) {
        updates.category_fr = data.category;
        updates.category_en = null;
        updates.category_es = null;
      }

      if (data.difficulty) {
        updates.difficulty_fr = data.difficulty;
        updates.difficulty_en = null;
        updates.difficulty_es = null;
      }

      if (data.prerequisites) {
        updates.prerequisites_fr = data.prerequisites;
        updates.prerequisites_en = null;
        updates.prerequisites_es = null;
      }

      if (data.expected_results) {
        updates.expected_results_fr = data.expected_results;
        updates.expected_results_en = null;
        updates.expected_results_es = null;
      }

      // Migrate objectives
      if (data.objectives && data.objectives.length > 0) {
        updates.objectives = data.objectives.map(obj => ({
          ...obj,
          text_fr: obj.text || obj.text_fr,
          text_en: obj.text_en || null,
          text_es: obj.text_es || null,
        }));
      }

      // Add migration metadata
      updates._i18n_migrated_at = admin.firestore.FieldValue.serverTimestamp();
      updates._i18n_migration_version = '1.0.0';

      if (Object.keys(updates).length > 2) {
        if (config.dryRun) {
          console.log(`  [DRY RUN] ${doc.id} (${data.title})`);
          if (config.verbose) console.log(`    Updates:`, Object.keys(updates));
        } else {
          batch.update(doc.ref, updates);
          batchCount++;
        }
        stats.migrated++;
      } else {
        stats.skipped++;
      }

      if (!config.dryRun && batchCount >= config.batchSize) {
        await batch.commit();
        console.log(`  Committed batch of ${batchCount} documents`);
        batchCount = 0;
      }
    } catch (error) {
      console.error(`  [ERROR] ${doc.id}:`, error);
      stats.errors++;
    }
  }

  if (!config.dryRun && batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount} documents`);
  }

  stats.endTime = new Date();
  return stats;
}

// ============================================================================
// Onboarding Migration
// ============================================================================

async function migrateOnboarding(config: MigrationConfig): Promise<MigrationStats> {
  const stats: MigrationStats = {
    collection: 'onboarding_configs',
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    startTime: new Date(),
  };

  console.log('\n=== Migrating Onboarding Configs Collection ===');

  const snapshot = await db.collection('onboarding_configs').get();
  stats.total = snapshot.size;
  console.log(`Found ${stats.total} onboarding configs to process`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates: Record<string, unknown> = {};

    try {
      // Migrate questions
      if (data.questions && Array.isArray(data.questions)) {
        updates.questions = data.questions.map((q: Record<string, unknown>) => {
          const updatedQuestion = { ...q };

          // Migrate title
          if (q.title && !q.title_fr) {
            updatedQuestion.title_fr = q.title;
            updatedQuestion.title_en = q.title_en || null;
            updatedQuestion.title_es = null; // NEW: Spanish field
          }

          // Migrate subtitle
          if (q.subtitle && !q.subtitle_fr) {
            updatedQuestion.subtitle_fr = q.subtitle;
            updatedQuestion.subtitle_en = q.subtitle_en || null;
            updatedQuestion.subtitle_es = null;
          }

          // Migrate hint (NEW)
          if (q.hint) {
            updatedQuestion.hint_fr = q.hint;
            updatedQuestion.hint_en = null;
            updatedQuestion.hint_es = null;
          }

          // Migrate options
          if (Array.isArray(q.options)) {
            updatedQuestion.options = (q.options as Record<string, unknown>[]).map(opt => ({
              ...opt,
              label_fr: opt.label || opt.label_fr,
              label_en: opt.label_en || null,
              label_es: null, // NEW: Spanish field
              description_fr: opt.description || opt.description_fr || null,
              description_en: opt.description_en || null,
              description_es: null, // NEW: Spanish field
            }));
          }

          return updatedQuestion;
        });
      }

      // Migrate information screens
      if (data.information_screens && Array.isArray(data.information_screens)) {
        updates.information_screens = data.information_screens.map((screen: Record<string, unknown>) => {
          const updatedScreen = { ...screen };

          if (screen.title && !screen.title_fr) {
            updatedScreen.title_fr = screen.title;
            updatedScreen.title_en = screen.title_en || null;
            updatedScreen.title_es = null;
          }

          if (screen.subtitle && !screen.subtitle_fr) {
            updatedScreen.subtitle_fr = screen.subtitle;
            updatedScreen.subtitle_en = screen.subtitle_en || null;
            updatedScreen.subtitle_es = null;
          }

          if (screen.content && !screen.content_fr) {
            updatedScreen.content_fr = screen.content;
            updatedScreen.content_en = screen.content_en || null;
            updatedScreen.content_es = null;
          }

          if (screen.cta_text && !screen.cta_text_fr) {
            updatedScreen.cta_text_fr = screen.cta_text;
            updatedScreen.cta_text_en = screen.cta_text_en || null;
            updatedScreen.cta_text_es = null;
          }

          // Migrate bullet points to structured format
          if (Array.isArray(screen.bullet_points) && !screen.bullet_points_structured) {
            updatedScreen.bullet_points_structured = (screen.bullet_points as string[]).map((text, index) => ({
              order: index,
              text_fr: text,
              text_en: null,
              text_es: null,
            }));
            // Keep legacy arrays for backward compatibility
            updatedScreen.bullet_points_fr = screen.bullet_points;
            updatedScreen.bullet_points_en = screen.bullet_points_en || null;
            updatedScreen.bullet_points_es = null;
          }

          return updatedScreen;
        });
      }

      // Add migration metadata
      updates._i18n_migrated_at = admin.firestore.FieldValue.serverTimestamp();
      updates._i18n_migration_version = '1.0.0';

      if (Object.keys(updates).length > 2) {
        if (config.dryRun) {
          console.log(`  [DRY RUN] ${doc.id}`);
          if (config.verbose) console.log(`    Updates:`, Object.keys(updates));
        } else {
          await doc.ref.update(updates);
        }
        stats.migrated++;
      } else {
        stats.skipped++;
      }
    } catch (error) {
      console.error(`  [ERROR] ${doc.id}:`, error);
      stats.errors++;
    }
  }

  stats.endTime = new Date();
  return stats;
}

// ============================================================================
// Main Migration Runner
// ============================================================================

async function runMigration() {
  const config = parseArgs();

  console.log('===========================================');
  console.log('  i18n Migration Script (Issue #68)');
  console.log('===========================================');
  console.log('');
  console.log('Configuration:');
  console.log(`  Dry Run:     ${config.dryRun ? 'YES (no changes will be made)' : 'NO (will write to Firestore)'}`);
  console.log(`  Collection:  ${config.collection}`);
  console.log(`  Batch Size:  ${config.batchSize}`);
  console.log(`  Verbose:     ${config.verbose}`);
  console.log('');

  if (config.dryRun) {
    console.log('*** DRY RUN MODE - No changes will be written ***');
  }

  const allStats: MigrationStats[] = [];

  try {
    if (config.collection === 'all' || config.collection === 'lessons') {
      const lessonStats = await migrateLessons(config);
      allStats.push(lessonStats);
    }

    if (config.collection === 'all' || config.collection === 'programs') {
      const programStats = await migratePrograms(config);
      allStats.push(programStats);
    }

    if (config.collection === 'all' || config.collection === 'onboarding') {
      const onboardingStats = await migrateOnboarding(config);
      allStats.push(onboardingStats);
    }

    // Print summary
    console.log('\n===========================================');
    console.log('  Migration Summary');
    console.log('===========================================');

    for (const stats of allStats) {
      const duration = stats.endTime
        ? ((stats.endTime.getTime() - stats.startTime.getTime()) / 1000).toFixed(2)
        : 'N/A';

      console.log(`\n${stats.collection}:`);
      console.log(`  Total:    ${stats.total}`);
      console.log(`  Migrated: ${stats.migrated}`);
      console.log(`  Skipped:  ${stats.skipped}`);
      console.log(`  Errors:   ${stats.errors}`);
      console.log(`  Duration: ${duration}s`);
    }

    const totalMigrated = allStats.reduce((sum, s) => sum + s.migrated, 0);
    const totalErrors = allStats.reduce((sum, s) => sum + s.errors, 0);

    console.log('\n-------------------------------------------');
    console.log(`Total Migrated: ${totalMigrated}`);
    console.log(`Total Errors:   ${totalErrors}`);

    if (config.dryRun) {
      console.log('\n*** DRY RUN COMPLETE - Run without --dry-run to apply changes ***');
    } else {
      console.log('\nMigration complete!');
    }

    process.exit(totalErrors > 0 ? 1 : 0);
  } catch (error) {
    console.error('\nFATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
