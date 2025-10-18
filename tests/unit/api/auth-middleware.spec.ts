import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import type { AuthenticatedRequest } from '@/lib/api/auth-middleware';

describe('API Auth Middleware', () => {
  describe('requireRole', () => {
    it('should allow admin for admin-only endpoints', () => {
      const user: AuthenticatedRequest = {
        uid: 'test-uid',
        email: 'admin@test.com',
        role: 'admin',
      };

      expect(requireRole(user, ['admin'])).toBe(true);
    });

    it('should deny teacher for admin-only endpoints', () => {
      const user: AuthenticatedRequest = {
        uid: 'test-uid',
        email: 'teacher@test.com',
        role: 'teacher',
      };

      expect(requireRole(user, ['admin'])).toBe(false);
    });

    it('should allow both admin and teacher when both are allowed', () => {
      const admin: AuthenticatedRequest = {
        uid: 'test-uid',
        email: 'admin@test.com',
        role: 'admin',
      };

      const teacher: AuthenticatedRequest = {
        uid: 'test-uid',
        email: 'teacher@test.com',
        role: 'teacher',
      };

      expect(requireRole(admin, ['admin', 'teacher'])).toBe(true);
      expect(requireRole(teacher, ['admin', 'teacher'])).toBe(true);
    });

    it('should deny viewer for admin/teacher endpoints', () => {
      const viewer: AuthenticatedRequest = {
        uid: 'test-uid',
        email: 'viewer@test.com',
        role: 'viewer',
      };

      expect(requireRole(viewer, ['admin', 'teacher'])).toBe(false);
    });
  });

  describe('apiError', () => {
    it('should return error response with correct status', async () => {
      const response = apiError('Test error', 400);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Test error');
    });

    it('should default to 400 status if not provided', async () => {
      const response = apiError('Test error');

      expect(response.status).toBe(400);
    });
  });

  describe('apiSuccess', () => {
    it('should return success response with data', async () => {
      const data = { message: 'Success', count: 5 };
      const response = apiSuccess(data);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual(data);
    });

    it('should accept custom status code', async () => {
      const response = apiSuccess({ created: true }, 201);

      expect(response.status).toBe(201);
    });
  });
});
