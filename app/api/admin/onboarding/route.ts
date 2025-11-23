import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { logAuditEvent } from '@/lib/audit/logger';
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

    const db = getFirestore();
    let query = db.collection('onboarding_configs').orderBy('createdAt', 'desc').limit(limit);

    // Filter by status if provided
    if (status && ['draft', 'active', 'archived'].includes(status)) {
      query = query.where('status', '==', status) as any;
    }

    const snapshot = await query.get();
    const configs: OnboardingConfig[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as OnboardingConfig[];

    return apiSuccess({
      configs,
      total: configs.length,
    });

  } catch (error: any) {
    console.error('GET /api/admin/onboarding error:', error);
    return apiError(error.message || 'Failed to fetch onboarding configurations', 500);
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

      // Sliders, circular pickers, and text inputs don't need options
      const needsOptions = q.type.kind !== 'slider'
        && q.type.kind !== 'circular_picker'
        && q.type.kind !== 'text_input';
      if (needsOptions && (!q.options || q.options.length === 0)) {
        return apiError(`Question at index ${i} must have at least one option`, 400);
      }
    }

    const db = getFirestore();
    const now = new Date();

    // Generate version ID (v1.0, v1.1, etc.)
    const existingVersions = await db
      .collection('onboarding_configs')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let versionNumber = '1.0';
    if (!existingVersions.empty) {
      const lastVersion = existingVersions.docs[0].data().version || '1.0';
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
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.uid,
    };

    const docRef = await db.collection('onboarding_configs').add(newConfig);

    // Log audit event
    logAuditEvent({
      action: 'onboarding.created',
      resourceType: 'onboarding_config',
      resourceId: docRef.id,
      actorId: currentUser.uid,
      actorEmail: currentUser.email || 'unknown',
      changesAfter: {
        version: versionNumber,
        questionCount: questionsWithIds.length,
      },
      request,
    });

    return apiSuccess({
      id: docRef.id,
      ...newConfig,
      message: 'Onboarding configuration created successfully',
    }, 201);

  } catch (error: any) {
    console.error('POST /api/admin/onboarding error:', error);
    return apiError(error.message || 'Failed to create onboarding configuration', 500);
  }
}
