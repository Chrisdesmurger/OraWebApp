/**
 * Onboarding Complete Email API
 *
 * POST /api/email/onboarding-complete - Send email after user completes onboarding
 *
 * This endpoint can be called:
 * - From the frontend after onboarding completion
 * - From Cloud Functions after onboarding data is saved
 * - Manually by admin for users who completed onboarding
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send-email';
import type { SupportedLanguage } from '@/lib/firestore/conversions';

interface OnboardingCompleteEmailRequest {
  userId: string;
  email: string;
  firstName?: string;
  language?: SupportedLanguage;
  recommendedProgramIds?: string[];
}

interface RecommendedProgram {
  id: string;
  title: string;
  imageUrl?: string;
}

/**
 * POST /api/email/onboarding-complete - Send onboarding complete email
 */
export async function POST(request: NextRequest) {
  try {
    const body: OnboardingCompleteEmailRequest = await request.json();
    const { userId, email, firstName, language = 'fr', recommendedProgramIds } = body;

    // Validate required fields
    if (!userId || !email) {
      return apiError('userId and email are required', 400);
    }

    const supabase = createSupabaseServiceClient();

    // Verify user exists
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      return apiError('User not found', 404);
    }

    const userFirstName = firstName || userRow?.first_name || undefined;
    const userLanguage = language || userRow?.language || 'fr';

    // Fetch recommended programs if IDs provided, otherwise get from user recommendations
    let recommendedPrograms: RecommendedProgram[] = [];

    if (recommendedProgramIds && recommendedProgramIds.length > 0) {
      // Fetch programs by IDs
      const { data: programRows } = await supabase
        .from('programs')
        .select('id, title, title_fr, thumbnail_url, image_url')
        .in('id', recommendedProgramIds.slice(0, 3));

      if (programRows) {
        recommendedPrograms = programRows.map(row => ({
          id: row.id,
          title: row.title || row.title_fr || 'Programme',
          imageUrl: row.thumbnail_url || row.image_url || undefined,
        }));
      }
    } else {
      // Try to get recommendations from user_recommendations table
      const { data: recRow } = await supabase
        .from('user_recommendations')
        .select('recommendations')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (recRow?.recommendations) {
        const programIds = recRow.recommendations.program_ids || recRow.recommendations.recommended_programs || [];

        if (programIds.length > 0) {
          const { data: programRows } = await supabase
            .from('programs')
            .select('id, title, title_fr, thumbnail_url, image_url')
            .in('id', programIds.slice(0, 3));

          if (programRows) {
            recommendedPrograms = programRows.map(row => ({
              id: row.id,
              title: row.title || row.title_fr || 'Programme',
              imageUrl: row.thumbnail_url || row.image_url || undefined,
            }));
          }
        }
      }
    }

    // If still no programs, fetch some popular ones
    if (recommendedPrograms.length === 0) {
      const { data: popularRows } = await supabase
        .from('programs')
        .select('id, title, title_fr, thumbnail_url, image_url')
        .eq('status', 'published')
        .limit(3);

      if (popularRows) {
        recommendedPrograms = popularRows.map(row => ({
          id: row.id,
          title: row.title || row.title_fr || 'Programme',
          imageUrl: row.thumbnail_url || row.image_url || undefined,
        }));
      }
    }

    // Get base URL for email links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ora-wellbeing.com';

    // Get first lesson URL (first lesson of first recommended program or generic dashboard)
    let firstLessonUrl = `${baseUrl}/dashboard`;

    if (recommendedPrograms.length > 0) {
      const firstProgramId = recommendedPrograms[0].id;
      // Try to get the first lesson of the program
      const { data: lessonRows } = await supabase
        .from('lessons')
        .select('id')
        .eq('program_id', firstProgramId)
        .order('order', { ascending: true })
        .limit(1);

      if (lessonRows && lessonRows.length > 0) {
        firstLessonUrl = `${baseUrl}/lesson/${lessonRows[0].id}`;
      } else {
        firstLessonUrl = `${baseUrl}/program/${firstProgramId}`;
      }
    }

    // Send onboarding complete email
    const result = await sendEmail({
      emailType: 'onboarding_complete',
      recipientEmail: email,
      recipientUid: userId,
      language: userLanguage as SupportedLanguage,
      variables: {
        firstName: userFirstName,
        recommendedPrograms,
        firstLessonUrl,
        baseUrl,
      },
    });

    if (!result.success) {
      console.error('[Onboarding Complete Email] Failed to send:', result.error);
      return apiError(result.error || 'Failed to send onboarding complete email', 500);
    }

    console.log(`[Onboarding Complete Email] Sent to ${email} (${userId}) with ${recommendedPrograms.length} program recommendations`);

    return apiSuccess({
      success: true,
      messageId: result.messageId,
      email,
      recommendedProgramsCount: recommendedPrograms.length,
    });
  } catch (error: unknown) {
    console.error('[Onboarding Complete Email] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send onboarding complete email';
    return apiError(errorMessage, 500);
  }
}
