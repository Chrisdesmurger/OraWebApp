import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { logAuditEvent } from '@/lib/audit/logger';
import { mapOnboardingConfigFromFirestore, mapOnboardingConfigToFirestore } from '@/lib/onboarding/firestore-mappers';
import type { OnboardingConfig, UpdateOnboardingRequest } from '@/types/onboarding';

/**
 * GET /api/admin/onboarding/[id] - Get specific onboarding configuration
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

    const db = getFirestore();
    const doc = await db.collection('onboarding_configs').doc(id).get();

    if (!doc.exists) {
      return apiError('Onboarding configuration not found', 404);
    }

    const raw = doc.data() ?? {};
    const mapped = mapOnboardingConfigFromFirestore<OnboardingConfig>(raw);

    const config: OnboardingConfig = {
      id: doc.id,
      ...(mapped.value as any),
    } as OnboardingConfig;

    return apiSuccess(config);

  } catch (error: any) {
    console.error('GET /api/admin/onboarding/[id] error:', error);
    return apiError(error.message || 'Failed to fetch onboarding configuration', 500);
  }
}

/**
 * PUT /api/admin/onboarding/[id] - Update onboarding configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin'])) {
      return apiError('Only admins can update onboarding configurations', 403);
    }

    const { id } = await params;

    if (!id) {
      return apiError('Configuration ID is required', 400);
    }

    const body: UpdateOnboardingRequest = await request.json();
    const { title, description, questions, status } = body;

    const db = getFirestore();
    const docRef = db.collection('onboarding_configs').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return apiError('Onboarding configuration not found', 404);
    }

    const existingData = doc.data() as OnboardingConfig;

    // Prevent editing published/active configs
    if (existingData.status === 'active' && status !== 'active' && status !== 'archived') {
      return apiError('Cannot modify active configuration. Archive it first or create a new version.', 400);
    }

    const now = new Date();

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: now,
      updated_at: now,
    };

    if (title !== undefined) {
      if (!title.trim()) {
        return apiError('Title cannot be empty', 400);
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return apiError('Description cannot be empty', 400);
      }
      updates.description = description.trim();
    }

    if (questions !== undefined) {
      if (questions.length === 0) {
        return apiError('At least one question is required', 400);
      }

      // Validate questions
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

      const mappedQuestions = mapOnboardingConfigToFirestore({ questions }).value;

      // Store questions array with snake_case keys inside each question/option
      // while keeping the API request/response camelCase.
      updates.questions = (mappedQuestions as any).questions ?? questions;
    }

    if (status !== undefined) {
      if (!['draft', 'active', 'archived'].includes(status)) {
        return apiError('Invalid status', 400);
      }
      updates.status = status;
    }

    await docRef.update(updates);

    // Log audit event
    logAuditEvent({
      action: 'onboarding.updated',
      resourceType: 'onboarding_config',
      resourceId: id,
      actorId: currentUser.uid,
      actorEmail: currentUser.email || 'unknown',
      changesAfter: {
        version: existingData.version,
        updatedFields: Object.keys(updates),
      },
      request,
    });

    const updatedDoc = await docRef.get();
    const updatedRaw = updatedDoc.data() ?? {};
    const updatedMapped = mapOnboardingConfigFromFirestore<OnboardingConfig>(updatedRaw);

    return apiSuccess({
      id: updatedDoc.id,
      ...(updatedMapped.value as any),
      message: 'Onboarding configuration updated successfully',
    });

  } catch (error: any) {
    console.error('PUT /api/admin/onboarding/[id] error:', error);
    return apiError(error.message || 'Failed to update onboarding configuration', 500);
  }
}

/**
 * DELETE /api/admin/onboarding/[id] - Delete onboarding configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin'])) {
      return apiError('Only admins can delete onboarding configurations', 403);
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

    // Prevent deleting active configs
    if (data.status === 'active') {
      return apiError('Cannot delete active configuration. Archive it first.', 400);
    }

    await docRef.delete();

    // Log audit event
    logAuditEvent({
      action: 'onboarding.deleted',
      resourceType: 'onboarding_config',
      resourceId: id,
      actorId: currentUser.uid,
      actorEmail: currentUser.email || 'unknown',
      changesAfter: {
        version: data.version,
        status: data.status,
      },
      request,
    });

    return apiSuccess({
      id,
      message: 'Onboarding configuration deleted successfully',
    });

  } catch (error: any) {
    console.error('DELETE /api/admin/onboarding/[id] error:', error);
    return apiError(error.message || 'Failed to delete onboarding configuration', 500);
  }
}
