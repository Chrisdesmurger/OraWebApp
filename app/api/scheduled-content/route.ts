/**
 * GET /api/scheduled-content - Get all scheduled publish/archive events
 *
 * Returns a calendar view of all programs and lessons with scheduled dates.
 *
 * Query parameters:
 * - type?: 'program' | 'lesson' - Filter by content type
 * - scheduleType?: 'publish' | 'archive' - Filter by schedule type
 * - startDate?: ISO timestamp - Filter events >= this date
 * - endDate?: ISO timestamp - Filter events <= this date
 * - authorId?: string - Filter by author (for teachers to see only their own)
 *
 * Response:
 * {
 *   items: ScheduledContentItem[],
 *   count: number
 * }
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { mapProgramFromFirestore, type ProgramDocument } from '@/types/program';
import { mapLessonFromFirestore, type LessonDocument } from '@/types/lesson';
import {
  programToScheduledItems,
  lessonToScheduledItems,
  type ScheduledContentItem,
  type ContentType,
  type ScheduleType,
} from '@/types/scheduled-content';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ContentType | null;
    const scheduleType = searchParams.get('scheduleType') as ScheduleType | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const authorId = searchParams.get('authorId');

    // Validate dates if provided
    if (startDate && isNaN(Date.parse(startDate))) {
      return apiError('Invalid startDate format (must be ISO 8601 timestamp)', 400);
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return apiError('Invalid endDate format (must be ISO 8601 timestamp)', 400);
    }

    const firestore = getFirestore();
    const allScheduledItems: ScheduledContentItem[] = [];

    console.log('[GET /api/scheduled-content] Fetching scheduled content with filters:', {
      type,
      scheduleType,
      startDate,
      endDate,
      authorId,
      userRole: user.role,
    });

    // Fetch programs if not filtering by type='lesson'
    if (!type || type === 'program') {
      try {
        let programsQuery = firestore.collection('programs');

        // Teachers only see their own programs
        if (user.role === 'teacher' || authorId) {
          const filterAuthorId = authorId || user.uid;
          programsQuery = programsQuery.where('author_id', '==', filterAuthorId) as any;
        }

        const programsSnapshot = await programsQuery.get();
        console.log('[GET /api/scheduled-content] Found', programsSnapshot.size, 'programs');

        programsSnapshot.forEach((doc) => {
          const programData = doc.data() as ProgramDocument;
          const program = mapProgramFromFirestore(doc.id, programData);
          const scheduledItems = programToScheduledItems(program);
          allScheduledItems.push(...scheduledItems);
        });
      } catch (error: any) {
        console.error('[GET /api/scheduled-content] Error fetching programs:', error);
        // Continue to lessons even if programs fail
      }
    }

    // Fetch lessons if not filtering by type='program'
    if (!type || type === 'lesson') {
      try {
        let lessonsQuery = firestore.collection('lessons');

        // Teachers only see their own lessons
        if (user.role === 'teacher' || authorId) {
          const filterAuthorId = authorId || user.uid;
          lessonsQuery = lessonsQuery.where('author_id', '==', filterAuthorId) as any;
        }

        const lessonsSnapshot = await lessonsQuery.get();
        console.log('[GET /api/scheduled-content] Found', lessonsSnapshot.size, 'lessons');

        lessonsSnapshot.forEach((doc) => {
          const lessonData = doc.data() as LessonDocument;
          const lesson = mapLessonFromFirestore(doc.id, lessonData);
          const scheduledItems = lessonToScheduledItems(lesson);
          allScheduledItems.push(...scheduledItems);
        });
      } catch (error: any) {
        console.error('[GET /api/scheduled-content] Error fetching lessons:', error);
        // Continue even if lessons fail
      }
    }

    // Apply filters
    let filteredItems = allScheduledItems;

    // Filter by schedule type (publish/archive)
    if (scheduleType) {
      filteredItems = filteredItems.filter(item => item.scheduleType === scheduleType);
    }

    // Filter by date range
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      filteredItems = filteredItems.filter(item => {
        const itemMs = new Date(item.scheduledAt).getTime();
        return itemMs >= startMs;
      });
    }

    if (endDate) {
      const endMs = new Date(endDate).getTime();
      filteredItems = filteredItems.filter(item => {
        const itemMs = new Date(item.scheduledAt).getTime();
        return itemMs <= endMs;
      });
    }

    // Sort by scheduled date (earliest first)
    filteredItems.sort((a, b) => {
      const aTime = new Date(a.scheduledAt).getTime();
      const bTime = new Date(b.scheduledAt).getTime();
      return aTime - bTime;
    });

    console.log('[GET /api/scheduled-content] Returning', filteredItems.length, 'scheduled items');

    return apiSuccess({
      items: filteredItems,
      count: filteredItems.length,
    });
  } catch (error: any) {
    console.error('GET /api/scheduled-content error:', error);
    return apiError(error.message || 'Failed to fetch scheduled content', 500);
  }
}
