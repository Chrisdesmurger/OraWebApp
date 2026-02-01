/**
 * On Content Publish Trigger
 *
 * Firestore trigger that sends notifications when new content is published.
 * Monitors lessons collection for status changes to 'ready'.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface LessonData {
  title?: string;
  title_fr?: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_fr?: string;
  description_en?: string;
  description_es?: string;
  thumbnail_url?: string;
  status?: string;
  author_id?: string;
  created_at?: number;
}

interface UserData {
  email: string;
  first_name?: string;
  language?: string;
}

/**
 * Firestore trigger when a lesson document is updated
 * Sends notifications when status changes to 'ready'
 */
export const onContentPublish = functions
  .region('europe-west1')
  .firestore.document('lessons/{lessonId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as LessonData;
    const after = change.after.data() as LessonData;
    const lessonId = context.params.lessonId;

    // Only trigger if status changed to 'ready'
    if (before.status === after.status || after.status !== 'ready') {
      return null;
    }

    console.log(`[ContentPublish] New lesson published: ${lessonId}`);

    try {
      // Get author info for the email
      let authorName: string | undefined;
      if (after.author_id) {
        const authorDoc = await db
          .collection('users')
          .doc(after.author_id)
          .get();
        if (authorDoc.exists) {
          const authorData = authorDoc.data();
          authorName = authorData?.first_name
            ? `${authorData.first_name} ${authorData.last_name || ''}`
            : authorData?.email;
        }
      }

      // Get users who want new content notifications
      const usersToNotify = await getUsersForNewContent();

      console.log(
        `[ContentPublish] Notifying ${usersToNotify.length} users about new lesson`
      );

      const baseUrl =
        functions.config().app?.base_url ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'https://ora-wellbeing.com';

      // Process in batches
      const batchSize = 50;
      for (let i = 0; i < usersToNotify.length; i += batchSize) {
        const batch = usersToNotify.slice(i, i + batchSize);
        await Promise.all(
          batch.map((user) =>
            sendNewContentEmail(user.id, user.data, after, lessonId, authorName, baseUrl)
          )
        );

        // Small delay between batches
        if (i + batchSize < usersToNotify.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log(`[ContentPublish] Finished notifying about lesson ${lessonId}`);
      return null;
    } catch (error) {
      console.error('[ContentPublish] Error:', error);
      throw error;
    }
  });

/**
 * Get users who want new content notifications
 */
async function getUsersForNewContent(): Promise<
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
        prefs?.marketing_emails === false ||
        prefs?.new_content_notifications === false
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
 * Send new content notification email
 */
async function sendNewContentEmail(
  userId: string,
  userData: UserData,
  lesson: LessonData,
  lessonId: string,
  authorName: string | undefined,
  baseUrl: string
): Promise<void> {
  const language = userData.language || 'fr';

  // Get localized content title and description
  const contentTitle =
    (language === 'fr'
      ? lesson.title_fr
      : language === 'es'
        ? lesson.title_es
        : lesson.title_en) ||
    lesson.title ||
    'New Lesson';

  const contentDescription =
    (language === 'fr'
      ? lesson.description_fr
      : language === 'es'
        ? lesson.description_es
        : lesson.description_en) || lesson.description;

  // Generate unsubscribe token
  const unsubscribeToken = Buffer.from(
    JSON.stringify({
      userId,
      email: userData.email,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');

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
        emailType: 'new_content',
        language,
        props: {
          recipientEmail: userData.email,
          language,
          contentTitle,
          contentType: 'lesson',
          contentUrl: `${baseUrl}/lessons/${lessonId}`,
          contentDescription,
          contentImageUrl: lesson.thumbnail_url,
          authorName,
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
      email_type: 'new_content',
      recipient_uid: userId,
      recipient_email: userData.email,
      language,
      metadata: { lesson_id: lessonId },
      status: 'sent',
      sent_at: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[ContentPublish] Sent new content email to ${userId}`);
  } catch (error) {
    console.error(`[ContentPublish] Failed to send to ${userId}:`, error);

    // Log the failure
    await db.collection('email_logs').add({
      email_type: 'new_content',
      recipient_uid: userId,
      recipient_email: userData.email,
      language,
      metadata: { lesson_id: lessonId },
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      sent_at: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}
