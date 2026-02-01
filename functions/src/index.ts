/**
 * Firebase Functions Entry Point
 *
 * Export all cloud functions for the Ora Admin Portal.
 */

// Media processing
export { transcodeOnFinalize } from './transcodeOnFinalize';

// Email automation (Phase 6)
export {
  scheduledInactivityCheck,
  scheduledWeeklyDigest,
  onContentPublish,
  onUserCreate,
} from './email';
