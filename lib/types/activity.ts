/**
 * Activity Types
 * Type definitions for activity tracking and recent activity feed
 *
 * IMPORTANT: Firestore uses snake_case, Frontend uses camelCase
 */

export type ActivityType =
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'program_created'
  | 'program_updated'
  | 'program_deleted'
  | 'lesson_created'
  | 'lesson_updated'
  | 'lesson_deleted'
  | 'content_created'
  | 'content_updated'
  | 'content_deleted'
  | 'user_login';

export type ActivityCategory = 'user' | 'program' | 'lesson' | 'content' | 'auth';

/**
 * ActivityDocument - Raw Firestore structure (snake_case)
 */
export interface ActivityDocument {
  type: ActivityType;
  category: ActivityCategory;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  resource_id?: string;
  resource_type?: string;
  resource_title?: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: number; // Firestore Timestamp
}

/**
 * Activity - Frontend structure (camelCase)
 */
export interface Activity {
  id: string;
  type: ActivityType;
  category: ActivityCategory;
  actorId: string;
  actorName: string;
  actorEmail: string;
  resourceId?: string;
  resourceType?: string;
  resourceTitle?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: number;
}

/**
 * Map Firestore ActivityDocument to frontend Activity
 */
export function mapActivityDocument(id: string, doc: ActivityDocument): Activity {
  return {
    id,
    type: doc.type,
    category: doc.category,
    actorId: doc.actor_id,
    actorName: doc.actor_name,
    actorEmail: doc.actor_email,
    resourceId: doc.resource_id,
    resourceType: doc.resource_type,
    resourceTitle: doc.resource_title,
    description: doc.description,
    metadata: doc.metadata,
    createdAt: doc.created_at,
  };
}

/**
 * Map frontend Activity to Firestore ActivityDocument
 */
export function mapActivityToDocument(activity: Omit<Activity, 'id'>): ActivityDocument {
  return {
    type: activity.type,
    category: activity.category,
    actor_id: activity.actorId,
    actor_name: activity.actorName,
    actor_email: activity.actorEmail,
    resource_id: activity.resourceId,
    resource_type: activity.resourceType,
    resource_title: activity.resourceTitle,
    description: activity.description,
    metadata: activity.metadata,
    created_at: activity.createdAt,
  };
}

/**
 * Get icon for activity type
 */
export function getActivityIcon(type: ActivityType): string {
  switch (type) {
    case 'user_created':
      return '👤';
    case 'user_updated':
      return '✏️';
    case 'user_deleted':
      return '🗑️';
    case 'program_created':
      return '📚';
    case 'program_updated':
      return '📝';
    case 'program_deleted':
      return '🗑️';
    case 'lesson_created':
      return '📖';
    case 'lesson_updated':
      return '✏️';
    case 'lesson_deleted':
      return '🗑️';
    case 'content_created':
      return '🎬';
    case 'content_updated':
      return '✏️';
    case 'content_deleted':
      return '🗑️';
    case 'user_login':
      return '🔐';
    default:
      return '📌';
  }
}

/**
 * Get action label for activity type
 */
export function getActivityAction(type: ActivityType): string {
  switch (type) {
    case 'user_created':
      return 'created user';
    case 'user_updated':
      return 'updated user';
    case 'user_deleted':
      return 'deleted user';
    case 'program_created':
      return 'created program';
    case 'program_updated':
      return 'updated program';
    case 'program_deleted':
      return 'deleted program';
    case 'lesson_created':
      return 'created lesson';
    case 'lesson_updated':
      return 'updated lesson';
    case 'lesson_deleted':
      return 'deleted lesson';
    case 'content_created':
      return 'created content';
    case 'content_updated':
      return 'updated content';
    case 'content_deleted':
      return 'deleted content';
    case 'user_login':
      return 'logged in';
    default:
      return 'performed action';
  }
}
