/**
 * Script to list all users with admin/teacher/viewer roles
 * Usage: npx dotenv -e .env.local -- tsx scripts/list-admin-users.ts
 *
 * Prerequisites:
 * - Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local
 */

import { getAuth } from '../lib/firebase/admin';

async function listAdminUsers() {
  try {
    console.log('📋 Listing users with custom roles...\n');

    const auth = getAuth();
    const listUsersResult = await auth.listUsers(1000);

    const adminUsers = listUsersResult.users.filter(
      (user) => user.customClaims && user.customClaims.role
    );

    if (adminUsers.length === 0) {
      console.log('⚠️  No users with custom roles found.');
      console.log('💡 Create an admin user with:');
      console.log('   npx dotenv -e .env.local -- tsx scripts/set-user-role.ts <email> admin');
      return;
    }

    console.log(`✅ Found ${adminUsers.length} user(s) with custom roles:\n`);

    adminUsers.forEach((user, index) => {
      const role = user.customClaims?.role || 'unknown';
      const roleEmoji = {
        admin: '👑',
        teacher: '👨‍🏫',
        viewer: '👁️',
        user: '👤',
      }[role] || '❓';

      console.log(`${index + 1}. ${roleEmoji} ${user.email || 'No email'}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Role: ${role}`);
      console.log(`   Created: ${user.metadata.creationTime}`);
      console.log(`   Last Sign In: ${user.metadata.lastSignInTime || 'Never'}`);
      console.log('');
    });

    // Summary
    const roleCounts = adminUsers.reduce((acc, user) => {
      const role = user.customClaims?.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Summary:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      const roleEmoji = {
        admin: '👑',
        teacher: '👨‍🏫',
        viewer: '👁️',
        user: '👤',
      }[role] || '❓';
      console.log(`   ${roleEmoji} ${role}: ${count}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
listAdminUsers();
