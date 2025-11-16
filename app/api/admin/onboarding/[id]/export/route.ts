import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { logAuditEvent } from '@/lib/audit/logger';

/**
 * GET /api/admin/onboarding/[id]/export - Export user responses
 *
 * Query params:
 *   - format: 'csv' | 'json' (default: 'csv')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { id } = await params;

    if (!id) {
      return apiError('Configuration ID is required', 400);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    if (!['csv', 'json'].includes(format)) {
      return apiError('Invalid format. Must be csv or json', 400);
    }

    const db = getFirestore();

    // Verify config exists
    const configDoc = await db.collection('onboarding_configs').doc(id).get();
    if (!configDoc.exists) {
      return apiError('Onboarding configuration not found', 404);
    }

    const configData = configDoc.data();

    // Fetch all user responses for this config using collectionGroup (efficient)
    // NEW: Query dedicated collection instead of nested field
    const responsesSnapshot = await db
      .collectionGroup('responses')
      .where('config_version', '==', id)
      .get();

    if (responsesSnapshot.empty) {
      return apiError('No responses found for this configuration', 404);
    }

    // Log audit event
    logAuditEvent({
      action: 'onboarding.exported',
      resourceType: 'onboarding_responses',
      resourceId: id,
      actorId: currentUser.uid,
      actorEmail: currentUser.email || 'unknown',
      changesAfter: {
        version: configData?.version,
        format,
        responseCount: responsesSnapshot.size,
      },
      request,
    });

    if (format === 'json') {
      // Export as JSON (NEW: using dedicated collection data structure)
      const responses = responsesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: data.uid,
          configVersion: data.config_version,
          completed: data.completed,
          completedAt: data.completed_at,
          startedAt: data.started_at,
          answers: data.answers,
          metadata: data.metadata,
          goals: data.goals,
          mainGoal: data.main_goal,
          experienceLevels: data.experience_levels,
          dailyTimeCommitment: data.daily_time_commitment,
          preferredTimes: data.preferred_times,
          contentPreferences: data.content_preferences,
          practiceStyle: data.practice_style,
          challenges: data.challenges,
          supportPreferences: data.support_preferences,
        };
      });

      return new Response(JSON.stringify(responses, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="onboarding-responses-${id}-${Date.now()}.json"`,
        },
      });
    } else {
      // Export as CSV
      const questions = configData?.questions || [];

      // Build CSV header
      const headers = [
        'UID',
        'Email',
        'First Name',
        'Last Name',
        'Completed',
        'Started At',
        'Completed At',
        'Total Time (seconds)',
        'Device Type',
        'App Version',
        'Locale',
      ];

      // Add question columns
      questions.forEach((q: any) => {
        headers.push(`Q: ${q.title}`);
      });

      const csvRows: string[] = [headers.join(',')];

      // Build CSV rows (NEW: using dedicated collection data structure)
      responsesSnapshot.docs.forEach(doc => {
        const data = doc.data();

        const row: string[] = [
          data.uid || '',
          '', // Email (not stored in responses collection)
          '', // First Name (not stored in responses collection)
          '', // Last Name (not stored in responses collection)
          data.completed ? 'Yes' : 'No',
          data.started_at ? new Date(data.started_at.toDate()).toISOString() : '',
          data.completed_at ? new Date(data.completed_at.toDate()).toISOString() : '',
          data.metadata?.total_time_seconds?.toString() || '',
          escapeCSV(data.metadata?.device_type || ''),
          escapeCSV(data.metadata?.app_version || ''),
          escapeCSV(data.metadata?.locale || ''),
        ];

        // Add answers for each question
        const answerMap = new Map<string, string>();
        if (data.answers && Array.isArray(data.answers)) {
          data.answers.forEach((answer: any) => {
            const selectedLabels: string[] = [];

            // Find option labels from question definition
            const question = questions.find((q: any) => q.id === answer.question_id);
            if (question && answer.selected_options) {
              answer.selected_options.forEach((optionId: string) => {
                const option = question.options.find((opt: any) => opt.id === optionId);
                if (option) {
                  selectedLabels.push(option.label);
                }
              });
            }

            // For text answers, use the text_answer field
            if (answer.text_answer) {
              selectedLabels.push(answer.text_answer);
            }

            answerMap.set(answer.question_id, selectedLabels.join('; '));
          });
        }

        questions.forEach((q: any) => {
          row.push(escapeCSV(answerMap.get(q.id) || ''));
        });

        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="onboarding-responses-${id}-${Date.now()}.csv"`,
        },
      });
    }

  } catch (error: any) {
    console.error('GET /api/admin/onboarding/[id]/export error:', error);
    return apiError(error.message || 'Failed to export responses', 500);
  }
}

/**
 * Escape CSV values to prevent CSV injection and handle special characters
 */
function escapeCSV(value: string): string {
  if (!value) return '';

  // If value contains comma, newline, or double quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
