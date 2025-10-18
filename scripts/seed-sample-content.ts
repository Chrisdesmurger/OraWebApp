/**
 * Seed Sample Content Script
 * Adds sample meditation/yoga programs and lessons to the database
 */

import { getFirestore } from '../lib/firebase/admin';
import type { CommandResult } from '../lib/types/commands';

interface Program {
  id: string;
  title: string;
  description: string;
  category: 'meditation' | 'yoga' | 'breathing' | 'sleep';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // total minutes
  sessionsCount: number;
  imageUrl?: string;
  isPremium: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Lesson {
  id: string;
  programId: string;
  title: string;
  description: string;
  order: number;
  duration: number; // minutes
  videoUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

const SAMPLE_PROGRAMS: Program[] = [
  {
    id: 'meditation-beginners',
    title: 'Meditation for Beginners',
    description: 'A gentle introduction to mindfulness meditation. Learn the basics and build a daily practice.',
    category: 'meditation',
    difficulty: 'beginner',
    duration: 70,
    sessionsCount: 7,
    isPremium: false,
    tags: ['mindfulness', 'beginner', 'daily-practice'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'yoga-morning-flow',
    title: 'Morning Yoga Flow',
    description: 'Start your day with energy and clarity. A 21-day program to establish your morning yoga routine.',
    category: 'yoga',
    difficulty: 'intermediate',
    duration: 420,
    sessionsCount: 21,
    isPremium: true,
    tags: ['morning', 'energy', 'flexibility'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'breathing-stress-relief',
    title: 'Breathing for Stress Relief',
    description: 'Master powerful breathing techniques to reduce stress and anxiety in just 5 minutes.',
    category: 'breathing',
    difficulty: 'beginner',
    duration: 50,
    sessionsCount: 10,
    isPremium: false,
    tags: ['stress-relief', 'anxiety', 'quick'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sleep-better-tonight',
    title: 'Sleep Better Tonight',
    description: 'Deep relaxation and sleep meditation to help you fall asleep faster and sleep more soundly.',
    category: 'sleep',
    difficulty: 'beginner',
    duration: 140,
    sessionsCount: 14,
    isPremium: true,
    tags: ['sleep', 'relaxation', 'insomnia'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'advanced-meditation',
    title: 'Advanced Meditation Mastery',
    description: 'Deepen your practice with advanced techniques including visualization and energy work.',
    category: 'meditation',
    difficulty: 'advanced',
    duration: 450,
    sessionsCount: 30,
    isPremium: true,
    tags: ['advanced', 'visualization', 'energy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'yoga-flexibility',
    title: 'Yoga for Flexibility',
    description: 'Increase your flexibility and range of motion with targeted yoga sequences.',
    category: 'yoga',
    difficulty: 'beginner',
    duration: 180,
    sessionsCount: 12,
    isPremium: false,
    tags: ['flexibility', 'stretching', 'mobility'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SAMPLE_LESSONS: Record<string, Omit<Lesson, 'id' | 'programId'>[]> = {
  'meditation-beginners': [
    {
      title: 'What is Meditation?',
      description: 'An introduction to meditation and its benefits.',
      order: 1,
      duration: 10,
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      title: 'Finding Your Posture',
      description: 'Learn the best sitting positions for meditation.',
      order: 2,
      duration: 10,
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      title: 'Breath Awareness',
      description: 'Focus on your breath as an anchor for meditation.',
      order: 3,
      duration: 10,
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      title: 'Body Scan Meditation',
      description: 'Learn to relax your body systematically.',
      order: 4,
      duration: 10,
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      title: 'Working with Thoughts',
      description: 'Understand how to observe thoughts without judgment.',
      order: 5,
      duration: 10,
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      title: 'Loving-Kindness Meditation',
      description: 'Cultivate compassion for yourself and others.',
      order: 6,
      duration: 10,
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      title: 'Building Your Daily Practice',
      description: 'Tips for establishing a consistent meditation habit.',
      order: 7,
      duration: 10,
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  'yoga-morning-flow': Array.from({ length: 21 }, (_, i) => ({
    title: `Day ${i + 1} - Morning Flow`,
    description: `Morning yoga sequence for day ${i + 1}`,
    order: i + 1,
    duration: 20,
    isPremium: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  'breathing-stress-relief': Array.from({ length: 10 }, (_, i) => ({
    title: `Technique ${i + 1}`,
    description: `Breathing exercise ${i + 1} for stress relief`,
    order: i + 1,
    duration: 5,
    isPremium: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  'sleep-better-tonight': Array.from({ length: 14 }, (_, i) => ({
    title: `Sleep Meditation - Night ${i + 1}`,
    description: `Guided meditation for better sleep`,
    order: i + 1,
    duration: 10,
    isPremium: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  'advanced-meditation': Array.from({ length: 30 }, (_, i) => ({
    title: `Advanced Practice ${i + 1}`,
    description: `Advanced meditation technique`,
    order: i + 1,
    duration: 15,
    isPremium: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  'yoga-flexibility': Array.from({ length: 12 }, (_, i) => ({
    title: `Flexibility Session ${i + 1}`,
    description: `Yoga sequence for increased flexibility`,
    order: i + 1,
    duration: 15,
    isPremium: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
};

export async function seedSampleContent(): Promise<CommandResult> {
  const output: string[] = [];
  const metadata: Record<string, any> = {
    programsCreated: 0,
    lessonsCreated: 0,
    programsFailed: 0,
    lessonsFailed: 0,
  };

  try {
    output.push('Starting sample content seeding process...');
    output.push(`Creating ${SAMPLE_PROGRAMS.length} programs...`);

    const db = getFirestore();

    // Create programs
    for (const program of SAMPLE_PROGRAMS) {
      try {
        output.push(`\nCreating program: ${program.title}`);

        await db.collection('programs').doc(program.id).set(program);
        output.push(`  - Program created successfully`);
        metadata.programsCreated++;

        // Create lessons for this program
        const lessons = SAMPLE_LESSONS[program.id] || [];
        output.push(`  - Creating ${lessons.length} lessons...`);

        for (let i = 0; i < lessons.length; i++) {
          const lessonData = lessons[i];
          const lessonId = `${program.id}-lesson-${i + 1}`;

          try {
            const lesson: Lesson = {
              id: lessonId,
              programId: program.id,
              ...lessonData,
            };

            await db.collection('lessons').doc(lessonId).set(lesson);
            metadata.lessonsCreated++;
          } catch (error: any) {
            output.push(`    - Lesson ${i + 1} failed: ${error.message}`);
            metadata.lessonsFailed++;
          }
        }

        output.push(`  - ${metadata.lessonsCreated} lessons created`);
      } catch (error: any) {
        output.push(`  - ERROR: ${error.message}`);
        metadata.programsFailed++;
      }
    }

    output.push(`\n========================================`);
    output.push(`Seeding complete!`);
    output.push(`Programs created: ${metadata.programsCreated}`);
    output.push(`Lessons created: ${metadata.lessonsCreated}`);
    output.push(`Programs failed: ${metadata.programsFailed}`);
    output.push(`Lessons failed: ${metadata.lessonsFailed}`);
    output.push(`========================================`);

    return {
      success: metadata.programsFailed === 0 && metadata.lessonsFailed === 0,
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
  seedSampleContent()
    .then((result) => {
      console.log(result.output.join('\n'));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
