import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api/auth-middleware';

/**
 * POST /api/auth/set-token
 * DEPRECATED: Supabase handles session cookies automatically.
 * Kept for backward compatibility - returns success without action.
 */
export async function POST(request: NextRequest) {
  return apiSuccess({
    success: true,
    message: 'Token management is handled automatically by Supabase. This endpoint is deprecated.'
  });
}
