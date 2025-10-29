/**
 * Unit tests for /api/lessons/bulk
 * Tests bulk delete operations for lessons
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DELETE } from '@/app/api/lessons/bulk/route';
import {
  mockUsers,
  createMockLesson,
  createMockLessonDoc,
  createMockProgram,
  createMockProgramDoc,
  createMockFirestore,
  createAuthenticatedRequest,
  getResponseJson,
} from '../../utils/test-helpers';
import type { BulkOperationResponse } from '@/types/bulk-operations';

// Mock dependencies
vi.mock('@/lib/firebase/admin', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  deleteLessonMedia: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/api/auth-middleware', () => ({
  authenticateRequest: vi.fn(),
  requireRole: vi.fn((user, roles) => roles.includes(user.role)),
  apiError: vi.fn((message, status = 400) =>
    new Response(JSON.stringify({ error: message }), { status })
  ),
  apiSuccess: vi.fn((data, status = 200) =>
    new Response(JSON.stringify(data), { status })
  ),
}));

import { getFirestore } from '@/lib/firebase/admin';
import { deleteLessonMedia } from '@/lib/storage';
import { authenticateRequest } from '@/lib/api/auth-middleware';

describe('/api/lessons/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('DELETE - Bulk delete lessons', () => {
    it('should bulk delete lessons for admin', async () => {
      // Setup
      const lesson1 = createMockLesson({ id: 'lesson-1', programId: 'prog-1', authorId: mockUsers.teacher.uid });
      const lesson2 = createMockLesson({ id: 'lesson-2', programId: 'prog-1', authorId: mockUsers.teacher.uid });
      const lesson3 = createMockLesson({ id: 'lesson-3', programId: 'prog-1', authorId: mockUsers.teacherOther.uid });

      const program = createMockProgram({ id: 'prog-1' });

      const mockFirestore = createMockFirestore(
        [createMockProgramDoc(program)],
        [
          createMockLessonDoc(lesson1),
          createMockLessonDoc(lesson2),
          createMockLessonDoc(lesson3),
        ]
      );

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-1', 'lesson-2', 'lesson-3'],
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deleted).toBe(3);
      expect(data.failed).toBe(0);
      expect(mockFirestore._batch.delete).toHaveBeenCalledTimes(3);
      expect(mockFirestore._batch.commit).toHaveBeenCalled();
    });

    it('should bulk delete only own lessons for teacher', async () => {
      // Setup
      const lesson1 = createMockLesson({ id: 'lesson-1', authorId: mockUsers.teacher.uid });
      const lesson2 = createMockLesson({ id: 'lesson-2', authorId: mockUsers.teacherOther.uid }); // Not owned
      const lesson3 = createMockLesson({ id: 'lesson-3', authorId: mockUsers.teacher.uid });

      const mockFirestore = createMockFirestore(
        [],
        [
          createMockLessonDoc(lesson1),
          createMockLessonDoc(lesson2),
          createMockLessonDoc(lesson3),
        ]
      );

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.teacher);

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-1', 'lesson-2', 'lesson-3'],
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.deleted).toBe(2); // Only own lessons
      expect(data.failed).toBe(1);
      expect(data.errors).toBeDefined();
      expect(data.errors).toContain('Lesson lesson-2: Permission denied (not your lesson)');
    });

    it('should call deleteLessonMedia() for each lesson', async () => {
      // Setup
      const lesson1 = createMockLesson({ id: 'lesson-1', authorId: mockUsers.admin.uid });
      const lesson2 = createMockLesson({ id: 'lesson-2', authorId: mockUsers.admin.uid });

      const mockFirestore = createMockFirestore(
        [],
        [createMockLessonDoc(lesson1), createMockLessonDoc(lesson2)]
      );

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);
      vi.mocked(deleteLessonMedia).mockResolvedValue();

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-1', 'lesson-2'],
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.deleted).toBe(2);
      expect(deleteLessonMedia).toHaveBeenCalledTimes(2);
      expect(deleteLessonMedia).toHaveBeenCalledWith('lesson-1');
      expect(deleteLessonMedia).toHaveBeenCalledWith('lesson-2');
    });

    it('should continue deletion even if media deletion fails', async () => {
      // Setup
      const lesson1 = createMockLesson({ id: 'lesson-1', authorId: mockUsers.admin.uid });

      const mockFirestore = createMockFirestore([], [createMockLessonDoc(lesson1)]);

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);
      vi.mocked(deleteLessonMedia).mockRejectedValue(new Error('Storage error'));

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-1'],
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert - Lesson should still be deleted from Firestore
      expect(response.status).toBe(200);
      expect(data.deleted).toBe(1);
      expect(data.errors).toBeDefined();
      expect(data.errors?.some(e => e.includes('Storage cleanup failed'))).toBe(true);
    });

    it('should update program media_count', async () => {
      // Setup
      const program = createMockProgram({ id: 'prog-1' });
      const lesson1 = createMockLesson({ id: 'lesson-1', programId: 'prog-1', authorId: mockUsers.admin.uid });
      const lesson2 = createMockLesson({ id: 'lesson-2', programId: 'prog-1', authorId: mockUsers.admin.uid });

      // Mock program document with media_count
      const programDoc = {
        id: 'prog-1',
        exists: true,
        data: () => ({
          ...createMockProgramDoc(program).data(),
          media_count: 5,
        }),
      };

      const mockFirestore = createMockFirestore(
        [programDoc],
        [createMockLessonDoc(lesson1), createMockLessonDoc(lesson2)]
      );

      // Mock collection to return program doc for update
      const mockProgramRef = {
        id: 'prog-1',
        get: vi.fn().mockResolvedValue(programDoc),
        update: vi.fn(),
      };

      mockFirestore.collection = vi.fn((name: string) => {
        if (name === 'programs') {
          return {
            doc: vi.fn((id: string) => {
              if (id === 'prog-1') return mockProgramRef;
              return { get: vi.fn().mockResolvedValue({ exists: false }) };
            }),
          };
        }
        if (name === 'lessons') {
          return {
            doc: vi.fn((id: string) => {
              const lesson = [lesson1, lesson2].find(l => l.id === id);
              if (lesson) {
                return {
                  id,
                  get: vi.fn().mockResolvedValue(createMockLessonDoc(lesson)),
                };
              }
              return { get: vi.fn().mockResolvedValue({ exists: false }) };
            }),
          };
        }
        return { doc: vi.fn() };
      }) as any;

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-1', 'lesson-2'],
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.deleted).toBe(2);
      // Should update program batch with new media_count (5 - 2 = 3)
      expect(mockFirestore._batch.update).toHaveBeenCalled();
    });

    it('should handle batch splitting (> 500 items)', async () => {
      // Setup: Create 150 lessons to test batch behavior (smaller batch size for lessons)
      const lessons = Array.from({ length: 150 }, (_, i) =>
        createMockLesson({ id: `lesson-${i}`, authorId: mockUsers.admin.uid })
      );
      const lessonDocs = lessons.map(createMockLessonDoc);

      const mockFirestore = createMockFirestore([], lessonDocs);
      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        lessonIds: lessons.map((l) => l.id),
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.deleted).toBe(150);
      expect(data.failed).toBe(0);
      // With batch size 100, should commit twice: 100 + 50
      expect(mockFirestore._batch.commit).toHaveBeenCalledTimes(2);
    });

    it('should return partial success when some lessons fail', async () => {
      // Setup
      const lesson1 = createMockLesson({ id: 'lesson-1', authorId: mockUsers.admin.uid });

      const mockFirestore = createMockFirestore([], [createMockLessonDoc(lesson1)]);

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-1', 'lesson-2', 'lesson-3'], // Only lesson-1 exists
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.deleted).toBe(1);
      expect(data.failed).toBe(2);
      expect(data.errors).toBeDefined();
      expect(data.errors?.length).toBe(2);
    });

    it('should return 401 without authentication', async () => {
      // Setup
      vi.mocked(authenticateRequest).mockRejectedValue(new Error('Unauthorized'));

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-1'],
      });

      // Execute
      const response = await DELETE(request);

      // Assert
      expect(response.status).toBe(500); // Error handler returns 500
    });

    it('should return 403 for viewer role', async () => {
      // Setup
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.viewer);

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-1'],
      });

      // Execute
      const response = await DELETE(request);
      const data = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should return 400 with empty lessonIds array', async () => {
      // Setup
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        lessonIds: [],
      });

      // Execute
      const response = await DELETE(request);
      const data = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('lessonIds must be a non-empty array of valid strings');
    });

    it('should return 400 with invalid lessonIds (non-array)', async () => {
      // Setup
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        lessonIds: 'not-an-array',
      });

      // Execute
      const response = await DELETE(request);
      const data = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('lessonIds must be a non-empty array of valid strings');
    });

    it('should handle non-existent lesson IDs gracefully', async () => {
      // Setup
      const mockFirestore = createMockFirestore([], []); // No lessons exist

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-999', 'lesson-888'],
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.deleted).toBe(0);
      expect(data.failed).toBe(2);
      expect(data.errors).toContain('Lesson lesson-999: Not found');
      expect(data.errors).toContain('Lesson lesson-888: Not found');
    });

    it('should handle batch commit failures', async () => {
      // Setup
      const lesson = createMockLesson({ id: 'lesson-1', authorId: mockUsers.admin.uid });
      const mockFirestore = createMockFirestore([], [createMockLessonDoc(lesson)]);

      // Mock batch commit to fail
      mockFirestore._batch.commit.mockRejectedValueOnce(new Error('Firestore error'));

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-1'],
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.deleted).toBe(0); // Reverted on commit failure
      expect(data.failed).toBe(1);
      expect(data.errors).toBeDefined();
    });

    it('should update multiple programs media counts correctly', async () => {
      // Setup
      const program1 = createMockProgram({ id: 'prog-1' });
      const program2 = createMockProgram({ id: 'prog-2' });

      const lesson1 = createMockLesson({ id: 'lesson-1', programId: 'prog-1', authorId: mockUsers.admin.uid });
      const lesson2 = createMockLesson({ id: 'lesson-2', programId: 'prog-1', authorId: mockUsers.admin.uid });
      const lesson3 = createMockLesson({ id: 'lesson-3', programId: 'prog-2', authorId: mockUsers.admin.uid });

      const programDoc1 = {
        id: 'prog-1',
        exists: true,
        data: () => ({ ...createMockProgramDoc(program1).data(), media_count: 5 }),
      };

      const programDoc2 = {
        id: 'prog-2',
        exists: true,
        data: () => ({ ...createMockProgramDoc(program2).data(), media_count: 3 }),
      };

      const mockFirestore = createMockFirestore(
        [programDoc1, programDoc2],
        [createMockLessonDoc(lesson1), createMockLessonDoc(lesson2), createMockLessonDoc(lesson3)]
      );

      // Setup program collection mock
      mockFirestore.collection = vi.fn((name: string) => {
        if (name === 'programs') {
          return {
            doc: vi.fn((id: string) => {
              if (id === 'prog-1') return { id, get: vi.fn().mockResolvedValue(programDoc1) };
              if (id === 'prog-2') return { id, get: vi.fn().mockResolvedValue(programDoc2) };
              return { get: vi.fn().mockResolvedValue({ exists: false }) };
            }),
          };
        }
        if (name === 'lessons') {
          return {
            doc: vi.fn((id: string) => {
              const lesson = [lesson1, lesson2, lesson3].find(l => l.id === id);
              if (lesson) return { id, get: vi.fn().mockResolvedValue(createMockLessonDoc(lesson)) };
              return { get: vi.fn().mockResolvedValue({ exists: false }) };
            }),
          };
        }
        return { doc: vi.fn() };
      }) as any;

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        lessonIds: ['lesson-1', 'lesson-2', 'lesson-3'],
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.deleted).toBe(3);
      // Should update both programs
      const updateCalls = mockFirestore._batch.update.mock.calls;
      expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
