/**
 * Script to test database connection and list tables
 * Run with: npx tsx scripts/test-firestore.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabase() {
  console.log('🔍 Testing Supabase database connection...\n');

  try {
    // List all tables by querying information_schema
    console.log('📂 Listing all tables:');
    let tables: any[] | null = null;
    let tablesError: any = null;
    try {
      const result = await supabase.rpc('get_table_names');
      tables = result.data;
      tablesError = result.error;
    } catch {
      // Fallback: query known tables directly
      tablesError = { message: 'RPC not available, using fallback' };
    }

    if (tables && !tablesError) {
      if (tables.length === 0) {
        console.log('⚠️  No tables found!');
      } else {
        tables.forEach((table: any) => {
          console.log(`  - ${table.table_name || table}`);
        });
      }
    } else {
      console.log('  (Listing tables via known collection names)');
      const knownTables = ['users', 'programs', 'lessons', 'audit_logs', 'user_sessions', 'user_practice_stats'];
      for (const tableName of knownTables) {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`  - ${tableName} (${count} rows)`);
        } else {
          console.log(`  - ${tableName} (not found or no access)`);
        }
      }
    }

    console.log('\n📊 Checking specific tables:\n');

    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (usersError) {
      console.log(`Users table: Error - ${usersError.message}`);
    } else {
      console.log(`Users table: ${users?.length || 0} rows (showing first 5)`);
      users?.forEach((row) => {
        console.log(`  - ${row.id}:`, Object.keys(row));
      });
    }

    // Check programs table
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('*')
      .limit(5);

    if (programsError) {
      console.log(`\nPrograms table: Error - ${programsError.message}`);
    } else {
      console.log(`\nPrograms table: ${programs?.length || 0} rows (showing first 5)`);
      programs?.forEach((row) => {
        console.log(`  - ${row.id}:`, Object.keys(row));
      });
    }

    // Check lessons table
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .limit(5);

    if (lessonsError) {
      console.log(`\nLessons table: Error - ${lessonsError.message}`);
    } else {
      console.log(`\nLessons table: ${lessons?.length || 0} rows (showing first 5)`);
      lessons?.forEach((row) => {
        console.log(`  - ${row.id}:`, Object.keys(row));
      });
    }

    console.log('\n✅ Database connection test completed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase();
