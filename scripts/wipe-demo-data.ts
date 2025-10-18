/**
 * Wipe Demo Data Script
 * Deletes all demo data (fake users + sample content)
 */

import { purgeFakeUsers } from './purge-fake-users';
import { getFirestore } from '../lib/firebase/admin';
import type { CommandResult } from '../lib/types/commands';

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

    const db = getFirestore();

    // Delete all lessons
    output.push('\nDeleting all lessons...');
    const lessonsSnapshot = await db.collection('lessons').get();
    output.push(`Found ${lessonsSnapshot.size} lessons`);

    if (!lessonsSnapshot.empty) {
      const lessonBatches: any[][] = [];
      let currentBatch = db.batch();
      let batchCount = 0;

      lessonsSnapshot.docs.forEach((doc, index) => {
        currentBatch.delete(doc.ref);
        batchCount++;

        // Firestore batch limit is 500
        if (batchCount === 500 || index === lessonsSnapshot.size - 1) {
          lessonBatches.push([currentBatch]);
          currentBatch = db.batch();
          batchCount = 0;
        }
      });

      for (let i = 0; i < lessonBatches.length; i++) {
        await lessonBatches[i][0].commit();
        output.push(`  - Batch ${i + 1}/${lessonBatches.length} committed`);
      }

      metadata.lessonsDeleted = lessonsSnapshot.size;
      metadata.totalOperations += metadata.lessonsDeleted;
      output.push(`  - ${metadata.lessonsDeleted} lessons deleted`);
    } else {
      output.push('  - No lessons found');
    }

    // Delete all programs
    output.push('\nDeleting all programs...');
    const programsSnapshot = await db.collection('programs').get();
    output.push(`Found ${programsSnapshot.size} programs`);

    if (!programsSnapshot.empty) {
      const programBatches: any[][] = [];
      let currentBatch = db.batch();
      let batchCount = 0;

      programsSnapshot.docs.forEach((doc, index) => {
        currentBatch.delete(doc.ref);
        batchCount++;

        if (batchCount === 500 || index === programsSnapshot.size - 1) {
          programBatches.push([currentBatch]);
          currentBatch = db.batch();
          batchCount = 0;
        }
      });

      for (let i = 0; i < programBatches.length; i++) {
        await programBatches[i][0].commit();
        output.push(`  - Batch ${i + 1}/${programBatches.length} committed`);
      }

      metadata.programsDeleted = programsSnapshot.size;
      metadata.totalOperations += metadata.programsDeleted;
      output.push(`  - ${metadata.programsDeleted} programs deleted`);
    } else {
      output.push('  - No programs found');
    }

    // Delete all user programs
    output.push('\nCleaning up user program records...');
    const userProgramsSnapshot = await db.collection('userPrograms').get();

    if (!userProgramsSnapshot.empty) {
      const batch = db.batch();
      userProgramsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      output.push(`  - ${userProgramsSnapshot.size} user program records deleted`);
    } else {
      output.push('  - No user program records found');
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
