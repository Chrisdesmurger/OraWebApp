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
import { getFirestore } from '@/lib/firebase/admin';
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

    const firestore = getFirestore();

    // Verify user exists
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return apiError('User not found', 404);
    }

    const userData = userDoc.data();
    const userFirstName = firstName || userData?.first_name || undefined;
    const userLanguage = language || userData?.language || 'fr';

    // Fetch recommended programs if IDs provided, otherwise get from user recommendations
    let recommendedPrograms: RecommendedProgram[] = [];

    if (recommendedProgramIds && recommendedProgramIds.length > 0) {
      // Fetch programs by IDs
      const programPromises = recommendedProgramIds.slice(0, 3).map(async (id): Promise<RecommendedProgram | null> => {
        const programDoc = await firestore.collection('programs').doc(id).get();
        if (programDoc.exists) {
          const data = programDoc.data();
          return {
            id: programDoc.id,
            title: data?.title || data?.title_fr || 'Programme',
            imageUrl: data?.thumbnail_url || data?.image_url || undefined,
          };
        }
        return null;
      });

      const programs = await Promise.all(programPromises);
      recommendedPrograms = programs.filter((p): p is RecommendedProgram => p !== null);
    } else {
      // Try to get recommendations from user's recommendation document
      const recommendationsDoc = await firestore
        .collection('users')
        .doc(userId)
        .collection('recommendations')
        .doc('current')
        .get();

      if (recommendationsDoc.exists) {
        const recData = recommendationsDoc.data();
        const programIds = recData?.program_ids || recData?.recommended_programs || [];

        if (programIds.length > 0) {
          const programPromises = programIds.slice(0, 3).map(async (id: string): Promise<RecommendedProgram | null> => {
            const programDoc = await firestore.collection('programs').doc(id).get();
            if (programDoc.exists) {
              const data = programDoc.data();
              return {
                id: programDoc.id,
                title: data?.title || data?.title_fr || 'Programme',
                imageUrl: data?.thumbnail_url || data?.image_url || undefined,
              };
            }
            return null;
          });

          const programs = await Promise.all(programPromises);
          recommendedPrograms = programs.filter((p): p is RecommendedProgram => p !== null);
        }
      }
    }

    // If still no programs, fetch some popular ones
    if (recommendedPrograms.length === 0) {
      const popularProgramsSnapshot = await firestore
        .collection('programs')
        .where('status', '==', 'published')
        .limit(3)
        .get();

      recommendedPrograms = popularProgramsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data?.title || data?.title_fr || 'Programme',
          imageUrl: data?.thumbnail_url || data?.image_url || undefined,
        };
      });
    }

    // Get base URL for email links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ora-wellbeing.com';

    // Get first lesson URL (first lesson of first recommended program or generic dashboard)
    let firstLessonUrl = `${baseUrl}/dashboard`;

    if (recommendedPrograms.length > 0) {
      const firstProgramId = recommendedPrograms[0].id;
      // Try to get the first lesson of the program
      const lessonsSnapshot = await firestore
        .collection('lessons')
        .where('program_id', '==', firstProgramId)
        .orderBy('order', 'asc')
        .limit(1)
        .get();

      if (!lessonsSnapshot.empty) {
        const firstLessonId = lessonsSnapshot.docs[0].id;
        firstLessonUrl = `${baseUrl}/lesson/${firstLessonId}`;
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
