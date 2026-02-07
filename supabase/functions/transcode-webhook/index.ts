/**
 * Transcode Webhook - Supabase Edge Function
 *
 * Replaces Firebase Storage onObjectFinalized trigger.
 * Called via Supabase Storage webhook when a file is uploaded to the
 * media-lessons bucket under {lessonId}/original/* path.
 *
 * This function does NOT perform the actual transcoding (unlike the Firebase
 * version which used FFmpeg directly). Instead, it:
 * 1. Validates the uploaded file path
 * 2. Updates the lesson status to 'processing'
 * 3. Calls an external Cloud Run transcoding service via HTTP
 *
 * The Cloud Run service handles the actual FFmpeg transcoding work and
 * updates the lesson record when complete.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface StorageWebhookPayload {
  type: string
  table: string
  record: {
    id: string
    name: string
    bucket_id: string
    owner: string | null
    created_at: string
    updated_at: string
    last_accessed_at: string | null
    metadata: Record<string, unknown> | null
  }
  schema: string
  old_record: Record<string, unknown> | null
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

    const payload: StorageWebhookPayload = await req.json()
    const filePath = payload.record?.name
    const bucketId = payload.record?.bucket_id

    console.log(`[TranscodeWebhook] Storage event: bucket=${bucketId}, path=${filePath}`)

    // Only process files from the media-lessons bucket
    if (bucketId !== 'media-lessons') {
      console.log('[TranscodeWebhook] Skipping - not media-lessons bucket')
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'wrong_bucket' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Only process files in {lessonId}/original/* path
    if (!filePath || !filePath.includes('/original/')) {
      console.log('[TranscodeWebhook] Skipping - not an original file')
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'not_original' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Extract lesson ID from path: {lessonId}/original/{filename}
    const pathParts = filePath.split('/')
    if (pathParts.length < 3) {
      console.error('[TranscodeWebhook] Invalid file path structure:', filePath)
      return new Response(
        JSON.stringify({ error: 'Invalid file path structure' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const lessonId = pathParts[0]
    console.log(`[TranscodeWebhook] Processing lesson: ${lessonId}`)

    // Initialize Supabase service client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const transcodeServiceUrl = Deno.env.get('TRANSCODE_SERVICE_URL')
    const transcodeServiceKey = Deno.env.get('TRANSCODE_SERVICE_KEY') || ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the lesson exists
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, type, category_fr, status, source_aspect_ratio, output_aspect_ratio, aspect_conversion_mode')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lesson) {
      console.error(`[TranscodeWebhook] Lesson not found: ${lessonId}`)
      return new Response(
        JSON.stringify({ error: `Lesson not found: ${lessonId}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update lesson status to 'processing'
    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        status: 'processing',
        storage_path_original: filePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId)

    if (updateError) {
      console.error(`[TranscodeWebhook] Failed to update lesson status:`, updateError)
      throw new Error(`Failed to update lesson status: ${updateError.message}`)
    }

    console.log(`[TranscodeWebhook] Lesson ${lessonId} status updated to processing`)

    // Call Cloud Run transcoding service if configured
    if (!transcodeServiceUrl) {
      console.warn(
        '[TranscodeWebhook] TRANSCODE_SERVICE_URL not set - transcoding must be triggered manually'
      )
      return new Response(
        JSON.stringify({
          success: true,
          lesson_id: lessonId,
          status: 'processing',
          warning: 'Transcode service URL not configured - manual trigger required',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build the public URL for the original file
    const { data: publicUrlData } = supabase.storage
      .from('media-lessons')
      .getPublicUrl(filePath)

    const fileUrl = publicUrlData?.publicUrl

    // Call the transcoding service
    const transcodeResponse = await fetch(transcodeServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${transcodeServiceKey}`,
      },
      body: JSON.stringify({
        lesson_id: lessonId,
        bucket: 'media-lessons',
        file_path: filePath,
        file_url: fileUrl,
        lesson_type: lesson.type,
        category: lesson.category_fr || null,
        // Supabase project info for the transcoding service to write back results
        supabase_url: supabaseUrl,
        supabase_service_key: supabaseServiceKey,
        // Callback URL for the transcoding service to notify when done
        callback_url: `${supabaseUrl}/functions/v1/transcode-webhook`,
      }),
    })

    if (!transcodeResponse.ok) {
      const errorBody = await transcodeResponse.text().catch(() => 'No response body')
      console.error(
        `[TranscodeWebhook] Transcode service responded with ${transcodeResponse.status}: ${errorBody}`
      )

      // Update lesson status to 'failed' if the transcoding service rejected the request
      await supabase
        .from('lessons')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId)

      // Log error to audit_logs
      await supabase.from('audit_logs').insert({
        action: 'status_change',
        resource_type: 'lesson',
        resource_id: lessonId,
        changes: {
          error: `Transcode service error: ${transcodeResponse.status}`,
          file_path: filePath,
        },
      })

      throw new Error(`Transcode service error: ${transcodeResponse.status}`)
    }

    console.log(`[TranscodeWebhook] Transcoding job submitted for lesson ${lessonId}`)

    return new Response(
      JSON.stringify({
        success: true,
        lesson_id: lessonId,
        status: 'processing',
        file_path: filePath,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[TranscodeWebhook] Error:', errorMessage)

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
