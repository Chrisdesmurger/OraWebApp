import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/commands - List all commands
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const supabase = createSupabaseServiceClient();
    const { data: rows, error } = await supabase
      .from('commands')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('GET /api/commands Supabase error:', error);
      return apiError('Failed to fetch commands', 500);
    }

    const commands = (rows || []).map((row) => ({
      id: row.id,
      ...row,
    }));

    return apiSuccess({ commands });
  } catch (error: unknown) {
    console.error('GET /api/commands error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch commands';
    return apiError(message, 401);
  }
}

/**
 * POST /api/commands - Execute a command
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Only admins can execute commands', 403);
    }

    const body = await request.json();
    const { commandName, params = {} } = body;

    if (!commandName) {
      return apiError('Command name is required', 400);
    }

    // Execute command based on commandName
    let output = '';
    let status = 'success';

    try {
      switch (commandName) {
        case 'seedFakeUsers':
          output = await executeSeedFakeUsers(params.count || 10);
          break;
        case 'purgeFakeUsers':
          output = await executePurgeFakeUsers();
          break;
        case 'seedSampleContent':
          output = await executeSeedSampleContent();
          break;
        case 'wipeDemoData':
          output = await executeWipeDemoData();
          break;
        default:
          return apiError(`Unknown command: ${commandName}`, 400);
      }
    } catch (error: unknown) {
      status = 'error';
      output = error instanceof Error ? error.message : 'Command execution failed';
    }

    // Log command execution
    const supabase = createSupabaseServiceClient();
    await supabase
      .from('commands')
      .upsert(
        {
          name: commandName,
          label: getCommandLabel(commandName),
          last_run_at: new Date().toISOString(),
          last_status: status,
          last_output: output,
          last_run_by: user.uid,
        },
        { onConflict: 'name' }
      );

    return apiSuccess({ status, output, commandName });
  } catch (error: unknown) {
    console.error('POST /api/commands error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute command';
    return apiError(message, 500);
  }
}

// Command implementations using Supabase
async function executeSeedFakeUsers(count: number): Promise<string> {
  const supabase = createSupabaseServiceClient();

  const createdUsers: string[] = [];

  for (let i = 0; i < count; i++) {
    const email = `fake.user.${Date.now()}.${i}@example.com`;

    // Create user via Supabase Auth admin
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'Password123!',
      user_metadata: { display_name: `Fake User ${i + 1}` },
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      console.error(`Failed to create fake user ${i}:`, authError);
      continue;
    }

    // Insert user record
    await supabase.from('users').insert({
      id: authUser.user.id,
      email: authUser.user.email,
      display_name: `Fake User ${i + 1}`,
      photo_url: null,
      role: 'viewer',
      created_at: new Date().toISOString(),
      last_login_at: null,
      is_fake: true,
    });

    createdUsers.push(authUser.user.id);
  }

  return `Created ${createdUsers.length} fake users:\n${createdUsers.join('\n')}`;
}

async function executePurgeFakeUsers(): Promise<string> {
  const supabase = createSupabaseServiceClient();

  const { data: fakeUsers } = await supabase
    .from('users')
    .select('id')
    .eq('is_fake', true);

  const deletedUsers: string[] = [];

  for (const user of (fakeUsers || [])) {
    try {
      await supabase.auth.admin.deleteUser(user.id);
      await supabase.from('users').delete().eq('id', user.id);
      deletedUsers.push(user.id);
    } catch (error) {
      console.error(`Failed to delete user ${user.id}:`, error);
    }
  }

  return `Purged ${deletedUsers.length} fake users`;
}

async function executeSeedSampleContent(): Promise<string> {
  const supabase = createSupabaseServiceClient();

  // Get first admin user to be the author
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1);

  if (!admins || admins.length === 0) {
    throw new Error('No admin users found. Cannot seed content.');
  }

  const authorId = admins[0].id;

  const samplePrograms = [
    {
      title: 'Meditation for Beginners',
      description: 'Learn the basics of meditation',
      level: 'beginner',
      tags: ['meditation', 'mindfulness'],
      status: 'published',
    },
    {
      title: 'Advanced Yoga Flow',
      description: 'Challenge yourself with advanced poses',
      level: 'advanced',
      tags: ['yoga', 'fitness'],
      status: 'published',
    },
    {
      title: 'Stress Relief Program',
      description: 'Reduce stress and anxiety',
      level: 'intermediate',
      tags: ['stress', 'relaxation'],
      status: 'published',
    },
  ];

  const createdPrograms: string[] = [];

  for (const program of samplePrograms) {
    const { data: created, error } = await supabase
      .from('programs')
      .insert({
        ...program,
        author_id: authorId,
        cover_url: null,
        media_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (created) {
      createdPrograms.push(created.id);
    }
  }

  return `Created ${createdPrograms.length} sample programs`;
}

async function executeWipeDemoData(): Promise<string> {
  const supabase = createSupabaseServiceClient();

  let deletedCount = 0;

  // Delete fake users
  const { data: fakeUsers } = await supabase
    .from('users')
    .select('id')
    .eq('is_fake', true);

  for (const user of (fakeUsers || [])) {
    await supabase.from('users').delete().eq('id', user.id);
    deletedCount++;
  }

  // Delete all programs and lessons (optional - be careful!)
  const { data: programs } = await supabase.from('programs').select('id');
  for (const program of (programs || [])) {
    await supabase.from('programs').delete().eq('id', program.id);
    deletedCount++;
  }

  const { data: lessons } = await supabase.from('lessons').select('id');
  for (const lesson of (lessons || [])) {
    await supabase.from('lessons').delete().eq('id', lesson.id);
    deletedCount++;
  }

  return `Wiped ${deletedCount} demo data items (fake users, programs, lessons)`;
}

function getCommandLabel(commandName: string): string {
  const labels: Record<string, string> = {
    seedFakeUsers: 'Seed Fake Users',
    purgeFakeUsers: 'Purge Fake Users',
    seedSampleContent: 'Seed Sample Content',
    wipeDemoData: 'Wipe Demo Data',
  };
  return labels[commandName] || commandName;
}
