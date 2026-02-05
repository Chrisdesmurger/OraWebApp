/**
 * On User Create - Supabase Edge Function
 *
 * Replaces Firebase auth.user().onCreate() trigger.
 * Called via database trigger (notify_user_created) when a new row is inserted
 * into the public.users table.
 *
 * Sends a welcome email to the newly registered user by calling the
 * Next.js API endpoint POST /api/email/welcome.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface UserCreatePayload {
  user_id: string
  email: string
  first_name?: string
  language?: string
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
    const payload: UserCreatePayload = await req.json()
    const { user_id, email, first_name, language = 'fr' } = payload

    console.log(`[OnUserCreate] New user created: ${user_id}`)

    if (!email) {
      console.log(`[OnUserCreate] No email for user ${user_id}, skipping welcome email`)
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'no_email' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase service client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://ora-wellbeing.com'
    const internalApiKey = Deno.env.get('INTERNAL_API_KEY') || ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch additional user data if first_name not provided in payload
    let userName = first_name
    let userLanguage = language

    if (!userName) {
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, language')
        .eq('id', user_id)
        .single()

      if (userData) {
        userName = userData.first_name || undefined
        userLanguage = userData.language || 'fr'
      }
    }

    // Call the Next.js API to send the welcome email
    const response = await fetch(`${appBaseUrl}/api/email/welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalApiKey}`,
      },
      body: JSON.stringify({
        userId: user_id,
        email,
        firstName: userName,
        language: userLanguage,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No response body')
      throw new Error(`API responded with ${response.status}: ${errorBody}`)
    }

    // Log the successful email to email_logs table
    const { error: logError } = await supabase.from('email_logs').insert({
      email_type: 'welcome',
      recipient_uid: user_id,
      recipient_email: email,
      language: userLanguage,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    if (logError) {
      console.error(`[OnUserCreate] Failed to log email:`, logError)
    }

    console.log(`[OnUserCreate] Welcome email sent to ${user_id} (${email})`)

    return new Response(JSON.stringify({ success: true, user_id, email }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[OnUserCreate] Error:`, errorMessage)

    // Attempt to log the failure
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const payload = await req.clone().json().catch(() => ({}))

        await supabase.from('email_logs').insert({
          email_type: 'welcome',
          recipient_uid: payload.user_id || null,
          recipient_email: payload.email || null,
          status: 'failed',
          error_message: errorMessage,
          sent_at: new Date().toISOString(),
        })
      }
    } catch (logErr) {
      console.error(`[OnUserCreate] Failed to log error:`, logErr)
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
