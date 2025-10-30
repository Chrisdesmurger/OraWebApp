/**
 * Scheduled Content Types for OraWebApp Admin Portal
 *
 * This file defines TypeScript interfaces for the scheduled content calendar view.
 *
 * IMPORTANT NAMING CONVENTIONS:
 * - Firestore backend: snake_case
 * - Frontend client: camelCase
 */

import type { Program } from './program';
import type { Lesson } from './lesson';

// ============================================================================
// Scheduled Content Item Interface
// ============================================================================

export type ScheduleType = 'publish' | 'archive';
export type ContentType = 'program' | 'lesson';

/**
 * Represents a scheduled event for the calendar view
 */
export interface ScheduledContentItem {
  id: string;  // Same as program or lesson ID
  title: string;
  type: ContentType;  // 'program' or 'lesson'
  scheduleType: ScheduleType;  // 'publish' or 'archive'
  scheduledAt: string;  // ISO timestamp
  autoPublishEnabled: boolean;
  currentStatus: 'draft' | 'published' | 'archived' | 'ready' | 'uploading' | 'processing' | 'failed';
  authorId: string;

  // Additional context
  category?: string;  // For programs
  programId?: string;  // For lessons (reference to parent program)
}

// ============================================================================
// API Request/Response Interfaces
// ============================================================================

/**
 * Query parameters for GET /api/scheduled-content
 */
export interface GetScheduledContentQuery {
  type?: ContentType;  // Filter by 'program' or 'lesson'
  scheduleType?: ScheduleType;  // Filter by 'publish' or 'archive'
  startDate?: string;  // ISO timestamp - filter events >= this date
  endDate?: string;  // ISO timestamp - filter events <= this date
  authorId?: string;  // Filter by author (for teachers to see only their own)
}

/**
 * Response from GET /api/scheduled-content
 */
export interface GetScheduledContentResponse {
  items: ScheduledContentItem[];
  count: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a Program to ScheduledContentItems (publish and archive events)
 */
export function programToScheduledItems(program: Program): ScheduledContentItem[] {
  const items: ScheduledContentItem[] = [];

  if (program.scheduledPublishAt) {
    items.push({
      id: program.id,
      title: program.title,
      type: 'program',
      scheduleType: 'publish',
      scheduledAt: program.scheduledPublishAt,
      autoPublishEnabled: program.autoPublishEnabled,
      currentStatus: program.status,
      authorId: program.authorId,
      category: program.category,
    });
  }

  if (program.scheduledArchiveAt) {
    items.push({
      id: program.id,
      title: program.title,
      type: 'program',
      scheduleType: 'archive',
      scheduledAt: program.scheduledArchiveAt,
      autoPublishEnabled: program.autoPublishEnabled,
      currentStatus: program.status,
      authorId: program.authorId,
      category: program.category,
    });
  }

  return items;
}

/**
 * Convert a Lesson to ScheduledContentItems (publish and archive events)
 */
export function lessonToScheduledItems(lesson: Lesson): ScheduledContentItem[] {
  const items: ScheduledContentItem[] = [];

  if (lesson.scheduledPublishAt) {
    items.push({
      id: lesson.id,
      title: lesson.title,
      type: 'lesson',
      scheduleType: 'publish',
      scheduledAt: lesson.scheduledPublishAt,
      autoPublishEnabled: lesson.autoPublishEnabled,
      currentStatus: lesson.status,
      authorId: lesson.authorId,
      programId: lesson.programId,
    });
  }

  if (lesson.scheduledArchiveAt) {
    items.push({
      id: lesson.id,
      title: lesson.title,
      type: 'lesson',
      scheduleType: 'archive',
      scheduledAt: lesson.scheduledArchiveAt,
      autoPublishEnabled: lesson.autoPublishEnabled,
      currentStatus: lesson.status,
      authorId: lesson.authorId,
      programId: lesson.programId,
    });
  }

  return items;
}

/**
 * Check if a scheduled date is in the past
 */
export function isScheduledDatePassed(scheduledAt: string): boolean {
  return new Date(scheduledAt) < new Date();
}

/**
 * Check if a scheduled date is within the next N days
 */
export function isScheduledWithinDays(scheduledAt: string, days: number): boolean {
  const scheduled = new Date(scheduledAt);
  const now = new Date();
  const diffMs = scheduled.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

/**
 * Format scheduled date for display
 */
export function formatScheduledDate(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Get badge color for schedule type
 */
export function getScheduleTypeBadgeColor(scheduleType: ScheduleType): string {
  return scheduleType === 'publish'
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
}

/**
 * Get badge color for content type
 */
export function getContentTypeBadgeColor(contentType: ContentType): string {
  return contentType === 'program'
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
}
