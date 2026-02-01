/**
 * Scheduled Inactivity Check
 *
 * Runs daily at 9:00 AM to identify inactive users and send reminder emails.
 * - 7 days inactive: First reminder
 * - 30 days inactive: Second reminder with different messaging
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(functions.config().resend?.api_key || process.env.RESEND_API_KEY);

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface UserData {
  email: string;
  first_name?: string;
  last_login_at?: number;
  language?: string;
}

interface SuggestedContent {
  id: string;
  title: string;
  type: 'lesson' | 'program';
  imageUrl?: string;
}

/**
 * Scheduled function that runs daily at 9:00 AM (Europe/Paris)
 * Checks for inactive users and sends reminder emails
 */
export const scheduledInactivityCheck = functions
  .region('europe-west1')
  .pubsub.schedule('0 9 * * *')
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;
    const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60 * 1000;

    console.log('[InactivityCheck] Starting daily inactivity check');

    try {
      // Get suggested content for recommendations
      const suggestedContent = await getSuggestedContent();

      // Find users inactive for 7-8 days (to avoid sending multiple emails)
      await processInactiveUsers(
        sevenDaysAgo,
        eightDaysAgo,
        'inactivity_7d',
        suggestedContent
      );

      // Find users inactive for 30-31 days
      await processInactiveUsers(
        thirtyDaysAgo,
        thirtyOneDaysAgo,
        'inactivity_30d',
        suggestedContent
      );

      console.log('[InactivityCheck] Completed successfully');
      return null;
    } catch (error) {
      console.error('[InactivityCheck] Error:', error);
      throw error;
    }
  });

/**
 * Process inactive users and send reminder emails
 */
async function processInactiveUsers(
  inactiveSince: number,
  notOlderThan: number,
  emailType: 'inactivity_7d' | 'inactivity_30d',
  suggestedContent: SuggestedContent[]
): Promise<void> {
  // Query users who haven't logged in within the timeframe
  const usersSnapshot = await db
    .collection('users')
    .where('last_login_at', '<=', inactiveSince)
    .where('last_login_at', '>', notOlderThan)
    .get();

  console.log(
    `[InactivityCheck] Found ${usersSnapshot.size} users for ${emailType}`
  );

  for (const doc of usersSnapshot.docs) {
    const userData = doc.data() as UserData;
    const userId = doc.id;

    // Check if user has opted out of engagement emails
    const prefsDoc = await db
      .collection('users')
      .doc(userId)
      .collection('email_preferences')
      .doc('preferences')
      .get();

    if (prefsDoc.exists) {
      const prefs = prefsDoc.data();
      if (
        prefs?.unsubscribed_all ||
        prefs?.engagement_emails === false ||
        prefs?.inactivity_reminders === false
      ) {
        console.log(
          `[InactivityCheck] Skipping ${userId} - opted out of engagement emails`
        );
        continue;
      }
    }

    // Check if we already sent this type of email recently (within 7 days)
    const recentEmailCheck = await db
      .collection('email_logs')
      .where('recipient_uid', '==', userId)
      .where('email_type', '==', emailType)
      .where('sent_at', '>', Date.now() - 7 * 24 * 60 * 60 * 1000)
      .limit(1)
      .get();

    if (!recentEmailCheck.empty) {
      console.log(
        `[InactivityCheck] Skipping ${userId} - already sent ${emailType} recently`
      );
      continue;
    }

    // Send the inactivity reminder email
    await sendInactivityEmail(userId, userData, emailType, suggestedContent);
  }
}

/**
 * Send inactivity reminder email
 */
async function sendInactivityEmail(
  userId: string,
  userData: UserData,
  emailType: 'inactivity_7d' | 'inactivity_30d',
  suggestedContent: SuggestedContent[]
): Promise<void> {
  const language = userData.language || 'fr';
  const baseUrl =
    functions.config().app?.base_url ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://ora-wellbeing.com';

  // Generate unsubscribe token (simplified - in production use proper signing)
  const unsubscribeToken = Buffer.from(
    JSON.stringify({ userId, email: userData.email, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');

  // Format last activity date
  const lastActivityDate = userData.last_login_at
    ? new Date(userData.last_login_at).toLocaleDateString(
        language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
      )
    : '';

  const subjects: Record<string, Record<string, string>> = {
    inactivity_7d: {
      fr: 'Vous nous manquez ! Reprenez votre pratique',
      en: 'We miss you! Resume your practice',
      es: 'Te echamos de menos! Retoma tu practica',
    },
    inactivity_30d: {
      fr: 'Il est temps de reprendre votre pratique bien-etre',
      en: "It's time to resume your wellness practice",
      es: 'Es hora de retomar tu practica de bienestar',
    },
  };

  try {
    // Call the Next.js API to send the email (which handles template rendering)
    const response = await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${functions.config().api?.internal_key || ''}`,
      },
      body: JSON.stringify({
        to: userData.email,
        emailType,
        language,
        props: {
          recipientEmail: userData.email,
          language,
          firstName: userData.first_name,
          lastActivityDate,
          suggestedContent,
          baseUrl,
          unsubscribeToken,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    // Log the email
    await db.collection('email_logs').add({
      email_type: emailType,
      recipient_uid: userId,
      recipient_email: userData.email,
      language,
      status: 'sent',
      sent_at: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[InactivityCheck] Sent ${emailType} email to ${userId}`);
  } catch (error) {
    console.error(
      `[InactivityCheck] Failed to send ${emailType} to ${userId}:`,
      error
    );

    // Log the failure
    await db.collection('email_logs').add({
      email_type: emailType,
      recipient_uid: userId,
      recipient_email: userData.email,
      language,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      sent_at: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Get suggested content for recommendations
 */
async function getSuggestedContent(): Promise<SuggestedContent[]> {
  const content: SuggestedContent[] = [];

  // Get recent popular lessons
  const lessonsSnapshot = await db
    .collection('lessons')
    .where('status', '==', 'ready')
    .orderBy('created_at', 'desc')
    .limit(3)
    .get();

  lessonsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    content.push({
      id: doc.id,
      title: data.title_fr || data.title || 'Lesson',
      type: 'lesson',
      imageUrl: data.thumbnail_url,
    });
  });

  return content;
}
