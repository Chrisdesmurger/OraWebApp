/**
 * Inactivity Check - Supabase Edge Function
 *
 * Replaces Firebase scheduled function (daily 9 AM Europe/Paris).
 * Called via pg_cron job (daily-inactivity-check).
 *
 * Identifies users who have been inactive for:
 * - 7-8 days: First inactivity reminder
 * - 30-31 days: Second inactivity reminder with stronger messaging
 *
 * Checks email preferences and recent email logs before sending.
 * Includes 3 suggested lessons as content recommendations.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SuggestedContent {
  id: string
  title: string
  type: 'lesson' | 'program'
  imageUrl?: string
}

interface InactiveUser {
  id: string
  email: string
  first_name: string | null
  last_login_at: string | null
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

    console.log('[InactivityCheck] Starting daily inactivity check')

    // Initialize Supabase service client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://ora-wellbeing.com'
    const internalApiKey = Deno.env.get('INTERNAL_API_KEY') || ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate time boundaries
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)

    // Get suggested content for recommendations
    const suggestedContent = await getSuggestedContent(supabase)

    // Process 7-day inactive users
    const result7d = await processInactiveUsers(
      supabase,
      eightDaysAgo.toISOString(),
      sevenDaysAgo.toISOString(),
      'inactivity_7d',
      suggestedContent,
      appBaseUrl,
      internalApiKey
    )

    // Process 30-day inactive users
    const result30d = await processInactiveUsers(
      supabase,
      thirtyOneDaysAgo.toISOString(),
      thirtyDaysAgo.toISOString(),
      'inactivity_30d',
      suggestedContent,
      appBaseUrl,
      internalApiKey
    )

    console.log('[InactivityCheck] Completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        inactivity_7d: result7d,
        inactivity_30d: result30d,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[InactivityCheck] Error:', errorMessage)

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Process inactive users for a given time window and send reminder emails
 */
async function processInactiveUsers(
  supabase: ReturnType<typeof createClient>,
  notOlderThan: string,
  inactiveSince: string,
  emailType: 'inactivity_7d' | 'inactivity_30d',
  suggestedContent: SuggestedContent[],
  appBaseUrl: string,
  internalApiKey: string
): Promise<{ found: number; sent: number; skipped: number; failed: number }> {
  // Query users who haven't logged in within the timeframe
  // last_login_at BETWEEN notOlderThan AND inactiveSince
  const { data: inactiveUsers, error: queryError } = await supabase
    .from('users')
    .select('id, email, first_name, last_login_at, language')
    .not('email', 'is', null)
    .gte('last_login_at', notOlderThan)
    .lte('last_login_at', inactiveSince)

  if (queryError) {
    throw new Error(`Failed to query inactive users: ${queryError.message}`)
  }

  const users: InactiveUser[] = inactiveUsers || []
  console.log(`[InactivityCheck] Found ${users.length} users for ${emailType}`)

  let sentCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (const user of users) {
    // Check if user has opted out of inactivity emails
    const { data: prefs } = await supabase
      .from('email_preferences')
      .select('inactivity')
      .eq('user_id', user.id)
      .single()

    if (prefs && prefs.inactivity === false) {
      console.log(`[InactivityCheck] Skipping ${user.id} - opted out of inactivity emails`)
      skippedCount++
      continue
    }

    // Check if we already sent this type of email recently (within 7 days)
    const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentEmails } = await supabase
      .from('email_logs')
      .select('id')
      .eq('recipient_uid', user.id)
      .eq('email_type', emailType)
      .gte('sent_at', sevenDaysAgoStr)
      .limit(1)

    if (recentEmails && recentEmails.length > 0) {
      console.log(`[InactivityCheck] Skipping ${user.id} - already sent ${emailType} recently`)
      skippedCount++
      continue
    }

    // Send the inactivity reminder email
    try {
      await sendInactivityEmail(
        supabase,
        user,
        emailType,
        suggestedContent,
        appBaseUrl,
        internalApiKey
      )
      sentCount++
    } catch {
      failedCount++
    }
  }

  return { found: users.length, sent: sentCount, skipped: skippedCount, failed: failedCount }
}

/**
 * Send inactivity reminder email to a single user
 */
async function sendInactivityEmail(
  supabase: ReturnType<typeof createClient>,
  user: InactiveUser,
  emailType: 'inactivity_7d' | 'inactivity_30d',
  suggestedContent: SuggestedContent[],
  appBaseUrl: string,
  internalApiKey: string
): Promise<void> {
  const language = user.language || 'fr'

  // Generate unsubscribe token
  const unsubscribeToken = btoa(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })
  )

  // Format last activity date
  let lastActivityDate = ''
  if (user.last_login_at) {
    const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US'
    lastActivityDate = new Date(user.last_login_at).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  try {
    const response = await fetch(`${appBaseUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalApiKey}`,
      },
      body: JSON.stringify({
        to: user.email,
        emailType,
        language,
        props: {
          recipientEmail: user.email,
          language,
          firstName: user.first_name,
          lastActivityDate,
          suggestedContent,
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
      email_type: emailType,
      recipient_uid: user.id,
      recipient_email: user.email,
      language,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    console.log(`[InactivityCheck] Sent ${emailType} email to ${user.id}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[InactivityCheck] Failed to send ${emailType} to ${user.id}:`, errorMessage)

    // Log the failure
    await supabase.from('email_logs').insert({
      email_type: emailType,
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

/**
 * Get 3 recent ready lessons as suggested content for email recommendations
 */
async function getSuggestedContent(
  supabase: ReturnType<typeof createClient>
): Promise<SuggestedContent[]> {
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, title_fr, thumbnail_url')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) {
    console.error('[InactivityCheck] Failed to get suggested content:', error)
    return []
  }

  return (lessons || []).map((lesson) => ({
    id: lesson.id,
    title: lesson.title_fr || 'Lesson',
    type: 'lesson' as const,
    imageUrl: lesson.thumbnail_url || undefined,
  }))
}
