/**
 * Script to set role for users
 * Usage: npx tsx scripts/set-user-role.ts <email> <role>
 * Example: npx tsx scripts/set-user-role.ts admin@ora.com admin
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

type UserRole = 'admin' | 'teacher' | 'viewer' | 'user';

async function setUserRole(email: string, role: UserRole) {
  try {
    console.log(`Setting role for ${email} to ${role}...`);

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

    // Set role
    const { error: updateError } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('email', email);

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.log(`Role set successfully!`);

    // Verify
    const { data: updatedUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (verifyError || !updatedUser) {
      console.warn('Could not verify update, but it may have succeeded.');
    } else {
      console.log(`Verified role: ${updatedUser.role}`);
    }

    console.log('\nDone! User role has been updated.');

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: npx tsx scripts/set-user-role.ts <email> <role>');
  console.error('   Roles: admin | teacher | viewer | user');
  console.error('   Example: npx tsx scripts/set-user-role.ts admin@ora.com admin');
  process.exit(1);
}

const [email, role] = args;

if (!['admin', 'teacher', 'viewer', 'user'].includes(role)) {
  console.error('Invalid role. Must be: admin, teacher, viewer, or user');
  process.exit(1);
}

// Run the script
setUserRole(email, role as UserRole);
