/**
 * Test utilities and mock helpers for bulk operations tests
 */

import { vi } from 'vitest';
import type { AuthenticatedRequest } from '@/lib/api/auth-middleware';
import type { Program } from '@/types/program';
import type { Lesson } from '@/types/lesson';

/**
 * Mock authenticated users with different roles
 */
export const mockUsers = {
  admin: {
    uid: 'admin-123',
    email: 'admin@test.com',
    role: 'admin' as const,
  },
  teacher: {
    uid: 'teacher-456',
    email: 'teacher@test.com',
    role: 'teacher' as const,
  },
  teacherOther: {
    uid: 'teacher-789',
    email: 'other-teacher@test.com',
    role: 'teacher' as const,
  },
  viewer: {
    uid: 'viewer-999',
    email: 'viewer@test.com',
    role: 'viewer' as const,
  },
} satisfies Record<string, AuthenticatedRequest>;

/**
 * Mock program data for testing
 */
export const createMockProgram = (overrides?: Partial<Program>): Program => ({
  id: 'prog-123',
  title: 'Test Program',
  description: 'Test description',
  category: 'meditation',
  difficulty: 'beginner',
  durationDays: 7,
  status: 'draft',
  authorId: mockUsers.teacher.uid,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  tags: ['test', 'meditation'],
  lessons: [],
  ...overrides,
});

/**
 * Mock lesson data for testing
 */
export const createMockLesson = (overrides?: Partial<Lesson>): Lesson => ({
  id: 'lesson-123',
  title: 'Test Lesson',
  description: 'Test lesson description',
  type: 'video',
  programId: 'prog-123',
  order: 1,
  status: 'draft',
  authorId: mockUsers.teacher.uid,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  tags: ['test'],
  mediaUrl: 'https://example.com/video.mp4',
  ...overrides,
});

/**
 * Mock Firestore document
 */
export interface MockFirestoreDoc<T = any> {
  id: string;
  exists: boolean;
  data: () => T | undefined;
}

export const createMockFirestoreDoc = <T>(id: string, data: T, exists = true): MockFirestoreDoc<T> => ({
  id,
  exists,
  data: () => (exists ? data : undefined),
});

/**
 * Mock Firestore document snapshot (with snake_case fields for Firestore)
 */
export const createMockProgramDoc = (program: Program) => {
  return createMockFirestoreDoc(program.id, {
    title: program.title,
    description: program.description,
    category: program.category,
    difficulty: program.difficulty,
    duration_days: program.durationDays,
    status: program.status,
    author_id: program.authorId,
    created_at: program.createdAt,
    updated_at: program.updatedAt,
    tags: program.tags,
  });
};

export const createMockLessonDoc = (lesson: Lesson) => {
  return createMockFirestoreDoc(lesson.id, {
    title: lesson.title,
    description: lesson.description,
    type: lesson.type,
    program_id: lesson.programId,
    order: lesson.order,
    status: lesson.status,
    author_id: lesson.authorId,
    created_at: lesson.createdAt,
    updated_at: lesson.updatedAt,
    tags: lesson.tags,
    media_url: lesson.mediaUrl,
  });
};

/**
 * Mock Firestore batch
 */
export const createMockFirestoreBatch = () => {
  const operations: Array<{ type: 'delete' | 'update'; ref: any; data?: any }> = [];

  return {
    delete: vi.fn((ref) => {
      operations.push({ type: 'delete', ref });
    }),
    update: vi.fn((ref, data) => {
      operations.push({ type: 'update', ref, data });
    }),
    commit: vi.fn().mockResolvedValue(undefined),
    operations,
  };
};

/**
 * Mock Firestore collection reference
 */
export const createMockCollection = (docs: MockFirestoreDoc[] = []) => {
  return {
    doc: vi.fn((id: string) => {
      const doc = docs.find((d) => d.id === id);
      return {
        id,
        get: vi.fn().mockResolvedValue(doc || createMockFirestoreDoc(id, {}, false)),
        delete: vi.fn(),
        update: vi.fn(),
      };
    }),
  };
};

/**
 * Mock Firestore instance
 */
export const createMockFirestore = (programDocs: MockFirestoreDoc[] = [], lessonDocs: MockFirestoreDoc[] = []) => {
  const batch = createMockFirestoreBatch();

  return {
    collection: vi.fn((name: string) => {
      if (name === 'programs') {
        return createMockCollection(programDocs);
      }
      if (name === 'lessons') {
        return createMockCollection(lessonDocs);
      }
      return createMockCollection();
    }),
    batch: vi.fn(() => batch),
    _batch: batch, // Expose for testing
  };
};

/**
 * Mock Next.js Request
 */
export const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(headers),
  } as any;
};

/**
 * Create mock request with authentication header
 */
export const createAuthenticatedRequest = (body: any, token = 'mock-token') => {
  return createMockRequest(body, {
    authorization: `Bearer ${token}`,
  });
};

/**
 * Helper to extract JSON from Response
 */
export const getResponseJson = async (response: Response) => {
  return await response.json();
};

/**
 * Assertion helpers
 */
export const expectSuccessResponse = async (response: Response, expectedStatus = 200) => {
  const data = await getResponseJson(response);
  return {
    status: response.status,
    data,
    toBe: (status: number) => {
      if (response.status !== status) {
        throw new Error(`Expected status ${status}, got ${response.status}`);
      }
    },
  };
};

export const expectErrorResponse = async (response: Response, expectedStatus: number) => {
  const data = await getResponseJson(response);
  return {
    status: response.status,
    error: data.error,
    toBe: (status: number) => {
      if (response.status !== status) {
        throw new Error(`Expected status ${status}, got ${response.status}`);
      }
    },
  };
};
