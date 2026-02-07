/**
 * Script to list all users with admin/teacher/viewer roles
 * Usage: npx tsx scripts/list-admin-users.ts
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

async function listAdminUsers() {
  try {
    console.log('Listing users with custom roles...\n');

    const { data: adminUsers, error } = await supabase
      .from('users')
      .select('*')
      .neq('role', 'user')
      .not('role', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No users with custom roles found.');
      console.log('Create an admin user with:');
      console.log('   npx tsx scripts/set-user-role.ts <email> admin');
      return;
    }

    console.log(`Found ${adminUsers.length} user(s) with custom roles:\n`);

    adminUsers.forEach((user, index) => {
      const role = user.role || 'unknown';
      const roleEmoji: Record<string, string> = {
        admin: '[ADMIN]',
        teacher: '[TEACHER]',
        viewer: '[VIEWER]',
        user: '[USER]',
      };
      const label = roleEmoji[role as string] || '[?]';

      console.log(`${index + 1}. ${label} ${user.email || 'No email'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${role}`);
      console.log(`   Created: ${user.created_at || 'Unknown'}`);
      console.log(`   Last Sign In: ${user.last_login_at || 'Never'}`);
      console.log('');
    });

    // Summary
    const roleCounts = adminUsers.reduce((acc, user) => {
      const role = user.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Summary:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      const label: Record<string, string> = {
        admin: '[ADMIN]',
        teacher: '[TEACHER]',
        viewer: '[VIEWER]',
        user: '[USER]',
      };
      console.log(`   ${label[role] || '[?]'} ${role}: ${count}`);
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    process.exit(1);
  }
}

// Run the script
listAdminUsers();
