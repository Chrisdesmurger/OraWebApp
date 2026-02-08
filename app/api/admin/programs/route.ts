/**
 * API Route: GET /api/admin/programs
 *
 * Returns a simplified list of all programs for admin dropdowns
 * (e.g., recommendation rules program selector).
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await authenticateRequest(request);

    if (!requireRole(currentUser, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const supabase = createSupabaseServiceClient();

    const { data: programs, error } = await supabase
      .from('programs')
      .select('id, title, category, difficulty, status')
      .order('title', { ascending: true });

    if (error) {
      console.error('GET /api/admin/programs error:', error);
      return apiError('Failed to fetch programs', 500);
    }

    return apiSuccess(programs || []);
  } catch (error: unknown) {
    console.error('GET /api/admin/programs error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return apiError(message, 401);
  }
}
