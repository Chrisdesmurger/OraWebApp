import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';

/**
 * GET /api/commands - List all commands
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const firestore = getFirestore();
    const commandsSnapshot = await firestore.collection('commands').orderBy('name', 'asc').get();

    const commands = commandsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return apiSuccess({ commands });
  } catch (error: any) {
    console.error('GET /api/commands error:', error);
    return apiError(error.message || 'Failed to fetch commands', 401);
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
    } catch (error: any) {
      status = 'error';
      output = error.message || 'Command execution failed';
    }

    // Log command execution
    const firestore = getFirestore();
    await firestore
      .collection('commands')
      .doc(commandName)
      .set(
        {
          name: commandName,
          label: getCommandLabel(commandName),
          lastRunAt: new Date().toISOString(),
          lastStatus: status,
          lastOutput: output,
          lastRunBy: user.uid,
        },
        { merge: true }
      );

    return apiSuccess({ status, output, commandName });
  } catch (error: any) {
    console.error('POST /api/commands error:', error);
    return apiError(error.message || 'Failed to execute command', 500);
  }
}

// Command implementations
async function executeSeedFakeUsers(count: number): Promise<string> {
  const { getAuth } = require('@/lib/firebase/admin');
  const { getFirestore } = require('@/lib/firebase/admin');

  const auth = getAuth();
  const firestore = getFirestore();

  const createdUsers: string[] = [];

  for (let i = 0; i < count; i++) {
    const email = `fake.user.${Date.now()}.${i}@example.com`;
    const userRecord = await auth.createUser({
      email,
      password: 'Password123!',
      displayName: `Fake User ${i + 1}`,
    });

    await firestore.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: null,
      role: 'viewer',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      isFake: true,
    });

    createdUsers.push(userRecord.uid);
  }

  return `✅ Created ${count} fake users:\n${createdUsers.join('\n')}`;
}

async function executePurgeFakeUsers(): Promise<string> {
  const { getAuth } = require('@/lib/firebase/admin');
  const { getFirestore } = require('@/lib/firebase/admin');

  const auth = getAuth();
  const firestore = getFirestore();

  const fakeUsersSnapshot = await firestore.collection('users').where('isFake', '==', true).get();

  const deletedUsers: string[] = [];

  for (const doc of fakeUsersSnapshot.docs) {
    try {
      await auth.deleteUser(doc.id);
      await doc.ref.delete();
      deletedUsers.push(doc.id);
    } catch (error: any) {
      console.error(`Failed to delete user ${doc.id}:`, error);
    }
  }

  return `✅ Purged ${deletedUsers.length} fake users`;
}

async function executeSeedSampleContent(): Promise<string> {
  const { getFirestore } = require('@/lib/firebase/admin');
  const firestore = getFirestore();

  // Get first admin user to be the author
  const adminsSnapshot = await firestore.collection('users').where('role', '==', 'admin').limit(1).get();

  if (adminsSnapshot.empty) {
    throw new Error('No admin users found. Cannot seed content.');
  }

  const authorId = adminsSnapshot.docs[0].id;

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
    const programRef = firestore.collection('programs').doc();
    await programRef.set({
      ...program,
      authorId,
      coverUrl: null,
      mediaCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    createdPrograms.push(programRef.id);
  }

  return `✅ Created ${createdPrograms.length} sample programs`;
}

async function executeWipeDemoData(): Promise<string> {
  const { getFirestore } = require('@/lib/firebase/admin');
  const firestore = getFirestore();

  let deletedCount = 0;

  // Delete fake users
  const fakeUsersSnapshot = await firestore.collection('users').where('isFake', '==', true).get();
  for (const doc of fakeUsersSnapshot.docs) {
    await doc.ref.delete();
    deletedCount++;
  }

  // Delete all programs and lessons (optional - be careful!)
  const programsSnapshot = await firestore.collection('programs').get();
  for (const doc of programsSnapshot.docs) {
    await doc.ref.delete();
    deletedCount++;
  }

  const lessonsSnapshot = await firestore.collection('lessons').get();
  for (const doc of lessonsSnapshot.docs) {
    await doc.ref.delete();
    deletedCount++;
  }

  return `⚠️  Wiped ${deletedCount} demo data items (fake users, programs, lessons)`;
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
