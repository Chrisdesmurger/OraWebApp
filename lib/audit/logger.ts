/**
 * Audit Logger Utility
 *
 * Provides functions to log admin actions to Firestore audit_logs collection.
 * Automatically extracts IP address and user agent from requests.
 */

import { NextRequest } from 'next/server';
import { getFirestore } from '@/lib/firebase/admin';
import type { LogAuditEventParams, AuditAction, ResourceType } from '@/types/audit';
import { mapAuditLogToFirestore, computeChanges } from '@/types/audit';

/**
 * Extract IP address from NextRequest
 *
 * Tries multiple headers in order of preference:
 * 1. x-forwarded-for (most common for proxies)
 * 2. x-real-ip (nginx)
 * 3. cf-connecting-ip (Cloudflare)
 * 4. request IP
 *
 * @param request - Next.js request object
 * @returns IP address string
 */
function extractIpAddress(request: NextRequest): string {
  // Try x-forwarded-for (comma-separated list, first is original client)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Try x-real-ip
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Try Cloudflare
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  // Fallback to unknown (Next.js 15 doesn't have request.ip)
  return 'unknown';
}

/**
 * Extract User-Agent from NextRequest
 *
 * @param request - Next.js request object
 * @returns User-Agent string
 */
function extractUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Log an audit event to Firestore
 *
 * @param params - Audit event parameters
 * @param params.action - Type of action performed
 * @param params.resourceType - Type of resource affected
 * @param params.resourceId - ID of affected resource
 * @param params.actorId - UID of user who performed action
 * @param params.actorEmail - Email of user who performed action
 * @param params.changesBefore - Object state before changes (for updates/deletes)
 * @param params.changesAfter - Object state after changes (for creates/updates)
 * @param params.request - Next.js request object (for IP and user-agent extraction)
 *
 * @example
 * // Log program update
 * await logAuditEvent({
 *   action: 'update',
 *   resourceType: 'program',
 *   resourceId: 'prog-123',
 *   actorId: user.uid,
 *   actorEmail: user.email,
 *   changesBefore: { title: 'Old Title', status: 'draft' },
 *   changesAfter: { title: 'New Title', status: 'published' },
 *   request,
 * });
 */
export async function logAuditEvent(params: {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  actorId: string;
  actorEmail: string;
  changesBefore?: any;
  changesAfter?: any;
  request: NextRequest;
}): Promise<void> {
  try {
    const { action, resourceType, resourceId, actorId, actorEmail, changesBefore, changesAfter, request } = params;

    // Extract IP and User-Agent
    const ipAddress = extractIpAddress(request);
    const userAgent = extractUserAgent(request);

    // Compute changes diff
    const changes = computeChanges(changesBefore, changesAfter);

    // Create audit log document
    const auditLogData = mapAuditLogToFirestore({
      action,
      resourceType,
      resourceId,
      actorId,
      actorEmail,
      changes,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    // Write to Firestore
    const firestore = getFirestore();
    await firestore.collection('audit_logs').add(auditLogData);

    console.log(`[AuditLog] ${action} on ${resourceType}:${resourceId} by ${actorEmail} (${ipAddress})`);
  } catch (error) {
    // Log error but don't throw - audit logging should never break the main operation
    console.error('[AuditLog] Failed to log audit event:', error);
  }
}

/**
 * Convenience wrapper for logging create actions
 */
export async function logCreate(params: {
  resourceType: ResourceType;
  resourceId: string;
  actorId: string;
  actorEmail: string;
  resource: any;
  request: NextRequest;
}): Promise<void> {
  await logAuditEvent({
    action: 'create',
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    changesAfter: params.resource,
    request: params.request,
  });
}

/**
 * Convenience wrapper for logging update actions
 */
export async function logUpdate(params: {
  resourceType: ResourceType;
  resourceId: string;
  actorId: string;
  actorEmail: string;
  before: any;
  after: any;
  request: NextRequest;
}): Promise<void> {
  await logAuditEvent({
    action: 'update',
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    changesBefore: params.before,
    changesAfter: params.after,
    request: params.request,
  });
}

/**
 * Convenience wrapper for logging delete actions
 */
export async function logDelete(params: {
  resourceType: ResourceType;
  resourceId: string;
  actorId: string;
  actorEmail: string;
  resource: any;
  request: NextRequest;
}): Promise<void> {
  await logAuditEvent({
    action: 'delete',
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    changesBefore: params.resource,
    request: params.request,
  });
}

/**
 * Convenience wrapper for logging role change actions
 */
export async function logRoleChange(params: {
  resourceId: string;
  actorId: string;
  actorEmail: string;
  before: { role: string };
  after: { role: string };
  request: NextRequest;
}): Promise<void> {
  await logAuditEvent({
    action: 'role_change',
    resourceType: 'user',
    resourceId: params.resourceId,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    changesBefore: params.before,
    changesAfter: params.after,
    request: params.request,
  });
}

/**
 * Convenience wrapper for logging status change actions
 */
export async function logStatusChange(params: {
  resourceType: ResourceType;
  resourceId: string;
  actorId: string;
  actorEmail: string;
  before: { status: string };
  after: { status: string };
  request: NextRequest;
}): Promise<void> {
  await logAuditEvent({
    action: 'status_change',
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    changesBefore: params.before,
    changesAfter: params.after,
    request: params.request,
  });
}
