/**
 * Script to remove custom claims (role) from a user
 * This sets them back to a regular app user
 * Usage: npx dotenv -e .env.local -- tsx scripts/remove-user-role.ts <email>
 *
 * Prerequisites:
 * - Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local
 */

import { getAuth } from '../lib/firebase/admin';

async function removeUserRole(email: string) {
  try {
    console.log(`🔧 Removing role from ${email}...`);

    const auth = getAuth();

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.uid}`);

    // Get current claims
    const currentClaims = userRecord.customClaims || {};
    console.log(`📋 Current claims:`, currentClaims);

    // Remove role claim
    if (currentClaims.role) {
      await auth.setCustomUserClaims(userRecord.uid, {});
      console.log(`✅ Role removed successfully!`);

      // Verify
      const updatedUser = await auth.getUser(userRecord.uid);
      console.log(`✅ Updated claims:`, updatedUser.customClaims || '(none)');

      console.log('\n📱 User will now be treated as a regular app user.');
      console.log('   They need to refresh their ID token to see the change.');
    } else {
      console.log('⚠️  User already has no role claim.');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('❌ Usage: npx dotenv -e .env.local -- tsx scripts/remove-user-role.ts <email>');
  console.error('   Example: npx dotenv -e .env.local -- tsx scripts/remove-user-role.ts user@ora.com');
  process.exit(1);
}

const [email] = args;

// Run the script
removeUserRole(email);
