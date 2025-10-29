/**
 * Unit tests for /api/programs/bulk
 * Tests bulk delete and bulk update operations for programs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DELETE, PATCH } from '@/app/api/programs/bulk/route';
import {
  mockUsers,
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
import { authenticateRequest } from '@/lib/api/auth-middleware';

describe('/api/programs/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('DELETE - Bulk delete programs', () => {
    it('should bulk delete programs for admin', async () => {
      // Setup
      const program1 = createMockProgram({ id: 'prog-1', authorId: mockUsers.teacher.uid });
      const program2 = createMockProgram({ id: 'prog-2', authorId: mockUsers.teacherOther.uid });
      const program3 = createMockProgram({ id: 'prog-3', authorId: mockUsers.teacher.uid });

      const mockFirestore = createMockFirestore([
        createMockProgramDoc(program1),
        createMockProgramDoc(program2),
        createMockProgramDoc(program3),
      ]);

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: ['prog-1', 'prog-2', 'prog-3'],
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
      expect(mockFirestore._batch.commit).toHaveBeenCalledTimes(1);
    });

    it('should bulk delete only own programs for teacher', async () => {
      // Setup
      const program1 = createMockProgram({ id: 'prog-1', authorId: mockUsers.teacher.uid });
      const program2 = createMockProgram({ id: 'prog-2', authorId: mockUsers.teacherOther.uid }); // Not owned
      const program3 = createMockProgram({ id: 'prog-3', authorId: mockUsers.teacher.uid });

      const mockFirestore = createMockFirestore([
        createMockProgramDoc(program1),
        createMockProgramDoc(program2),
        createMockProgramDoc(program3),
      ]);

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.teacher);

      const request = createAuthenticatedRequest({
        programIds: ['prog-1', 'prog-2', 'prog-3'],
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(false); // Has errors
      expect(data.deleted).toBe(2); // Only own programs
      expect(data.failed).toBe(1); // One permission denied
      expect(data.errors).toBeDefined();
      expect(data.errors).toContain('Program prog-2: Permission denied (not your program)');
      expect(mockFirestore._batch.delete).toHaveBeenCalledTimes(2);
    });

    it('should return 401 without authentication', async () => {
      // Setup
      vi.mocked(authenticateRequest).mockRejectedValue(new Error('Unauthorized'));

      const request = createAuthenticatedRequest({
        programIds: ['prog-1'],
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
        programIds: ['prog-1'],
      });

      // Execute
      const response = await DELETE(request);
      const data = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should return 400 with empty programIds array', async () => {
      // Setup
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: [],
      });

      // Execute
      const response = await DELETE(request);
      const data = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('programIds must be a non-empty array of valid strings');
    });

    it('should return 400 with invalid programIds (non-array)', async () => {
      // Setup
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: 'not-an-array',
      });

      // Execute
      const response = await DELETE(request);
      const data = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('programIds must be a non-empty array of valid strings');
    });

    it('should handle batch splitting for > 500 items', async () => {
      // Setup: Create 550 programs to test batch splitting
      const programs = Array.from({ length: 550 }, (_, i) =>
        createMockProgram({ id: `prog-${i}`, authorId: mockUsers.admin.uid })
      );
      const programDocs = programs.map(createMockProgramDoc);

      const mockFirestore = createMockFirestore(programDocs);
      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: programs.map((p) => p.id),
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.deleted).toBe(550);
      expect(data.failed).toBe(0);
      // Should commit twice: 500 + 50
      expect(mockFirestore._batch.commit).toHaveBeenCalledTimes(2);
    });

    it('should return partial success when some programs fail', async () => {
      // Setup
      const program1 = createMockProgram({ id: 'prog-1', authorId: mockUsers.admin.uid });
      const program2 = createMockProgram({ id: 'prog-2', authorId: mockUsers.admin.uid });

      const mockFirestore = createMockFirestore([
        createMockProgramDoc(program1),
        // prog-2 doesn't exist
      ]);

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: ['prog-1', 'prog-2', 'prog-3'], // prog-3 doesn't exist
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

    it('should handle non-existent program IDs gracefully', async () => {
      // Setup
      const mockFirestore = createMockFirestore([]); // No programs exist

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: ['prog-999', 'prog-888'],
      });

      // Execute
      const response = await DELETE(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.deleted).toBe(0);
      expect(data.failed).toBe(2);
      expect(data.errors).toContain('Program prog-999: Not found');
      expect(data.errors).toContain('Program prog-888: Not found');
    });

    it('should handle batch commit failures', async () => {
      // Setup
      const program1 = createMockProgram({ id: 'prog-1', authorId: mockUsers.admin.uid });
      const mockFirestore = createMockFirestore([createMockProgramDoc(program1)]);

      // Mock batch commit to fail
      mockFirestore._batch.commit.mockRejectedValueOnce(new Error('Firestore error'));

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: ['prog-1'],
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
  });

  describe('PATCH - Bulk update program status', () => {
    it('should bulk update program status for admin', async () => {
      // Setup
      const program1 = createMockProgram({ id: 'prog-1', status: 'draft' });
      const program2 = createMockProgram({ id: 'prog-2', status: 'draft' });

      const mockFirestore = createMockFirestore([
        createMockProgramDoc(program1),
        createMockProgramDoc(program2),
      ]);

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: ['prog-1', 'prog-2'],
        status: 'published',
      });

      // Execute
      const response = await PATCH(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updated).toBe(2);
      expect(data.failed).toBe(0);
      expect(mockFirestore._batch.update).toHaveBeenCalledTimes(2);

      // Verify update data includes status and updated_at
      const updateCalls = mockFirestore._batch.update.mock.calls;
      expect(updateCalls[0][1]).toHaveProperty('status', 'published');
      expect(updateCalls[0][1]).toHaveProperty('updated_at');
    });

    it('should bulk update only own programs for teacher', async () => {
      // Setup
      const program1 = createMockProgram({ id: 'prog-1', authorId: mockUsers.teacher.uid });
      const program2 = createMockProgram({ id: 'prog-2', authorId: mockUsers.teacherOther.uid });

      const mockFirestore = createMockFirestore([
        createMockProgramDoc(program1),
        createMockProgramDoc(program2),
      ]);

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.teacher);

      const request = createAuthenticatedRequest({
        programIds: ['prog-1', 'prog-2'],
        status: 'published',
      });

      // Execute
      const response = await PATCH(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.updated).toBe(1);
      expect(data.failed).toBe(1);
      expect(data.errors).toContain('Program prog-2: Permission denied (not your program)');
    });

    it('should return 400 with invalid status value', async () => {
      // Setup
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: ['prog-1'],
        status: 'invalid-status',
      });

      // Execute
      const response = await PATCH(request);
      const data = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('status must be one of: draft, published, archived');
    });

    it('should return 400 without status field', async () => {
      // Setup
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: ['prog-1'],
      });

      // Execute
      const response = await PATCH(request);
      const data = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('status must be one of: draft, published, archived');
    });

    it('should update updated_at timestamp', async () => {
      // Setup
      const program = createMockProgram({ id: 'prog-1' });
      const mockFirestore = createMockFirestore([createMockProgramDoc(program)]);

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: ['prog-1'],
        status: 'published',
      });

      // Execute
      const response = await PATCH(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.updated).toBe(1);

      const updateCall = mockFirestore._batch.update.mock.calls[0];
      expect(updateCall[1]).toHaveProperty('updated_at');
      expect(typeof updateCall[1].updated_at).toBe('string');
    });

    it('should return partial success when some updates fail', async () => {
      // Setup
      const program = createMockProgram({ id: 'prog-1' });
      const mockFirestore = createMockFirestore([createMockProgramDoc(program)]);

      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
      vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

      const request = createAuthenticatedRequest({
        programIds: ['prog-1', 'prog-2'], // prog-2 doesn't exist
        status: 'published',
      });

      // Execute
      const response = await PATCH(request);
      const data: BulkOperationResponse = await getResponseJson(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.updated).toBe(1);
      expect(data.failed).toBe(1);
      expect(data.errors).toContain('Program prog-2: Not found');
    });

    it('should handle all valid status values', async () => {
      const statuses: Array<'draft' | 'published' | 'archived'> = ['draft', 'published', 'archived'];

      for (const status of statuses) {
        // Setup
        const program = createMockProgram({ id: 'prog-1' });
        const mockFirestore = createMockFirestore([createMockProgramDoc(program)]);

        vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);
        vi.mocked(authenticateRequest).mockResolvedValue(mockUsers.admin);

        const request = createAuthenticatedRequest({
          programIds: ['prog-1'],
          status,
        });

        // Execute
        const response = await PATCH(request);
        const data: BulkOperationResponse = await getResponseJson(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data.updated).toBe(1);

        const updateCall = mockFirestore._batch.update.mock.calls[0];
        expect(updateCall[1].status).toBe(status);
      }
    });
  });
});
