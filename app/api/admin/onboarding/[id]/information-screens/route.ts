import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
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
 * with Firestore snake_case storage.
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

    const db = getFirestore();
    const doc = await db.collection('onboarding_configs').doc(id).get();

    if (!doc.exists) {
      return apiError('Onboarding configuration not found', 404);
    }

    const data = doc.data() ?? {};
    const camel = deepSnakeToCamel<Record<string, unknown>>(data);

    const merged = {
      ...data,
      ...camel,
    } as any;

    const informationScreens =
      merged.informationScreens || merged.information_screens || [];

    return apiSuccess({ informationScreens });
  } catch (error: any) {
    console.error('GET /api/admin/onboarding/[id]/information-screens error:', error);
    return apiError(error.message || 'Failed to fetch information screens', 500);
  }
}

/**
 * PUT /api/admin/onboarding/[id]/information-screens
 * Persists information screens in BOTH formats:
 * - camelCase: informationScreens (legacy + current UI)
 * - snake_case: information_screens (Android-aligned / future-proof)
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

    const db = getFirestore();
    const docRef = db.collection('onboarding_configs').doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return apiError('Onboarding configuration not found', 404);
    }

    const now = new Date();

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

    await docRef.update({
      informationScreens: informationScreensCamel,
      information_screens: informationScreensSnake,
      updatedAt: now,
      updated_at: now,
    });

    logAuditEvent({
      action: 'onboarding.updated',
      resourceType: 'onboarding_config',
      resourceId: id,
      actorId: currentUser.uid,
      actorEmail: currentUser.email || 'unknown',
      changesAfter: {
        updatedFields: ['informationScreens', 'information_screens'],
        informationScreensCount: informationScreensCamel.length,
      },
      request,
    });

    return apiSuccess({
      message: 'Information screens updated successfully',
      informationScreens: informationScreensCamel,
    });
  } catch (error: any) {
    console.error('PUT /api/admin/onboarding/[id]/information-screens error:', error);
    return apiError(error.message || 'Failed to update information screens', 500);
  }
}
