import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit/logger';
import { deepCamelToSnake, deepSnakeToCamel } from '@/lib/firestore/conversions';

const informationScreenInputSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().min(0),
  order: z.number().int().min(0),

  // Legacy/base fields
  title: z.string().optional(),
  subtitle: z.string().optional(),
  content: z.string().optional(),
  ctaText: z.string().optional(),

  // i18n fields (camelCase)
  titleFr: z.string().optional(),
  titleEn: z.string().optional(),
  titleEs: z.string().optional(),
  subtitleFr: z.string().optional(),
  subtitleEn: z.string().optional(),
  subtitleEs: z.string().optional(),
  contentFr: z.string().optional(),
  contentEn: z.string().optional(),
  contentEs: z.string().optional(),
  ctaTextFr: z.string().optional(),
  ctaTextEn: z.string().optional(),
  ctaTextEs: z.string().optional(),

  // Bullet points (arrays)
  bulletPoints: z.array(z.string()).optional(),
  bulletPointsFr: z.array(z.string()).optional(),
  bulletPointsEn: z.array(z.string()).optional(),
  bulletPointsEs: z.array(z.string()).optional(),

  // Structured bullet points (Phase 3)
  bulletPointsStructured: z
    .array(
      z.object({
        id: z.string().optional(),
        order: z.number().int().min(0),
        text: z.string().optional(),
        textFr: z.string().optional(),
        textEn: z.string().optional(),
        textEs: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .optional(),

  imageUrl: z.string().url().optional().or(z.literal('')),
  backgroundColor: z.string().optional(),

  displayConditions: z
    .object({
      showIfAnswer: z.string().optional(),
      expectedAnswer: z.union([z.string(), z.array(z.string())]).optional(),
      showIfGoal: z.string().optional(),
      showIfExperience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      logicOperator: z.enum(['AND', 'OR']).optional(),
    })
    .optional(),
});

const putBodySchema = z.object({
  informationScreens: z.array(informationScreenInputSchema),
});

/**
 * GET /api/admin/onboarding/[id]/information-screens
 * Returns the config's information screens (camelCase) with best-effort compatibility
 * with snake_case storage.
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
    if (!id) return apiError('Configuration ID is required', 400);

    const supabase = createSupabaseServiceClient();
    const { data: row, error } = await supabase
      .from('onboarding_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      return apiError('Onboarding configuration not found', 404);
    }

    const camel = deepSnakeToCamel<Record<string, unknown>>(row);

    const merged = {
      ...row,
      ...camel,
    } as any;

    const informationScreens =
      merged.informationScreens || merged.information_screens || [];

    return apiSuccess({ informationScreens });
  } catch (error: unknown) {
    console.error('GET /api/admin/onboarding/[id]/information-screens error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch information screens';
    return apiError(message, 500);
  }
}

/**
 * PUT /api/admin/onboarding/[id]/information-screens
 * Persists information screens as JSONB in the onboarding_configs table.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin'])) {
      return apiError('Only admins can update onboarding information screens', 403);
    }

    const { id } = await params;
    if (!id) return apiError('Configuration ID is required', 400);

    const body = await request.json();
    const parsed = putBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.message, 400);
    }

    const supabase = createSupabaseServiceClient();

    // Verify config exists
    const { data: existing, error: fetchError } = await supabase
      .from('onboarding_configs')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return apiError('Onboarding configuration not found', 404);
    }

    const now = new Date().toISOString();

    // Normalize & timestamp each screen
    const informationScreensCamel = parsed.data.informationScreens.map((s) => {
      const titleFr = s.titleFr ?? s.title ?? '';
      const title = s.title ?? titleFr;

      const subtitleFr = s.subtitleFr ?? s.subtitle ?? '';
      const subtitle = s.subtitle ?? subtitleFr;

      const contentFr = s.contentFr ?? s.content ?? '';
      const content = s.content ?? contentFr;

      const ctaTextFr = s.ctaTextFr ?? s.ctaText ?? '';
      const ctaText = s.ctaText ?? ctaTextFr;

      // Ensure legacy arrays exist
      const bulletPointsFr = s.bulletPointsFr ?? s.bulletPoints ?? [];
      const bulletPoints = s.bulletPoints ?? bulletPointsFr;

      return {
        ...s,
        title,
        titleFr,
        subtitle,
        subtitleFr,
        content,
        contentFr,
        ctaText,
        ctaTextFr,
        bulletPoints,
        bulletPointsFr,
        createdAt: (s as any).createdAt ?? now,
        updatedAt: now,
      };
    });

    const informationScreensSnake = deepCamelToSnake(informationScreensCamel);

    const { error: updateError } = await supabase
      .from('onboarding_configs')
      .update({
        information_screens: informationScreensSnake,
        updated_at: now,
      })
      .eq('id', id);

    if (updateError) {
      console.error('PUT /api/admin/onboarding/[id]/information-screens update error:', updateError);
      return apiError('Failed to update information screens', 500);
    }

    logAuditEvent({
      action: 'onboarding.updated',
      resourceType: 'onboarding_config',
      resourceId: id,
      actorId: currentUser.uid,
      actorEmail: currentUser.email || 'unknown',
      changesAfter: {
        updatedFields: ['information_screens'],
        informationScreensCount: informationScreensCamel.length,
      },
      request,
    });

    return apiSuccess({
      message: 'Information screens updated successfully',
      informationScreens: informationScreensCamel,
    });
  } catch (error: unknown) {
    console.error('PUT /api/admin/onboarding/[id]/information-screens error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update information screens';
    return apiError(message, 500);
  }
}
