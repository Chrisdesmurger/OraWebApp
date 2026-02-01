/**
 * On User Create Trigger
 *
 * Firebase Auth trigger that sends welcome emails when new users register.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Firebase Auth trigger when a new user is created
 * Sends a welcome email to the new user
 */
export const onUserCreate = functions
  .region('europe-west1')
  .auth.user()
  .onCreate(async (user) => {
    console.log(`[UserCreate] New user created: ${user.uid}`);

    try {
      // Get additional user data from Firestore (if exists)
      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.exists ? userDoc.data() : null;

      const firstName = userData?.first_name || user.displayName?.split(' ')[0];
      const language = userData?.language || 'fr';
      const email = user.email;

      if (!email) {
        console.log(`[UserCreate] No email for user ${user.uid}, skipping welcome email`);
        return null;
      }

      const baseUrl =
        functions.config().app?.base_url ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'https://ora-wellbeing.com';

      // Generate unsubscribe token
      const unsubscribeToken = Buffer.from(
        JSON.stringify({
          userId: user.uid,
          email,
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
        })
      ).toString('base64url');

      // Call the Next.js API to send the welcome email
      const response = await fetch(`${baseUrl}/api/email/welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${functions.config().api?.internal_key || ''}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          email,
          firstName,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      // Log the email
      await db.collection('email_logs').add({
        email_type: 'welcome',
        recipient_uid: user.uid,
        recipient_email: email,
        language,
        status: 'sent',
        sent_at: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[UserCreate] Welcome email sent to ${user.uid}`);
      return null;
    } catch (error) {
      console.error(`[UserCreate] Error sending welcome email to ${user.uid}:`, error);

      // Log the failure
      if (user.email) {
        await db.collection('email_logs').add({
          email_type: 'welcome',
          recipient_uid: user.uid,
          recipient_email: user.email,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          sent_at: admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      throw error;
    }
  });
