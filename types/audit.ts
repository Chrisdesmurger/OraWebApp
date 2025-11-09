/**
 * Audit Log Types for OraWebApp Admin Portal
 *
 * This file defines TypeScript interfaces for audit logging and change history.
 *
 * IMPORTANT NAMING CONVENTIONS:
 * - Firestore backend: snake_case (e.g., actor_id, resource_type, ip_address)
 * - Frontend client: camelCase (e.g., actorId, resourceType, ipAddress)
 * - Mappers handle the conversion between the two formats
 */

// ============================================================================
// Enums & Constants
// ============================================================================

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'role_change'
  | 'status_change'
  | 'onboarding.created'
  | 'onboarding.updated'
  | 'onboarding.published'
  | 'onboarding.deleted'
  | 'onboarding.exported';

export type ResourceType = 'user' | 'program' | 'lesson' | 'onboarding_config' | 'onboarding_responses';

export const AUDIT_ACTIONS: AuditAction[] = [
  'create',
  'update',
  'delete',
  'role_change',
  'status_change',
  'onboarding.created',
  'onboarding.updated',
  'onboarding.published',
  'onboarding.deleted',
  'onboarding.exported'
];
export const RESOURCE_TYPES: ResourceType[] = ['user', 'program', 'lesson', 'onboarding_config', 'onboarding_responses'];
// ============================================================================
// Firestore Document Interface (snake_case)
// ============================================================================

/**
 * Audit log document structure in Firestore
 * Uses snake_case field names to match backend convention
 */
export interface AuditLogDocument {
  action: AuditAction;
  resource_type: ResourceType;
  resource_id: string;
  actor_id: string;
  actor_email: string;
  changes: Record<string, any>;
  ip_address: string;
  user_agent: string;
  timestamp: string; // ISO timestamp
}

// ============================================================================
// Client-Side Interface (camelCase)
// ============================================================================

/**
 * Audit log object for frontend use
 * Uses camelCase field names following JavaScript conventions
 */
export interface AuditLog {
  id: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  actorId: string;
  actorEmail: string;
  changes: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string; // ISO timestamp
}

// ============================================================================
// API Request/Response Interfaces
// ============================================================================

/**
 * Query parameters for GET /api/audit-logs
 */
export interface GetAuditLogsQuery {
  resourceType?: ResourceType;
  action?: AuditAction;
  actorId?: string;
  resourceId?: string;
  startDate?: string; // ISO timestamp
  endDate?: string; // ISO timestamp
  limit?: number;
  startAfter?: string; // Document ID for pagination
}

/**
 * Response from GET /api/audit-logs
 */
export interface GetAuditLogsResponse {
  logs: AuditLog[];
  hasMore: boolean;
  lastDocId?: string;
}

/**
 * Parameters for logging an audit event
 */
export interface LogAuditEventParams {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  actorId: string;
  actorEmail: string;
  changesBefore?: any;
  changesAfter?: any;
  ipAddress: string;
  userAgent: string;
}

// ============================================================================
// Mapper Functions
// ============================================================================

/**
 * Converts a Firestore document to a client-side AuditLog object
 *
 * Maps snake_case Firestore fields to camelCase frontend fields.
 * Use this when reading audit logs from Firestore API.
 *
 * @param id - Document ID from Firestore
 * @param doc - Firestore document data (snake_case)
 * @returns AuditLog object with camelCase fields
 *
 * @example
 * const snapshot = await firestore.collection('audit_logs').doc('log-123').get();
 * const auditLog = mapAuditLogFromFirestore(snapshot.id, snapshot.data());
 */
export function mapAuditLogFromFirestore(id: string, doc: AuditLogDocument): AuditLog {
  return {
    id,
    action: doc.action,
    resourceType: doc.resource_type,
    resourceId: doc.resource_id,
    actorId: doc.actor_id,
    actorEmail: doc.actor_email,
    changes: doc.changes,
    ipAddress: doc.ip_address,
    userAgent: doc.user_agent,
    timestamp: doc.timestamp,
  };
}

/**
 * Converts a client-side AuditLog object to Firestore document format
 *
 * Maps camelCase frontend fields to snake_case Firestore fields.
 * Use this when writing audit logs to Firestore API.
 *
 * @param auditLog - AuditLog object (camelCase, without id)
 * @returns Firestore document data (snake_case)
 *
 * @example
 * const auditLogData = mapAuditLogToFirestore({
 *   action: 'update',
 *   resourceType: 'program',
 *   // ... other fields
 * });
 * await firestore.collection('audit_logs').add(auditLogData);
 */
export function mapAuditLogToFirestore(auditLog: Omit<AuditLog, 'id'>): AuditLogDocument {
  return {
    action: auditLog.action,
    resource_type: auditLog.resourceType,
    resource_id: auditLog.resourceId,
    actor_id: auditLog.actorId,
    actor_email: auditLog.actorEmail,
    changes: auditLog.changes,
    ip_address: auditLog.ipAddress,
    user_agent: auditLog.userAgent,
    timestamp: auditLog.timestamp,
  };
}

/**
 * Type guard to check if a value is a valid AuditAction
 *
 * @param value - String to check
 * @returns True if value is a valid AuditAction enum value
 */
export function isAuditAction(value: string): value is AuditAction {
  return AUDIT_ACTIONS.includes(value as AuditAction);
}

/**
 * Type guard to check if a value is a valid ResourceType
 *
 * @param value - String to check
 * @returns True if value is a valid ResourceType enum value
 */
export function isResourceType(value: string): value is ResourceType {
  return RESOURCE_TYPES.includes(value as ResourceType);
}

/**
 * Compute the diff between before and after objects
 *
 * @param before - Object before changes
 * @param after - Object after changes
 * @returns Object containing only changed fields with {before, after} values
 *
 * @example
 * const diff = computeChanges(
 *   { title: 'Old Title', status: 'draft' },
 *   { title: 'New Title', status: 'published' }
 * );
 * // Returns: { title: { before: 'Old Title', after: 'New Title' }, status: { before: 'draft', after: 'published' } }
 */
export function computeChanges(
  before: Record<string, any> | undefined,
  after: Record<string, any> | undefined
): Record<string, any> {
  if (!before && !after) return {};
  if (!before) return { created: after };
  if (!after) return { deleted: before };

  const changes: Record<string, any> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeValue = before[key];
    const afterValue = after[key];

    // Deep equality check (simple version)
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes[key] = {
        before: beforeValue,
        after: afterValue,
      };
    }
  }

  return changes;
}
