/**
 * Role-Based Access Control (RBAC) utilities
 * Defines permissions and access control logic
 */

export type UserRole = 'admin' | 'teacher' | 'viewer';

export interface RBACPermissions {
  // User management
  canViewUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canAssignRoles: boolean;

  // Content management
  canViewContent: boolean;
  canCreateContent: boolean;
  canEditOwnContent: boolean;
  canEditAllContent: boolean;
  canDeleteContent: boolean;

  // Program management
  canViewPrograms: boolean;
  canCreatePrograms: boolean;
  canEditOwnPrograms: boolean;
  canEditAllPrograms: boolean;
  canDeletePrograms: boolean;

  // Media management
  canViewMedia: boolean;
  canUploadMedia: boolean;
  canDeleteMedia: boolean;

  // Commands
  canRunCommands: boolean;
  canViewCommandLogs: boolean;

  // Statistics
  canViewStats: boolean;
  canViewAdvancedStats: boolean;

  // Audit logs
  canViewAuditLogs: boolean;
}

/**
 * Get permissions for a given role
 */
export function getPermissions(role: UserRole): RBACPermissions {
  switch (role) {
    case 'admin':
      return {
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canAssignRoles: true,

        canViewContent: true,
        canCreateContent: true,
        canEditOwnContent: true,
        canEditAllContent: true,
        canDeleteContent: true,

        canViewPrograms: true,
        canCreatePrograms: true,
        canEditOwnPrograms: true,
        canEditAllPrograms: true,
        canDeletePrograms: true,

        canViewMedia: true,
        canUploadMedia: true,
        canDeleteMedia: true,

        canRunCommands: true,
        canViewCommandLogs: true,

        canViewStats: true,
        canViewAdvancedStats: true,

        canViewAuditLogs: true,
      };

    case 'teacher':
      return {
        canViewUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canAssignRoles: false,

        canViewContent: true,
        canCreateContent: true,
        canEditOwnContent: true,
        canEditAllContent: false,
        canDeleteContent: false,

        canViewPrograms: true,
        canCreatePrograms: true,
        canEditOwnPrograms: true,
        canEditAllPrograms: false,
        canDeletePrograms: false,

        canViewMedia: true,
        canUploadMedia: true,
        canDeleteMedia: false,

        canRunCommands: false,
        canViewCommandLogs: false,

        canViewStats: true,
        canViewAdvancedStats: false,

        canViewAuditLogs: false,
      };

    case 'viewer':
      return {
        canViewUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canAssignRoles: false,

        canViewContent: true,
        canCreateContent: false,
        canEditOwnContent: false,
        canEditAllContent: false,
        canDeleteContent: false,

        canViewPrograms: true,
        canCreatePrograms: false,
        canEditOwnPrograms: false,
        canEditAllPrograms: false,
        canDeletePrograms: false,

        canViewMedia: true,
        canUploadMedia: false,
        canDeleteMedia: false,

        canRunCommands: false,
        canViewCommandLogs: false,

        canViewStats: false,
        canViewAdvancedStats: false,

        canViewAuditLogs: false,
      };
  }
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof RBACPermissions): boolean {
  const permissions = getPermissions(role);
  return permissions[permission];
}

/**
 * Check if user can access a route
 */
export function canAccessRoute(role: UserRole, route: string): boolean {
  if (route.startsWith('/admin/users')) {
    return hasPermission(role, 'canViewUsers');
  }

  if (route.startsWith('/admin/content') || route.startsWith('/admin/programs')) {
    return hasPermission(role, 'canViewContent');
  }

  if (route.startsWith('/admin/media')) {
    return hasPermission(role, 'canViewMedia');
  }

  if (route.startsWith('/admin/commands')) {
    return hasPermission(role, 'canRunCommands');
  }

  if (route.startsWith('/admin/audit-logs')) {
    return hasPermission(role, 'canViewAuditLogs');
  }

  if (route.startsWith('/admin')) {
    return role === 'admin' || role === 'teacher';
  }

  return true;
}

/**
 * Check if user can edit a resource
 */
export function canEditResource(
  role: UserRole,
  resourceType: 'program' | 'content' | 'user',
  resourceOwnerId?: string,
  currentUserId?: string
): boolean {
  if (role === 'admin') {
    return true;
  }

  if (role === 'teacher' && (resourceType === 'program' || resourceType === 'content')) {
    if (resourceOwnerId && currentUserId) {
      return resourceOwnerId === currentUserId;
    }
    return false;
  }

  return false;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    admin: 'Administrator',
    teacher: 'Teacher',
    viewer: 'Viewer',
  };
  return displayNames[role];
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    teacher: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };
  return colors[role];
}
