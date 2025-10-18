/**
 * Purge Fake Users Script
 * Removes all fake users created by seed-fake-users script
 */

import { getAuth, getFirestore } from '../lib/firebase/admin';
import type { CommandResult } from '../lib/types/commands';

const FAKE_USER_PREFIX = 'fake_user_';

export async function purgeFakeUsers(): Promise<CommandResult> {
  const output: string[] = [];
  const metadata: Record<string, any> = {
    usersDeleted: 0,
    usersFailed: 0,
    profilesDeleted: 0,
    statsDeleted: 0,
    failedUsers: [],
  };

  try {
    output.push('Starting fake user purge process...');

    const auth = getAuth();
    const db = getFirestore();

    // List all users
    output.push('Fetching all users from Firebase Auth...');
    let allUsers: any[] = [];
    let nextPageToken: string | undefined;

    do {
      const listResult = await auth.listUsers(1000, nextPageToken);
      allUsers = allUsers.concat(listResult.users);
      nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    output.push(`Found ${allUsers.length} total users`);

    // Filter fake users
    const fakeUsers = allUsers.filter(
      (user) => user.email && user.email.startsWith(FAKE_USER_PREFIX)
    );

    output.push(`Identified ${fakeUsers.length} fake users to delete`);

    if (fakeUsers.length === 0) {
      output.push('\nNo fake users found. Nothing to delete.');
      return {
        success: true,
        output,
        metadata,
      };
    }

    output.push('\nDeleting fake users...');

    for (const user of fakeUsers) {
      try {
        output.push(`\nDeleting: ${user.displayName || 'Unknown'} (${user.email})`);

        // Delete Firestore profile
        try {
          await db.collection('users').doc(user.uid).delete();
          output.push(`  - Profile document deleted`);
          metadata.profilesDeleted++;
        } catch (error: any) {
          output.push(`  - Profile deletion failed: ${error.message}`);
        }

        // Delete Firestore stats
        try {
          await db.collection('stats').doc(user.uid).delete();
          output.push(`  - Stats document deleted`);
          metadata.statsDeleted++;
        } catch (error: any) {
          output.push(`  - Stats deletion failed: ${error.message}`);
        }

        // Delete any gratitude entries
        try {
          const gratitudesSnapshot = await db
            .collection('gratitudes')
            .where('userId', '==', user.uid)
            .get();

          if (!gratitudesSnapshot.empty) {
            const batch = db.batch();
            gratitudesSnapshot.docs.forEach((doc) => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            output.push(`  - ${gratitudesSnapshot.size} gratitude entries deleted`);
          }
        } catch (error: any) {
          output.push(`  - Gratitude deletion failed: ${error.message}`);
        }

        // Delete any user programs
        try {
          const userProgramsSnapshot = await db
            .collection('userPrograms')
            .where('userId', '==', user.uid)
            .get();

          if (!userProgramsSnapshot.empty) {
            const batch = db.batch();
            userProgramsSnapshot.docs.forEach((doc) => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            output.push(`  - ${userProgramsSnapshot.size} user program records deleted`);
          }
        } catch (error: any) {
          output.push(`  - User programs deletion failed: ${error.message}`);
        }

        // Delete Firebase Auth user
        await auth.deleteUser(user.uid);
        output.push(`  - Firebase Auth user deleted`);
        output.push(`  - User deleted successfully!`);

        metadata.usersDeleted++;
      } catch (error: any) {
        output.push(`  - ERROR: ${error.message}`);
        metadata.usersFailed++;
        metadata.failedUsers.push({
          uid: user.uid,
          email: user.email,
          error: error.message,
        });
      }
    }

    output.push(`\n========================================`);
    output.push(`Purge complete!`);
    output.push(`Users deleted: ${metadata.usersDeleted}`);
    output.push(`Profiles deleted: ${metadata.profilesDeleted}`);
    output.push(`Stats deleted: ${metadata.statsDeleted}`);
    output.push(`Failed: ${metadata.usersFailed}`);
    output.push(`========================================`);

    return {
      success: metadata.usersFailed === 0,
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
  purgeFakeUsers()
    .then((result) => {
      console.log(result.output.join('\n'));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
