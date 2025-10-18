/**
 * Script to set custom claims (role) for users
 * Usage: npx tsx --env-file=.env.local scripts/set-user-role.ts <email> <role>
 * Example: npx tsx --env-file=.env.local scripts/set-user-role.ts admin@ora.com admin
 *
 * Prerequisites:
 * - Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local
 */

import { getAuth } from '../lib/firebase/admin';

type UserRole = 'admin' | 'teacher' | 'viewer' | 'user';

async function setUserRole(email: string, role: UserRole) {
  try {
    console.log(`🔧 Setting role for ${email} to ${role}...`);

    const auth = getAuth();

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.uid}`);

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role });
    console.log(`✅ Custom claims set successfully!`);

    // Verify
    const updatedUser = await auth.getUser(userRecord.uid);
    console.log(`✅ Verified custom claims:`, updatedUser.customClaims);

    console.log('\n📱 Client-side: User needs to refresh their ID token:');
    console.log('   firebase.auth().currentUser.getIdToken(true)');
    console.log('\n🎉 Done! User can now access admin features.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Usage: npx tsx --env-file=.env.local scripts/set-user-role.ts <email> <role>');
  console.error('   Roles: admin | teacher | viewer | user');
  console.error('   Example: npx tsx --env-file=.env.local scripts/set-user-role.ts admin@ora.com admin');
  process.exit(1);
}

const [email, role] = args;

if (!['admin', 'teacher', 'viewer', 'user'].includes(role)) {
  console.error('❌ Invalid role. Must be: admin, teacher, viewer, or user');
  process.exit(1);
}

// Run the script
setUserRole(email, role as UserRole);
