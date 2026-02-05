import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
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

    const supabase = createSupabaseServiceClient();

    // Verify config exists
    const { data: configRow, error: configError } = await supabase
      .from('onboarding_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (configError || !configRow) {
      return apiError('Onboarding configuration not found', 404);
    }

    const configData = configRow;

    // Fetch all user responses for this config
    const { data: responsesRows, error: responsesError } = await supabase
      .from('onboarding_responses')
      .select('*')
      .eq('config_version', id);

    if (responsesError) {
      console.error('GET /api/admin/onboarding/[id]/export responses error:', responsesError);
      return apiError('Failed to fetch responses', 500);
    }

    if (!responsesRows || responsesRows.length === 0) {
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
        responseCount: responsesRows.length,
      },
      request,
    });

    if (format === 'json') {
      // Export as JSON
      const responses = responsesRows.map(data => {
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
      (questions as any[]).forEach((q: any) => {
        headers.push(`Q: ${q.title}`);
      });

      const csvRows: string[] = [headers.join(',')];

      // Build CSV rows
      responsesRows.forEach(data => {
        const row: string[] = [
          data.uid || '',
          '', // Email (not stored in responses table)
          '', // First Name (not stored in responses table)
          '', // Last Name (not stored in responses table)
          data.completed ? 'Yes' : 'No',
          data.started_at ? new Date(data.started_at).toISOString() : '',
          data.completed_at ? new Date(data.completed_at).toISOString() : '',
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
            const question = (questions as any[]).find((q: any) => q.id === answer.question_id);
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

        (questions as any[]).forEach((q: any) => {
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

  } catch (error: unknown) {
    console.error('GET /api/admin/onboarding/[id]/export error:', error);
    const message = error instanceof Error ? error.message : 'Failed to export responses';
    return apiError(message, 500);
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
