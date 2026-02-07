/**
 * Wipe Demo Data Script
 * Deletes all demo data (fake users + sample content)
 */

import { purgeFakeUsers } from './purge-fake-users';
import { createClient } from '@supabase/supabase-js';
import type { CommandResult } from '../lib/types/commands';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function wipeDemoData(): Promise<CommandResult> {
  const output: string[] = [];
  const metadata: Record<string, any> = {
    usersDeleted: 0,
    programsDeleted: 0,
    lessonsDeleted: 0,
    totalOperations: 0,
  };

  try {
    output.push('========================================');
    output.push('WIPE DEMO DATA - DESTRUCTIVE OPERATION');
    output.push('========================================');
    output.push('');

    // Step 1: Purge fake users
    output.push('STEP 1: Purging fake users...');
    output.push('----------------------------------------');

    const purgeResult = await purgeFakeUsers();
    output.push(...purgeResult.output);

    if (purgeResult.metadata) {
      metadata.usersDeleted = purgeResult.metadata.usersDeleted || 0;
      metadata.totalOperations += metadata.usersDeleted;
    }

    if (!purgeResult.success) {
      output.push('\nWARNING: Fake user purge encountered errors, continuing with content deletion...');
    }

    output.push('');

    // Step 2: Delete sample programs and lessons
    output.push('STEP 2: Deleting sample content...');
    output.push('----------------------------------------');

    // Delete all lessons
    output.push('\nDeleting all lessons...');
    const { data: lessonsData, error: lessonsCountError } = await supabase
      .from('lessons')
      .select('id');

    if (lessonsCountError) {
      throw lessonsCountError;
    }

    const lessonsCount = lessonsData?.length || 0;
    output.push(`Found ${lessonsCount} lessons`);

    if (lessonsCount > 0) {
      const { error: lessonsDeleteError } = await supabase
        .from('lessons')
        .delete()
        .neq('id', '');  // Delete all rows (neq empty string matches all)

      if (lessonsDeleteError) {
        throw lessonsDeleteError;
      }

      metadata.lessonsDeleted = lessonsCount;
      metadata.totalOperations += metadata.lessonsDeleted;
      output.push(`  - ${metadata.lessonsDeleted} lessons deleted`);
    } else {
      output.push('  - No lessons found');
    }

    // Delete all programs
    output.push('\nDeleting all programs...');
    const { data: programsData, error: programsCountError } = await supabase
      .from('programs')
      .select('id');

    if (programsCountError) {
      throw programsCountError;
    }

    const programsCount = programsData?.length || 0;
    output.push(`Found ${programsCount} programs`);

    if (programsCount > 0) {
      const { error: programsDeleteError } = await supabase
        .from('programs')
        .delete()
        .neq('id', '');  // Delete all rows

      if (programsDeleteError) {
        throw programsDeleteError;
      }

      metadata.programsDeleted = programsCount;
      metadata.totalOperations += metadata.programsDeleted;
      output.push(`  - ${metadata.programsDeleted} programs deleted`);
    } else {
      output.push('  - No programs found');
    }

    // Delete all user program enrollments
    output.push('\nCleaning up user program records...');
    const { data: enrollmentsData, error: enrollmentsCountError } = await supabase
      .from('user_program_enrollments')
      .select('id');

    if (enrollmentsCountError) {
      // Table might not exist, that's ok
      output.push('  - No user program records found');
    } else {
      const enrollmentsCount = enrollmentsData?.length || 0;
      if (enrollmentsCount > 0) {
        const { error: enrollmentsDeleteError } = await supabase
          .from('user_program_enrollments')
          .delete()
          .neq('id', '');

        if (enrollmentsDeleteError) {
          output.push(`  - Error deleting enrollments: ${enrollmentsDeleteError.message}`);
        } else {
          output.push(`  - ${enrollmentsCount} user program records deleted`);
        }
      } else {
        output.push('  - No user program records found');
      }
    }

    output.push('');
    output.push('========================================');
    output.push('WIPE DEMO DATA COMPLETE');
    output.push('========================================');
    output.push(`Total operations: ${metadata.totalOperations}`);
    output.push(`Users deleted: ${metadata.usersDeleted}`);
    output.push(`Programs deleted: ${metadata.programsDeleted}`);
    output.push(`Lessons deleted: ${metadata.lessonsDeleted}`);
    output.push('========================================');

    return {
      success: true,
      output,
      metadata,
    };
  } catch (error: any) {
    output.push(`\nFATAL ERROR: ${error.message}`);
    return {
      success: false,
      output,
      error: error.message,
      metadata,
    };
  }
}

// Allow script to be run directly
if (require.main === module) {
  wipeDemoData()
    .then((result) => {
      console.log(result.output.join('\n'));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
