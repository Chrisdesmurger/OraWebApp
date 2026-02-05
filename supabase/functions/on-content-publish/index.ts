/**
 * On Content Publish - Supabase Edge Function
 *
 * Replaces Firebase Firestore trigger on lessons/{lessonId} onUpdate.
 * Called via database trigger (notify_content_published) when a lesson's
 * status changes to 'ready'.
 *
 * Sends new content notification emails to all users who have opted in
 * (email_preferences.marketing = true) via the Next.js API endpoint
 * POST /api/email/send.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ContentPublishPayload {
  lesson_id: string
  title_fr?: string
  title_en?: string
  title_es?: string
  description_fr?: string
  description_en?: string
  description_es?: string
  thumbnail_url?: string
  author_id?: string
}

interface UserToNotify {
  id: string
  email: string
  first_name: string | null
  language: string | null
}

Deno.serve(async (req) => {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse the payload sent by the database trigger
    const payload: ContentPublishPayload = await req.json()
    const {
      lesson_id,
      title_fr,
      title_en,
      title_es,
      description_fr,
      description_en,
      description_es,
      thumbnail_url,
      author_id,
    } = payload

    console.log(`[ContentPublish] New lesson published: ${lesson_id}`)

    // Initialize Supabase service client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://ora-wellbeing.com'
    const internalApiKey = Deno.env.get('INTERNAL_API_KEY') || ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get author info for the email
    let authorName: string | undefined
    if (author_id) {
      const { data: authorData } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', author_id)
        .single()

      if (authorData) {
        authorName = authorData.first_name
          ? `${authorData.first_name} ${authorData.last_name || ''}`.trim()
          : authorData.email
      }
    }

    // Get users who want new content notifications
    // Join users with email_preferences: include users where marketing = true
    // or where no preference row exists (default to subscribed)
    const { data: usersWithPrefs, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        language,
        email_preferences!left(marketing)
      `)
      .not('email', 'is', null)

    if (usersError) {
      throw new Error(`Failed to query users: ${usersError.message}`)
    }

    // Filter users: include if no preferences row or marketing = true
    const usersToNotify: UserToNotify[] = (usersWithPrefs || []).filter((user) => {
      const prefs = user.email_preferences as unknown as Array<{ marketing: boolean }> | null
      // If no preferences row exists, default to subscribed
      if (!prefs || prefs.length === 0) return true
      // If preferences exist, check marketing opt-in
      return prefs[0].marketing !== false
    }).map((user) => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      language: user.language,
    }))

    console.log(`[ContentPublish] Notifying ${usersToNotify.length} users about new lesson`)

    // Process in batches of 50
    const batchSize = 50
    let sentCount = 0
    let failedCount = 0

    for (let i = 0; i < usersToNotify.length; i += batchSize) {
      const batch = usersToNotify.slice(i, i + batchSize)

      const results = await Promise.allSettled(
        batch.map((user) =>
          sendNewContentEmail(
            supabase,
            user,
            {
              lesson_id,
              title_fr,
              title_en,
              title_es,
              description_fr,
              description_en,
              description_es,
              thumbnail_url,
              authorName,
            },
            appBaseUrl,
            internalApiKey
          )
        )
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          sentCount++
        } else {
          failedCount++
        }
      }

      // Small delay between batches to avoid overwhelming the API
      if (i + batchSize < usersToNotify.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(
      `[ContentPublish] Finished: ${sentCount} sent, ${failedCount} failed for lesson ${lesson_id}`
    )

    return new Response(
      JSON.stringify({
        success: true,
        lesson_id,
        total_users: usersToNotify.length,
        sent: sentCount,
        failed: failedCount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[ContentPublish] Error:`, errorMessage)

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Send new content notification email to a single user
 */
async function sendNewContentEmail(
  supabase: ReturnType<typeof createClient>,
  user: UserToNotify,
  lesson: {
    lesson_id: string
    title_fr?: string
    title_en?: string
    title_es?: string
    description_fr?: string
    description_en?: string
    description_es?: string
    thumbnail_url?: string
    authorName?: string
  },
  appBaseUrl: string,
  internalApiKey: string
): Promise<void> {
  const language = user.language || 'fr'

  // Get localized content title
  const contentTitle =
    (language === 'fr'
      ? lesson.title_fr
      : language === 'es'
        ? lesson.title_es
        : lesson.title_en) ||
    lesson.title_fr ||
    'New Lesson'

  // Get localized description
  const contentDescription =
    (language === 'fr'
      ? lesson.description_fr
      : language === 'es'
        ? lesson.description_es
        : lesson.description_en) || lesson.description_fr

  // Generate unsubscribe token
  const unsubscribeToken = btoa(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })
  )

  try {
    const response = await fetch(`${appBaseUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalApiKey}`,
      },
      body: JSON.stringify({
        to: user.email,
        emailType: 'new_content',
        language,
        props: {
          recipientEmail: user.email,
          language,
          contentTitle,
          contentType: 'lesson',
          contentUrl: `${appBaseUrl}/lessons/${lesson.lesson_id}`,
          contentDescription,
          contentImageUrl: lesson.thumbnail_url,
          authorName: lesson.authorName,
          baseUrl: appBaseUrl,
          unsubscribeToken,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`)
    }

    // Log successful email
    await supabase.from('email_logs').insert({
      email_type: 'new_content',
      recipient_uid: user.id,
      recipient_email: user.email,
      language,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    console.log(`[ContentPublish] Sent new content email to ${user.id}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[ContentPublish] Failed to send to ${user.id}:`, errorMessage)

    // Log the failure
    await supabase.from('email_logs').insert({
      email_type: 'new_content',
      recipient_uid: user.id,
      recipient_email: user.email,
      language,
      status: 'failed',
      error_message: errorMessage,
      sent_at: new Date().toISOString(),
    })

    throw error
  }
}
