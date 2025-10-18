import { describe, it, expect } from 'vitest';
import {
  getPermissions,
  hasPermission,
  canAccessRoute,
  canEditResource,
  getRoleDisplayName,
  getRoleBadgeColor,
  type UserRole,
} from '@/lib/rbac';

describe('RBAC - Role-Based Access Control', () => {
  describe('getPermissions', () => {
    it('admin should have all permissions', () => {
      const permissions = getPermissions('admin');
      expect(permissions.canViewUsers).toBe(true);
      expect(permissions.canEditUsers).toBe(true);
      expect(permissions.canDeleteUsers).toBe(true);
      expect(permissions.canAssignRoles).toBe(true);
      expect(permissions.canRunCommands).toBe(true);
      expect(permissions.canViewAdvancedStats).toBe(true);
      expect(permissions.canEditAllContent).toBe(true);
    });

    it('teacher should have limited permissions', () => {
      const permissions = getPermissions('teacher');
      expect(permissions.canViewUsers).toBe(false);
      expect(permissions.canEditUsers).toBe(false);
      expect(permissions.canDeleteUsers).toBe(false);
      expect(permissions.canAssignRoles).toBe(false);
      expect(permissions.canRunCommands).toBe(false);
      expect(permissions.canViewAdvancedStats).toBe(false);
      expect(permissions.canEditAllContent).toBe(false);

      // But can manage own content
      expect(permissions.canViewContent).toBe(true);
      expect(permissions.canCreateContent).toBe(true);
      expect(permissions.canEditOwnContent).toBe(true);
      expect(permissions.canViewPrograms).toBe(true);
      expect(permissions.canCreatePrograms).toBe(true);
      expect(permissions.canEditOwnPrograms).toBe(true);
    });

    it('viewer should have minimal permissions', () => {
      const permissions = getPermissions('viewer');
      expect(permissions.canViewUsers).toBe(false);
      expect(permissions.canEditUsers).toBe(false);
      expect(permissions.canDeleteUsers).toBe(false);
      expect(permissions.canCreateContent).toBe(false);
      expect(permissions.canEditOwnContent).toBe(false);
      expect(permissions.canRunCommands).toBe(false);

      // Can only view content and programs
      expect(permissions.canViewContent).toBe(true);
      expect(permissions.canViewPrograms).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should correctly check admin permissions', () => {
      expect(hasPermission('admin', 'canDeleteUsers')).toBe(true);
      expect(hasPermission('admin', 'canRunCommands')).toBe(true);
    });

    it('should correctly check teacher permissions', () => {
      expect(hasPermission('teacher', 'canDeleteUsers')).toBe(false);
      expect(hasPermission('teacher', 'canEditOwnContent')).toBe(true);
    });

    it('should correctly check viewer permissions', () => {
      expect(hasPermission('viewer', 'canCreateContent')).toBe(false);
      expect(hasPermission('viewer', 'canViewContent')).toBe(true);
    });
  });

  describe('canAccessRoute', () => {
    it('admin can access all routes', () => {
      expect(canAccessRoute('admin', '/admin')).toBe(true);
      expect(canAccessRoute('admin', '/admin/users')).toBe(true);
      expect(canAccessRoute('admin', '/admin/commands')).toBe(true);
      expect(canAccessRoute('admin', '/admin/content')).toBe(true);
    });

    it('teacher can access content routes but not user or command routes', () => {
      expect(canAccessRoute('teacher', '/admin')).toBe(true);
      expect(canAccessRoute('teacher', '/admin/content')).toBe(true);
      expect(canAccessRoute('teacher', '/admin/programs')).toBe(true);
      expect(canAccessRoute('teacher', '/admin/users')).toBe(false);
      expect(canAccessRoute('teacher', '/admin/commands')).toBe(false);
    });

    it('viewer cannot access admin routes', () => {
      expect(canAccessRoute('viewer', '/admin/users')).toBe(false);
      expect(canAccessRoute('viewer', '/admin/commands')).toBe(false);
      expect(canAccessRoute('viewer', '/admin/content')).toBe(true); // Can view
    });
  });

  describe('canEditResource', () => {
    const userId1 = 'user-123';
    const userId2 = 'user-456';

    it('admin can edit any resource', () => {
      expect(canEditResource('admin', 'program', userId2, userId1)).toBe(true);
      expect(canEditResource('admin', 'content', userId2, userId1)).toBe(true);
      expect(canEditResource('admin', 'user', userId2, userId1)).toBe(true);
    });

    it('teacher can edit own resources', () => {
      expect(canEditResource('teacher', 'program', userId1, userId1)).toBe(true);
      expect(canEditResource('teacher', 'content', userId1, userId1)).toBe(true);
      expect(canEditResource('teacher', 'user', userId1, userId1)).toBe(false);
    });

    it('teacher cannot edit other teachers resources', () => {
      expect(canEditResource('teacher', 'program', userId2, userId1)).toBe(false);
      expect(canEditResource('teacher', 'content', userId2, userId1)).toBe(false);
    });

    it('viewer cannot edit any resources', () => {
      expect(canEditResource('viewer', 'program', userId1, userId1)).toBe(false);
      expect(canEditResource('viewer', 'content', userId1, userId1)).toBe(false);
      expect(canEditResource('viewer', 'user', userId1, userId1)).toBe(false);
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return correct display names', () => {
      expect(getRoleDisplayName('admin')).toBe('Administrator');
      expect(getRoleDisplayName('teacher')).toBe('Teacher');
      expect(getRoleDisplayName('viewer')).toBe('Viewer');
    });
  });

  describe('getRoleBadgeColor', () => {
    it('should return correct badge colors', () => {
      expect(getRoleBadgeColor('admin')).toContain('red');
      expect(getRoleBadgeColor('teacher')).toContain('blue');
      expect(getRoleBadgeColor('viewer')).toContain('gray');
    });
  });
});
