/**
 * Purge Fake Users Script
 * Removes all fake users created by seed-fake-users script
 */

import { createClient } from '@supabase/supabase-js';
import type { CommandResult } from '../lib/types/commands';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // List all users from Supabase Auth
    output.push('Fetching all users from Supabase Auth...');
    let allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;

    // Paginate through all auth users
    while (true) {
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        throw listError;
      }

      if (!listData.users || listData.users.length === 0) {
        break;
      }

      allUsers = allUsers.concat(listData.users);

      // If we got fewer than perPage, we've reached the end
      if (listData.users.length < perPage) {
        break;
      }

      page++;
    }

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
        output.push(`\nDeleting: ${user.user_metadata?.display_name || 'Unknown'} (${user.email})`);

        // Delete users table profile row
        try {
          const { error: profileError } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id);

          if (profileError) {
            throw profileError;
          }

          output.push(`  - Profile document deleted`);
          metadata.profilesDeleted++;
        } catch (error: any) {
          output.push(`  - Profile deletion failed: ${error.message}`);
        }

        // Delete user_practice_stats row
        try {
          const { error: statsError } = await supabase
            .from('user_practice_stats')
            .delete()
            .eq('user_id', user.id);

          if (statsError) {
            throw statsError;
          }

          output.push(`  - Stats document deleted`);
          metadata.statsDeleted++;
        } catch (error: any) {
          output.push(`  - Stats deletion failed: ${error.message}`);
        }

        // Delete any gratitude entries
        try {
          const { data: gratitudes, error: gratitudesFetchError } = await supabase
            .from('gratitude_entries')
            .select('id')
            .eq('user_id', user.id);

          if (!gratitudesFetchError && gratitudes && gratitudes.length > 0) {
            const { error: gratitudesDeleteError } = await supabase
              .from('gratitude_entries')
              .delete()
              .eq('user_id', user.id);

            if (gratitudesDeleteError) {
              throw gratitudesDeleteError;
            }

            output.push(`  - ${gratitudes.length} gratitude entries deleted`);
          }
        } catch (error: any) {
          output.push(`  - Gratitude deletion failed: ${error.message}`);
        }

        // Delete any user program enrollments
        try {
          const { data: enrollments, error: enrollmentsFetchError } = await supabase
            .from('user_program_enrollments')
            .select('id')
            .eq('user_id', user.id);

          if (!enrollmentsFetchError && enrollments && enrollments.length > 0) {
            const { error: enrollmentsDeleteError } = await supabase
              .from('user_program_enrollments')
              .delete()
              .eq('user_id', user.id);

            if (enrollmentsDeleteError) {
              throw enrollmentsDeleteError;
            }

            output.push(`  - ${enrollments.length} user program records deleted`);
          }
        } catch (error: any) {
          output.push(`  - User programs deletion failed: ${error.message}`);
        }

        // Delete Supabase Auth user
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteAuthError) {
          throw deleteAuthError;
        }

        output.push(`  - Auth user deleted`);
        output.push(`  - User deleted successfully!`);

        metadata.usersDeleted++;
      } catch (error: any) {
        output.push(`  - ERROR: ${error.message}`);
        metadata.usersFailed++;
        metadata.failedUsers.push({
          uid: user.id,
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
