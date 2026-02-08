/**
 * API Route: /api/admin/onboarding/recommendation-rules
 *
 * CRUD for recommendation rules stored in the active onboarding config's
 * `recommendation_rules` JSONB column.
 *
 * GET  - Read all rules from the active config
 * PUT  - Replace all rules in the active config (bulk save)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { RecommendationRule } from '@/types/onboarding';

/**
 * GET /api/admin/onboarding/recommendation-rules
 * Returns the recommendation rules from the active onboarding config.
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const supabase = createSupabaseServiceClient();

    const { data: config, error } = await supabase
      .from('onboarding_configs')
      .select('recommendation_rules')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('GET recommendation-rules error:', error);
      return apiError('Failed to fetch recommendation rules', 500);
    }

    const rules = (config?.recommendation_rules as RecommendationRule[]) || [];

    return apiSuccess(rules);
  } catch (error: unknown) {
    console.error('GET recommendation-rules error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return apiError(message, 401);
  }
}

/**
 * PUT /api/admin/onboarding/recommendation-rules
 * Replaces all recommendation rules in the active onboarding config.
 */
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const { rules } = body;

    if (!Array.isArray(rules)) {
      return apiError('rules must be an array', 400);
    }

    // Stamp each rule with audit info
    const now = new Date().toISOString();
    const stampedRules: RecommendationRule[] = rules.map((rule: Partial<RecommendationRule>) => ({
      id: rule.id || `rule_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      programId: rule.programId || '',
      programTitle: rule.programTitle || '',
      conditions: rule.conditions || [],
      priority: rule.priority || 1,
      active: rule.active !== undefined ? rule.active : true,
      description: rule.description || '',
      createdAt: rule.createdAt || now,
      updatedAt: now,
      createdBy: rule.createdBy || currentUser.uid,
    }));

    const supabase = createSupabaseServiceClient();

    // Find the active config
    const { data: config, error: configError } = await supabase
      .from('onboarding_configs')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error('PUT recommendation-rules config fetch error:', configError);
      return apiError('Failed to fetch active configuration', 500);
    }

    if (!config) {
      return apiError('No active onboarding configuration found', 404);
    }

    // Update the recommendation_rules JSONB column
    const { error: updateError } = await supabase
      .from('onboarding_configs')
      .update({
        recommendation_rules: stampedRules,
        updated_at: now,
      })
      .eq('id', config.id);

    if (updateError) {
      console.error('PUT recommendation-rules update error:', updateError);
      return apiError('Failed to save recommendation rules', 500);
    }

    console.log(`[API] Updated ${stampedRules.length} recommendation rules on config ${config.id}`);

    return apiSuccess({
      message: `${stampedRules.length} recommendation rules saved`,
      rules: stampedRules,
    });
  } catch (error: unknown) {
    console.error('PUT recommendation-rules error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return apiError(message, 401);
  }
}
