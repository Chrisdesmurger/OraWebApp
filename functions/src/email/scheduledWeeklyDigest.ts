/**
 * Scheduled Weekly Digest
 *
 * Runs every Sunday at 10:00 AM to send weekly activity summaries
 * to users who have opted in to receive the digest.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface UserData {
  email: string;
  first_name?: string;
  language?: string;
}

interface WeeklyStats {
  lessonsCompleted: number;
  minutesPracticed: number;
  currentStreak: number;
}

interface NewContent {
  id: string;
  title: string;
  type: 'lesson' | 'program';
  imageUrl?: string;
}

/**
 * Scheduled function that runs every Sunday at 10:00 AM (Europe/Paris)
 * Sends weekly digest emails to subscribed users
 */
export const scheduledWeeklyDigest = functions
  .region('europe-west1')
  .pubsub.schedule('0 10 * * 0')
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    console.log('[WeeklyDigest] Starting weekly digest send');

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setHours(0, 0, 0, 0);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    try {
      // Get new content from this week
      const newContent = await getNewContentThisWeek(weekStart.getTime());

      // Get weekly tips (could be stored in Firestore or hardcoded)
      const tips = getWeeklyTips();

      // Get all users who have opted in to weekly digest
      const usersToNotify = await getUsersForDigest();

      console.log(`[WeeklyDigest] Found ${usersToNotify.length} users to notify`);

      // Process in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < usersToNotify.length; i += batchSize) {
        const batch = usersToNotify.slice(i, i + batchSize);
        await Promise.all(
          batch.map((user) =>
            sendDigestEmail(
              user.id,
              user.data,
              weekStart,
              weekEnd,
              newContent,
              tips
            )
          )
        );

        // Small delay between batches
        if (i + batchSize < usersToNotify.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log('[WeeklyDigest] Completed successfully');
      return null;
    } catch (error) {
      console.error('[WeeklyDigest] Error:', error);
      throw error;
    }
  });

/**
 * Get users who should receive the weekly digest
 */
async function getUsersForDigest(): Promise<
  Array<{ id: string; data: UserData }>
> {
  const users: Array<{ id: string; data: UserData }> = [];

  // Get all users
  const usersSnapshot = await db.collection('users').get();

  for (const doc of usersSnapshot.docs) {
    const userData = doc.data() as UserData;

    // Check preferences
    const prefsDoc = await db
      .collection('users')
      .doc(doc.id)
      .collection('email_preferences')
      .doc('preferences')
      .get();

    // Default to subscribed if no preferences set
    let includeUser = true;

    if (prefsDoc.exists) {
      const prefs = prefsDoc.data();
      if (
        prefs?.unsubscribed_all ||
        prefs?.weekly_digest === false ||
        prefs?.digest_frequency === 'never'
      ) {
        includeUser = false;
      }
    }

    if (includeUser && userData.email) {
      users.push({ id: doc.id, data: userData });
    }
  }

  return users;
}

/**
 * Get new content published this week
 */
async function getNewContentThisWeek(
  weekStartTimestamp: number
): Promise<NewContent[]> {
  const content: NewContent[] = [];

  // Get new lessons
  const lessonsSnapshot = await db
    .collection('lessons')
    .where('status', '==', 'ready')
    .where('created_at', '>=', weekStartTimestamp)
    .orderBy('created_at', 'desc')
    .limit(5)
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

  // Get new programs
  const programsSnapshot = await db
    .collection('programs')
    .where('status', '==', 'published')
    .where('created_at', '>=', weekStartTimestamp)
    .orderBy('created_at', 'desc')
    .limit(3)
    .get();

  programsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    content.push({
      id: doc.id,
      title: data.title_fr || data.title || 'Program',
      type: 'program',
      imageUrl: data.thumbnail_url,
    });
  });

  return content;
}

/**
 * Get user's weekly stats
 */
async function getUserWeeklyStats(
  userId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyStats> {
  try {
    // Get completed lessons this week
    const completionsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('lesson_completions')
      .where('completed_at', '>=', weekStart.getTime())
      .where('completed_at', '<', weekEnd.getTime())
      .get();

    let totalMinutes = 0;
    completionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalMinutes += data.duration_minutes || 0;
    });

    // Get current streak from user profile
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const currentStreak = userData?.current_streak || 0;

    return {
      lessonsCompleted: completionsSnapshot.size,
      minutesPracticed: totalMinutes,
      currentStreak,
    };
  } catch (error) {
    console.error(`[WeeklyDigest] Error getting stats for ${userId}:`, error);
    return {
      lessonsCompleted: 0,
      minutesPracticed: 0,
      currentStreak: 0,
    };
  }
}

/**
 * Get weekly tips (can be expanded to fetch from Firestore)
 */
function getWeeklyTips(): string[] {
  const allTips = [
    'Essayez de pratiquer a la meme heure chaque jour pour creer une habitude durable.',
    'La respiration profonde peut reduire le stress en quelques minutes seulement.',
    'Commencez par des seances courtes et augmentez progressivement la duree.',
    'La constance est plus importante que la duree de chaque seance.',
    'Prenez un moment pour vous feliciter apres chaque pratique.',
  ];

  // Return 2 random tips
  const shuffled = allTips.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
}

/**
 * Send digest email to a user
 */
async function sendDigestEmail(
  userId: string,
  userData: UserData,
  weekStart: Date,
  weekEnd: Date,
  newContent: NewContent[],
  tips: string[]
): Promise<void> {
  const language = userData.language || 'fr';
  const baseUrl =
    functions.config().app?.base_url ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://ora-wellbeing.com';

  // Get user's weekly stats
  const stats = await getUserWeeklyStats(userId, weekStart, weekEnd);

  // Generate unsubscribe token
  const unsubscribeToken = Buffer.from(
    JSON.stringify({
      userId,
      email: userData.email,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');

  // Format dates
  const dateFormat: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  const locale =
    language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US';
  const weekStartDate = weekStart.toLocaleDateString(locale, dateFormat);
  const weekEndDate = weekEnd.toLocaleDateString(locale, dateFormat);

  try {
    // Call the Next.js API to send the email
    const response = await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${functions.config().api?.internal_key || ''}`,
      },
      body: JSON.stringify({
        to: userData.email,
        emailType: 'weekly_digest',
        language,
        props: {
          recipientEmail: userData.email,
          language,
          firstName: userData.first_name,
          weekStartDate,
          weekEndDate,
          newContent,
          lessonsCompleted: stats.lessonsCompleted,
          minutesPracticed: stats.minutesPracticed,
          currentStreak: stats.currentStreak,
          tips,
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
      email_type: 'weekly_digest',
      recipient_uid: userId,
      recipient_email: userData.email,
      language,
      status: 'sent',
      sent_at: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[WeeklyDigest] Sent digest to ${userId}`);
  } catch (error) {
    console.error(`[WeeklyDigest] Failed to send to ${userId}:`, error);

    // Log the failure
    await db.collection('email_logs').add({
      email_type: 'weekly_digest',
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
