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

    // Fetch all user responses for this config
    const responsesSnapshot = await db
      .collection('users')
      .where('onboarding.configVersion', '==', id)
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
      // Export as JSON
      const responses = responsesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email || '',
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          ...data.onboarding,
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

      // Build CSV rows
      responsesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const onboarding = data.onboarding || {};

        const row: string[] = [
          doc.id,
          escapeCSV(data.email || ''),
          escapeCSV(data.first_name || ''),
          escapeCSV(data.last_name || ''),
          onboarding.completed ? 'Yes' : 'No',
          onboarding.startedAt ? new Date(onboarding.startedAt.toDate()).toISOString() : '',
          onboarding.completedAt ? new Date(onboarding.completedAt.toDate()).toISOString() : '',
          onboarding.metadata?.totalTimeSeconds?.toString() || '',
          escapeCSV(onboarding.metadata?.deviceType || ''),
          escapeCSV(onboarding.metadata?.appVersion || ''),
          escapeCSV(onboarding.metadata?.locale || ''),
        ];

        // Add answers for each question
        const answerMap = new Map<string, string>();
        if (onboarding.answers && Array.isArray(onboarding.answers)) {
          onboarding.answers.forEach((answer: any) => {
            const selectedLabels: string[] = [];

            // Find option labels from question definition
            const question = questions.find((q: any) => q.id === answer.questionId);
            if (question && answer.selectedOptions) {
              answer.selectedOptions.forEach((optionId: string) => {
                const option = question.options.find((opt: any) => opt.id === optionId);
                if (option) {
                  selectedLabels.push(option.label);
                }
              });
            }

            answerMap.set(answer.questionId, selectedLabels.join('; '));
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
