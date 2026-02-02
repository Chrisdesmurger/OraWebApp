/**
 * Email Cloud Functions
 *
 * Automated email triggers for the Ora platform:
 * - Scheduled inactivity checks
 * - Weekly digest
 * - New content notifications
 * - Welcome emails on user creation
 */

export { scheduledInactivityCheck } from './scheduledInactivityCheck';
export { scheduledWeeklyDigest } from './scheduledWeeklyDigest';
export { onContentPublish } from './onContentPublish';
export { onUserCreate } from './onUserCreate';
