import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit/logger';
import { mapOnboardingConfigToFirestore } from '@/lib/onboarding/firestore-mappers';
import type { OnboardingConfig, CreateOnboardingRequest } from '@/types/onboarding';

/**
 * GET /api/admin/onboarding - List all onboarding configurations
 * Query params:
 *   - status: 'draft' | 'active' | 'archived' (optional)
 *   - limit: number (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = createSupabaseServiceClient();

    let query = supabase
      .from('onboarding_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by status if provided
    if (status && ['draft', 'active', 'archived'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('GET /api/admin/onboarding Supabase error:', error);
      return apiError('Failed to fetch onboarding configurations', 500);
    }

    const configs: OnboardingConfig[] = (rows || []).map(row => ({
      id: row.id,
      ...row,
    })) as OnboardingConfig[];

    return apiSuccess({
      configs,
      total: configs.length,
    });

  } catch (error: unknown) {
    console.error('GET /api/admin/onboarding error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch onboarding configurations';
    return apiError(message, 500);
  }
}

/**
 * POST /api/admin/onboarding - Create new onboarding configuration
 * Body: CreateOnboardingRequest
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin'])) {
      return apiError('Only admins can create onboarding configurations', 403);
    }

    const body: CreateOnboardingRequest = await request.json();
    const { title, description, questions } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return apiError('Title is required', 400);
    }

    if (!description || description.trim().length === 0) {
      return apiError('Description is required', 400);
    }

    if (!questions || questions.length === 0) {
      return apiError('At least one question is required', 400);
    }

    // Validate questions structure
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title || !q.category || !q.type) {
        return apiError(`Question at index ${i} is missing required fields`, 400);
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

    const supabase = createSupabaseServiceClient();
    const now = new Date().toISOString();

    // Generate version ID (v1.0, v1.1, etc.)
    const { data: existingVersions } = await supabase
      .from('onboarding_configs')
      .select('version')
      .order('created_at', { ascending: false })
      .limit(1);

    let versionNumber = '1.0';
    if (existingVersions && existingVersions.length > 0) {
      const lastVersion = existingVersions[0].version || '1.0';
      const parts = lastVersion.split('.');
      const minor = parseInt(parts[1] || '0', 10) + 1;
      versionNumber = `${parts[0]}.${minor}`;
    }

    // Generate question IDs and assign order
    const questionsWithIds = questions.map((q, index) => ({
      ...q,
      id: `q_${Date.now()}_${index}`,
      order: index,
    }));

    const newConfig: Partial<OnboardingConfig> = {
      title: title.trim(),
      description: description.trim(),
      status: 'draft',
      version: versionNumber,
      questions: questionsWithIds,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      createdBy: currentUser.uid,
    };

    const mapped = mapOnboardingConfigToFirestore(newConfig as any);

    // Build Supabase insert payload
    const insertPayload = {
      title: newConfig.title,
      description: newConfig.description,
      status: 'draft',
      version: versionNumber,
      questions: questionsWithIds,
      created_by: currentUser.uid,
      created_at: now,
      updated_at: now,
    };

    const { data: created, error: insertError } = await supabase
      .from('onboarding_configs')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError || !created) {
      console.error('POST /api/admin/onboarding insert error:', insertError);
      return apiError('Failed to create onboarding configuration', 500);
    }

    // Log audit event
    logAuditEvent({
      action: 'onboarding.created',
      resourceType: 'onboarding_config',
      resourceId: created.id,
      actorId: currentUser.uid,
      actorEmail: currentUser.email || 'unknown',
      changesAfter: {
        version: versionNumber,
        questionCount: questionsWithIds.length,
      },
      request,
    });

    return apiSuccess({
      id: created.id,
      ...newConfig,
      message: 'Onboarding configuration created successfully',
    }, 201);

  } catch (error: unknown) {
    console.error('POST /api/admin/onboarding error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create onboarding configuration';
    return apiError(message, 500);
  }
}
