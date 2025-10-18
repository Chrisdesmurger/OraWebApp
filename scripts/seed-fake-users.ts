/**
 * Seed Fake Users Script
 * Generates fake users with sample data for testing
 */

import { getAuth, getFirestore } from '../lib/firebase/admin';
import type { CommandResult } from '../lib/types/commands';

const FAKE_USER_PREFIX = 'fake_user_';

interface FakeUser {
  email: string;
  password: string;
  displayName: string;
  profile: {
    firstName: string;
    lastName: string;
    motto?: string;
    photoUrl?: string;
    planTier: 'free' | 'premium';
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    totalSessions: number;
    totalMinutes: number;
    currentStreak: number;
    longestStreak: number;
    completedPrograms: number;
    badges: string[];
    lastActive: string;
    createdAt: string;
    updatedAt: string;
  };
}

const FAKE_USERS: Omit<FakeUser, 'email'>[] = [
  {
    password: 'Test123!',
    displayName: 'Alice Wonder',
    profile: {
      firstName: 'Alice',
      lastName: 'Wonder',
      motto: 'Exploring mindfulness one breath at a time',
      planTier: 'premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalSessions: 45,
      totalMinutes: 720,
      currentStreak: 7,
      longestStreak: 14,
      completedPrograms: 3,
      badges: ['early_bird', 'week_warrior', 'zen_master'],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    password: 'Test123!',
    displayName: 'Bob Builder',
    profile: {
      firstName: 'Bob',
      lastName: 'Builder',
      motto: 'Building a better me',
      planTier: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalSessions: 23,
      totalMinutes: 345,
      currentStreak: 3,
      longestStreak: 8,
      completedPrograms: 1,
      badges: ['first_session', 'week_warrior'],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    password: 'Test123!',
    displayName: 'Charlie Chen',
    profile: {
      firstName: 'Charlie',
      lastName: 'Chen',
      motto: 'Peace within, peace without',
      planTier: 'premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalSessions: 67,
      totalMinutes: 1200,
      currentStreak: 12,
      longestStreak: 21,
      completedPrograms: 5,
      badges: ['early_bird', 'week_warrior', 'zen_master', 'meditation_monk'],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    password: 'Test123!',
    displayName: 'Diana Prince',
    profile: {
      firstName: 'Diana',
      lastName: 'Prince',
      motto: 'Strength through stillness',
      planTier: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalSessions: 12,
      totalMinutes: 180,
      currentStreak: 2,
      longestStreak: 5,
      completedPrograms: 0,
      badges: ['first_session'],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    password: 'Test123!',
    displayName: 'Eva Martinez',
    profile: {
      firstName: 'Eva',
      lastName: 'Martinez',
      motto: 'Grateful for every moment',
      planTier: 'premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalSessions: 89,
      totalMinutes: 1560,
      currentStreak: 18,
      longestStreak: 30,
      completedPrograms: 7,
      badges: ['early_bird', 'week_warrior', 'zen_master', 'meditation_monk', 'gratitude_guru'],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    password: 'Test123!',
    displayName: 'Frank Ocean',
    profile: {
      firstName: 'Frank',
      lastName: 'Ocean',
      motto: 'Riding the waves of life',
      planTier: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalSessions: 34,
      totalMinutes: 510,
      currentStreak: 5,
      longestStreak: 10,
      completedPrograms: 2,
      badges: ['first_session', 'week_warrior', 'zen_master'],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    password: 'Test123!',
    displayName: 'Grace Kim',
    profile: {
      firstName: 'Grace',
      lastName: 'Kim',
      motto: 'Finding grace in every breath',
      planTier: 'premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalSessions: 56,
      totalMinutes: 900,
      currentStreak: 9,
      longestStreak: 16,
      completedPrograms: 4,
      badges: ['early_bird', 'week_warrior', 'zen_master', 'meditation_monk'],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    password: 'Test123!',
    displayName: 'Henry Ford',
    profile: {
      firstName: 'Henry',
      lastName: 'Ford',
      motto: 'Driving towards inner peace',
      planTier: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalSessions: 8,
      totalMinutes: 120,
      currentStreak: 1,
      longestStreak: 3,
      completedPrograms: 0,
      badges: ['first_session'],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    password: 'Test123!',
    displayName: 'Iris Watson',
    profile: {
      firstName: 'Iris',
      lastName: 'Watson',
      motto: 'Blooming with mindfulness',
      planTier: 'premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalSessions: 72,
      totalMinutes: 1320,
      currentStreak: 15,
      longestStreak: 25,
      completedPrograms: 6,
      badges: ['early_bird', 'week_warrior', 'zen_master', 'meditation_monk', 'gratitude_guru'],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    password: 'Test123!',
    displayName: 'Jack Daniels',
    profile: {
      firstName: 'Jack',
      lastName: 'Daniels',
      motto: 'One day at a time',
      planTier: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalSessions: 19,
      totalMinutes: 285,
      currentStreak: 4,
      longestStreak: 7,
      completedPrograms: 1,
      badges: ['first_session', 'week_warrior'],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

export async function seedFakeUsers(): Promise<CommandResult> {
  const output: string[] = [];
  const metadata: Record<string, any> = {
    usersCreated: 0,
    usersFailed: 0,
    failedUsers: [],
  };

  try {
    output.push('Starting fake user seeding process...');
    output.push(`Creating ${FAKE_USERS.length} fake users...`);

    const auth = getAuth();
    const db = getFirestore();

    for (let i = 0; i < FAKE_USERS.length; i++) {
      const userData = FAKE_USERS[i];
      const email = `${FAKE_USER_PREFIX}${i + 1}@oraapp.test`;

      try {
        output.push(`\nCreating user: ${userData.displayName} (${email})`);

        // Create Firebase Auth user
        const userRecord = await auth.createUser({
          email,
          password: userData.password,
          displayName: userData.displayName,
          emailVerified: true,
        });

        output.push(`  - Firebase Auth user created: ${userRecord.uid}`);

        // Create Firestore profile document
        await db.collection('users').doc(userRecord.uid).set({
          ...userData.profile,
          email,
          uid: userRecord.uid,
        });

        output.push(`  - Profile document created`);

        // Create Firestore stats document
        await db.collection('stats').doc(userRecord.uid).set(userData.stats);

        output.push(`  - Stats document created`);
        output.push(`  - User created successfully!`);

        metadata.usersCreated++;
      } catch (error: any) {
        output.push(`  - ERROR: ${error.message}`);
        metadata.usersFailed++;
        metadata.failedUsers.push({ email, error: error.message });
      }
    }

    output.push(`\n========================================`);
    output.push(`Seeding complete!`);
    output.push(`Success: ${metadata.usersCreated} users`);
    output.push(`Failed: ${metadata.usersFailed} users`);
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
  seedFakeUsers()
    .then((result) => {
      console.log(result.output.join('\n'));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
