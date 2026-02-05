/**
 * Script to remove custom role from a user (reset to 'user')
 * Usage: npx tsx scripts/remove-user-role.ts <email>
 *
 * Prerequisites:
 * - Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeUserRole(email: string) {
  try {
    console.log(`Removing role from ${email}...`);

    // Get user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (findError || !user) {
      throw new Error(findError?.message || `User with email ${email} not found`);
    }

    console.log(`Found user: ${user.id}`);
    console.log(`Current role: ${user.role || '(none)'}`);

    // Check if user has a non-default role
    if (!user.role || user.role === 'user') {
      console.log('User already has no elevated role.');
      return;
    }

    // Reset role to 'user'
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'user', updated_at: new Date().toISOString() })
      .eq('email', email);

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.log(`Role removed successfully!`);

    // Verify
    const { data: updatedUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (!verifyError && updatedUser) {
      console.log(`Updated role: ${updatedUser.role}`);
    }

    console.log('\nUser will now be treated as a regular app user.');

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: npx tsx scripts/remove-user-role.ts <email>');
  console.error('   Example: npx tsx scripts/remove-user-role.ts user@ora.com');
  process.exit(1);
}

const [email] = args;

// Run the script
removeUserRole(email);
