import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit/logger';
import type { OnboardingConfig } from '@/types/onboarding';

/**
 * POST /api/admin/onboarding/[id]/publish - Publish onboarding configuration
 *
 * This makes the configuration active and deactivates any previously active configs.
 * Only one onboarding config can be active at a time.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin'])) {
      return apiError('Only admins can publish onboarding configurations', 403);
    }

    const { id } = await params;

    if (!id) {
      return apiError('Configuration ID is required', 400);
    }

    const supabase = createSupabaseServiceClient();

    // Fetch the config to publish
    const { data: configRow, error: configError } = await supabase
      .from('onboarding_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (configError || !configRow) {
      return apiError('Onboarding configuration not found', 404);
    }

    const data = configRow as unknown as OnboardingConfig;

    // Validate the configuration before publishing
    if (!data.questions || (Array.isArray(data.questions) && data.questions.length === 0)) {
      return apiError('Cannot publish configuration without questions', 400);
    }

    const questions = Array.isArray(data.questions) ? data.questions : [];

    // Validate all questions have required fields
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title || !q.category || !q.type) {
        return apiError(`Question at index ${i} is incomplete`, 400);
      }

      // Sliders, circular pickers, text inputs, and profile groups don't need options
      const needsOptions = q.type.kind !== 'slider'
        && q.type.kind !== 'circular_picker'
        && q.type.kind !== 'text_input'
        && q.type.kind !== 'profile_group';
      if (needsOptions && (!q.options || q.options.length === 0)) {
        return apiError(`Question at index ${i} must have at least one option`, 400);
      }
    }

    const now = new Date().toISOString();

    // 1. Deactivate all currently active configs
    const { error: deactivateError } = await supabase
      .from('onboarding_configs')
      .update({
        status: 'archived',
        updated_at: now,
      })
      .eq('status', 'active');

    if (deactivateError) {
      console.error('POST /api/admin/onboarding/[id]/publish deactivate error:', deactivateError);
      return apiError('Failed to deactivate existing configs', 500);
    }

    // 2. Activate this config
    const { error: activateError } = await supabase
      .from('onboarding_configs')
      .update({
        status: 'active',
        published_at: now,
        published_by: currentUser.uid,
        updated_at: now,
      })
      .eq('id', id);

    if (activateError) {
      console.error('POST /api/admin/onboarding/[id]/publish activate error:', activateError);
      return apiError('Failed to activate configuration', 500);
    }

    // Log audit event
    logAuditEvent({
      action: 'onboarding.published',
      resourceType: 'onboarding_config',
      resourceId: id,
      actorId: currentUser.uid,
      actorEmail: currentUser.email || 'unknown',
      changesAfter: {
        version: data.version,
        questionCount: questions.length,
      },
      request,
    });

    // Fetch updated config
    const { data: updatedRow } = await supabase
      .from('onboarding_configs')
      .select('*')
      .eq('id', id)
      .single();

    return apiSuccess({
      id,
      ...updatedRow,
      message: 'Onboarding configuration published successfully. It is now active.',
    });

  } catch (error: unknown) {
    console.error('POST /api/admin/onboarding/[id]/publish error:', error);
    const message = error instanceof Error ? error.message : 'Failed to publish onboarding configuration';
    return apiError(message, 500);
  }
}
