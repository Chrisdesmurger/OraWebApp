/**
 * Supabase Client Helpers for Cloud Run Transcoding Service
 *
 * Provides authenticated Supabase operations for:
 * - Downloading original media files from Supabase Storage
 * - Uploading transcoded renditions back to Supabase Storage
 * - Updating lesson rows in PostgreSQL
 * - Logging audit errors
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Create or return a singleton Supabase client using service role key.
 * Service role key bypasses RLS for server-side operations.
 */
export function createClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: SUPABASE_URL');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseInstance;
}

/**
 * Download a file from Supabase Storage to a local path.
 *
 * @param bucket - Storage bucket name (e.g., "media")
 * @param storagePath - Path within the bucket (e.g., "lessons/{id}/original/video.mp4")
 * @param destPath - Local file system path to save the downloaded file
 */
export async function downloadFile(
  bucket: string,
  storagePath: string,
  destPath: string
): Promise<void> {
  const client = createClient();

  console.log(`[supabase] Downloading ${bucket}/${storagePath} -> ${destPath}`);

  const { data, error } = await client.storage
    .from(bucket)
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download file from Supabase Storage: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No data returned when downloading ${bucket}/${storagePath}`);
  }

  // Ensure the destination directory exists
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Convert Blob to Buffer and write to disk
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(destPath, buffer);

  console.log(`[supabase] Downloaded ${buffer.length} bytes to ${destPath}`);
}

/**
 * Upload a file to Supabase Storage.
 *
 * @param bucket - Storage bucket name (e.g., "media")
 * @param storagePath - Destination path within the bucket
 * @param srcPath - Local file system path of the file to upload
 * @param contentType - MIME type of the file (e.g., "video/mp4")
 */
export async function uploadFile(
  bucket: string,
  storagePath: string,
  srcPath: string,
  contentType: string
): Promise<void> {
  const client = createClient();

  console.log(`[supabase] Uploading ${srcPath} -> ${bucket}/${storagePath}`);

  const fileBuffer = fs.readFileSync(srcPath);

  const { error } = await client.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true, // Overwrite if already exists
    });

  if (error) {
    throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
  }

  console.log(`[supabase] Uploaded ${fileBuffer.length} bytes to ${bucket}/${storagePath}`);
}

/**
 * Rendition data stored in the lesson row (video).
 */
export interface RenditionData {
  path: string;
  width: number;
  height: number;
  bitrate_kbps: number;
}

/**
 * Audio variant data stored in the lesson row.
 */
export interface AudioVariantData {
  path: string;
  bitrate_kbps: number;
}

/**
 * Update a lesson row in the PostgreSQL lessons table via Supabase client.
 *
 * @param lessonId - UUID of the lesson to update
 * @param data - Partial lesson data to update
 */
export async function updateLesson(
  lessonId: string,
  data: Record<string, unknown>
): Promise<void> {
  const client = createClient();

  console.log(`[supabase] Updating lesson ${lessonId}:`, JSON.stringify(data, null, 2));

  const { error } = await client
    .from('lessons')
    .update(data)
    .eq('id', lessonId);

  if (error) {
    throw new Error(`Failed to update lesson ${lessonId}: ${error.message}`);
  }

  console.log(`[supabase] Lesson ${lessonId} updated successfully`);
}

/**
 * Log a transcoding error to the audit_logs table.
 *
 * @param lessonId - UUID of the lesson that failed transcoding
 * @param error - The error that occurred
 * @param filePath - Storage path of the file being transcoded
 */
export async function logAuditError(
  lessonId: string,
  error: Error | string,
  filePath: string
): Promise<void> {
  const client = createClient();

  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.log(`[supabase] Logging audit error for lesson ${lessonId}`);

  const { error: insertError } = await client
    .from('audit_logs')
    .insert({
      action: 'transcode_error',
      resource_type: 'lesson',
      resource_id: lessonId,
      actor_id: 'system:cloud-run-transcoding',
      actor_email: 'system@ora.app',
      changes: {
        error_message: errorMessage,
        error_stack: errorStack,
        file_path: filePath,
      },
      created_at: new Date().toISOString(),
    });

  if (insertError) {
    // Do not throw here -- we don't want error logging failure to mask the original error
    console.error(`[supabase] Failed to log audit error: ${insertError.message}`);
  } else {
    console.log(`[supabase] Audit error logged for lesson ${lessonId}`);
  }
}
