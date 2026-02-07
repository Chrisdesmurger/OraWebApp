/**
 * Weekly Digest - Supabase Edge Function
 *
 * Replaces Firebase scheduled function (Sundays 10 AM Europe/Paris).
 * Called via pg_cron job (weekly-digest).
 *
 * Sends weekly activity summaries to users who have opted in:
 * - New lessons and programs published in the last 7 days
 * - User's weekly practice stats (lessons completed, minutes, streak)
 * - Weekly wellness tips
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface UserToNotify {
  id: string
  email: string
  first_name: string | null
  language: string | null
}

interface NewContent {
  id: string
  title: string
  type: 'lesson' | 'program'
  imageUrl?: string
}

interface WeeklyStats {
  lessonsCompleted: number
  minutesPracticed: number
  currentStreak: number
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

    console.log('[WeeklyDigest] Starting weekly digest send')

    // Initialize Supabase service client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://ora-wellbeing.com'
    const internalApiKey = Deno.env.get('INTERNAL_API_KEY') || ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate week boundaries
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setHours(0, 0, 0, 0)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 7)

    // Get new content from this week
    const newContent = await getNewContentThisWeek(supabase, weekStart.toISOString())

    // Get weekly tips
    const tips = getWeeklyTips()

    // Get all users who have opted in to weekly digest
    const usersToNotify = await getUsersForDigest(supabase)

    console.log(`[WeeklyDigest] Found ${usersToNotify.length} users to notify`)

    // Process in batches of 50
    const batchSize = 50
    let sentCount = 0
    let failedCount = 0

    for (let i = 0; i < usersToNotify.length; i += batchSize) {
      const batch = usersToNotify.slice(i, i + batchSize)

      const results = await Promise.allSettled(
        batch.map((user) =>
          sendDigestEmail(
            supabase,
            user,
            weekStart,
            weekEnd,
            newContent,
            tips,
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

      // Small delay between batches
      if (i + batchSize < usersToNotify.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`[WeeklyDigest] Completed: ${sentCount} sent, ${failedCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        total_users: usersToNotify.length,
        sent: sentCount,
        failed: failedCount,
        new_content_count: newContent.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[WeeklyDigest] Error:', errorMessage)

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Get users who should receive the weekly digest.
 * Includes users where digest = true or where no preference row exists (default to subscribed).
 */
async function getUsersForDigest(
  supabase: ReturnType<typeof createClient>
): Promise<UserToNotify[]> {
  const { data: usersWithPrefs, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      language,
      email_preferences!left(digest)
    `)
    .not('email', 'is', null)

  if (error) {
    throw new Error(`Failed to query users for digest: ${error.message}`)
  }

  return (usersWithPrefs || [])
    .filter((user) => {
      const prefs = user.email_preferences as unknown as Array<{ digest: boolean }> | null
      // Default to subscribed if no preferences row exists
      if (!prefs || prefs.length === 0) return true
      return prefs[0].digest !== false
    })
    .map((user) => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      language: user.language,
    }))
}

/**
 * Get new content published in the last 7 days
 */
async function getNewContentThisWeek(
  supabase: ReturnType<typeof createClient>,
  weekStartIso: string
): Promise<NewContent[]> {
  const content: NewContent[] = []

  // Get new lessons with status 'ready'
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title_fr, thumbnail_url')
    .eq('status', 'ready')
    .gte('created_at', weekStartIso)
    .order('created_at', { ascending: false })
    .limit(5)

  if (lessons) {
    for (const lesson of lessons) {
      content.push({
        id: lesson.id,
        title: lesson.title_fr || 'Lesson',
        type: 'lesson',
        imageUrl: lesson.thumbnail_url || undefined,
      })
    }
  }

  // Get new programs with status 'published'
  const { data: programs } = await supabase
    .from('programs')
    .select('id, title, cover_image_url')
    .eq('status', 'published')
    .gte('created_at', weekStartIso)
    .order('created_at', { ascending: false })
    .limit(3)

  if (programs) {
    for (const program of programs) {
      content.push({
        id: program.id,
        title: program.title || 'Program',
        type: 'program',
        imageUrl: program.cover_image_url || undefined,
      })
    }
  }

  return content
}

/**
 * Get user's weekly practice stats from user_sessions table
 */
async function getUserWeeklyStats(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyStats> {
  try {
    // Get completed sessions this week
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('duration_sec')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString())

    const lessonsCompleted = sessions?.length || 0
    const totalSeconds = (sessions || []).reduce(
      (sum, s) => sum + (s.duration_sec || 0),
      0
    )
    const minutesPracticed = Math.round(totalSeconds / 60)

    // Get current streak from user_practice_stats
    const { data: statsRows } = await supabase
      .from('user_practice_stats')
      .select('streak_days')
      .eq('user_id', userId)
      .limit(1)

    const currentStreak = statsRows?.[0]?.streak_days || 0

    return { lessonsCompleted, minutesPracticed, currentStreak }
  } catch (error) {
    console.error(`[WeeklyDigest] Error getting stats for ${userId}:`, error)
    return { lessonsCompleted: 0, minutesPracticed: 0, currentStreak: 0 }
  }
}

/**
 * Get weekly wellness tips (returns 2 random tips)
 */
function getWeeklyTips(): string[] {
  const allTips = [
    'Essayez de pratiquer a la meme heure chaque jour pour creer une habitude durable.',
    'La respiration profonde peut reduire le stress en quelques minutes seulement.',
    'Commencez par des seances courtes et augmentez progressivement la duree.',
    'La constance est plus importante que la duree de chaque seance.',
    'Prenez un moment pour vous feliciter apres chaque pratique.',
  ]

  // Return 2 random tips
  const shuffled = [...allTips].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 2)
}

/**
 * Send digest email to a single user
 */
async function sendDigestEmail(
  supabase: ReturnType<typeof createClient>,
  user: UserToNotify,
  weekStart: Date,
  weekEnd: Date,
  newContent: NewContent[],
  tips: string[],
  appBaseUrl: string,
  internalApiKey: string
): Promise<void> {
  const language = user.language || 'fr'

  // Get user's weekly stats
  const stats = await getUserWeeklyStats(supabase, user.id, weekStart, weekEnd)

  // Generate unsubscribe token
  const unsubscribeToken = btoa(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })
  )

  // Format dates
  const dateFormat: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  }
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US'
  const weekStartDate = weekStart.toLocaleDateString(locale, dateFormat)
  const weekEndDate = weekEnd.toLocaleDateString(locale, dateFormat)

  try {
    const response = await fetch(`${appBaseUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalApiKey}`,
      },
      body: JSON.stringify({
        to: user.email,
        emailType: 'weekly_digest',
        language,
        props: {
          recipientEmail: user.email,
          language,
          firstName: user.first_name,
          weekStartDate,
          weekEndDate,
          newContent,
          lessonsCompleted: stats.lessonsCompleted,
          minutesPracticed: stats.minutesPracticed,
          currentStreak: stats.currentStreak,
          tips,
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
      email_type: 'weekly_digest',
      recipient_uid: user.id,
      recipient_email: user.email,
      language,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    console.log(`[WeeklyDigest] Sent digest to ${user.id}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[WeeklyDigest] Failed to send to ${user.id}:`, errorMessage)

    // Log the failure
    await supabase.from('email_logs').insert({
      email_type: 'weekly_digest',
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
