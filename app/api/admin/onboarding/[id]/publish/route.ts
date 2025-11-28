import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
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

    const db = getFirestore();
    const docRef = db.collection('onboarding_configs').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return apiError('Onboarding configuration not found', 404);
    }

    const data = doc.data() as OnboardingConfig;

    // Validate the configuration before publishing
    if (!data.questions || data.questions.length === 0) {
      return apiError('Cannot publish configuration without questions', 400);
    }

    // Validate all questions have required fields
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
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

    const now = new Date();

    // Use a transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // 1. Deactivate all currently active configs
      const activeConfigs = await db
        .collection('onboarding_configs')
        .where('status', '==', 'active')
        .get();

      activeConfigs.docs.forEach(activeDoc => {
        transaction.update(activeDoc.ref, {
          status: 'archived',
          updatedAt: now,
        });
      });

      // 2. Activate this config
      transaction.update(docRef, {
        status: 'active',
        publishedAt: now,
        publishedBy: currentUser.uid,
        updatedAt: now,
      });
    });

    // Log audit event
    logAuditEvent({
      action: 'onboarding.published',
      resourceType: 'onboarding_config',
      resourceId: id,
      actorId: currentUser.uid,
      actorEmail: currentUser.email || 'unknown',
      changesAfter: {
        version: data.version,
        questionCount: data.questions.length,
      },
      request,
    });

    const updatedDoc = await docRef.get();

    return apiSuccess({
      id: updatedDoc.id,
      ...updatedDoc.data(),
      message: 'Onboarding configuration published successfully. It is now active.',
    });

  } catch (error: any) {
    console.error('POST /api/admin/onboarding/[id]/publish error:', error);
    return apiError(error.message || 'Failed to publish onboarding configuration', 500);
  }
}
