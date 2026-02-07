/**
 * Cloud Run Transcoding Service - Entry Point
 *
 * HTTP server that receives transcoding requests from a Supabase Edge Function
 * (transcode-webhook), processes media files with FFmpeg, and stores results
 * back in Supabase Storage + PostgreSQL.
 *
 * This replaces the Firebase Cloud Function `transcodeOnFinalize`.
 */

import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import {
  probeMedia,
  transcodeVideo,
  transcodeAudio,
  generateThumbnail,
  AUDIO_VARIANTS,
  getRenditionsForContentType,
  getEffectiveAspectMode,
  DEFAULT_ASPECT_CONFIG,
} from './ffmpeg-wrapper';

import {
  downloadFile,
  uploadFile,
  updateLesson,
  logAuditError,
  RenditionData,
  AudioVariantData,
} from './supabase-client';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '8080', 10);
const TRANSCODE_SECRET = process.env.TRANSCODE_SECRET;

// ---------------------------------------------------------------------------
// Request / Response helpers
// ---------------------------------------------------------------------------

interface TranscodeRequest {
  lessonId: string;
  storagePath: string;
  bucket: string;
  lessonType: 'video' | 'audio';
  lessonCategory?: string | null;
}

function sendJson(res: http.ServerResponse, statusCode: number, body: Record<string, unknown>): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function validateRequest(body: unknown): body is TranscodeRequest {
  if (typeof body !== 'object' || body === null) return false;
  const obj = body as Record<string, unknown>;
  return (
    typeof obj.lessonId === 'string' && obj.lessonId.length > 0 &&
    typeof obj.storagePath === 'string' && obj.storagePath.length > 0 &&
    typeof obj.bucket === 'string' && obj.bucket.length > 0 &&
    (obj.lessonType === 'video' || obj.lessonType === 'audio')
  );
}

// ---------------------------------------------------------------------------
// Transcoding Logic
// ---------------------------------------------------------------------------

async function handleTranscode(payload: TranscodeRequest): Promise<Record<string, unknown>> {
  const { lessonId, storagePath, bucket, lessonType, lessonCategory } = payload;

  console.log(`[transcode] Starting: lesson=${lessonId} type=${lessonType} category=${lessonCategory || 'none'}`);
  console.log(`[transcode] Source: ${bucket}/${storagePath}`);

  // Create temp working directory
  const tempDir = path.join(os.tmpdir(), `transcode-${lessonId}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // -----------------------------------------------------------------------
    // 1. Update lesson status to "processing"
    // -----------------------------------------------------------------------
    await updateLesson(lessonId, {
      status: 'processing',
      updated_at: new Date().toISOString(),
    });
    console.log('[transcode] Status set to processing');

    // -----------------------------------------------------------------------
    // 2. Download original file from Supabase Storage
    // -----------------------------------------------------------------------
    const ext = path.extname(storagePath) || (lessonType === 'video' ? '.mp4' : '.m4a');
    const tempInputPath = path.join(tempDir, `original${ext}`);
    await downloadFile(bucket, storagePath, tempInputPath);

    // -----------------------------------------------------------------------
    // 3. Probe metadata
    // -----------------------------------------------------------------------
    const metadata = await probeMedia(tempInputPath);
    console.log('[transcode] Metadata:', JSON.stringify(metadata));

    // -----------------------------------------------------------------------
    // 4. Transcode
    // -----------------------------------------------------------------------
    const renditions: Record<string, RenditionData> = {};
    const audioVariants: Record<string, AudioVariantData> = {};
    let aspectConversionMode: 'crop' | 'letterbox' | 'none' | null = null;

    if (lessonType === 'video') {
      // -- Thumbnail --
      const thumbnailPath = path.join(tempDir, 'thumb.jpg');
      const thumbnailStoragePath = `lessons/${lessonId}/thumb.jpg`;
      try {
        await generateThumbnail(tempInputPath, thumbnailPath);
        await uploadFile(bucket, thumbnailStoragePath, thumbnailPath, 'image/jpeg');
        console.log('[transcode] Thumbnail uploaded');
      } catch (thumbError) {
        console.warn('[transcode] Thumbnail generation failed (non-critical):', thumbError);
      }

      // -- Content-type specific renditions (Issue #87) --
      const videoRenditions = getRenditionsForContentType(lessonCategory);
      console.log(`[transcode] Using ${lessonCategory || 'default'} video profile (${videoRenditions[0].bitrate} high bitrate)`);

      // -- Aspect ratio mode (Issue #88) --
      if (metadata.width && metadata.height) {
        aspectConversionMode = getEffectiveAspectMode(
          metadata.width,
          metadata.height,
          DEFAULT_ASPECT_CONFIG.targetRatio,
          DEFAULT_ASPECT_CONFIG.mode
        );
        console.log(`[transcode] Aspect conversion mode: ${aspectConversionMode}`);
      }

      // -- Transcode video renditions --
      for (const config of videoRenditions) {
        const outputPath = path.join(tempDir, `${config.quality}.mp4`);
        const renditionStoragePath = `lessons/${lessonId}/video/${config.quality}.mp4`;

        await transcodeVideo(tempInputPath, outputPath, config, metadata, DEFAULT_ASPECT_CONFIG);
        await uploadFile(bucket, renditionStoragePath, outputPath, 'video/mp4');

        renditions[config.quality] = {
          path: renditionStoragePath,
          width: config.width,
          height: config.height,
          bitrate_kbps: parseInt(config.bitrate.replace('k', ''), 10),
        };

        console.log(`[transcode] Uploaded ${config.quality} rendition`);
      }
    } else if (lessonType === 'audio') {
      // -- Transcode audio variants --
      for (const config of AUDIO_VARIANTS) {
        const outputPath = path.join(tempDir, `${config.quality}.m4a`);
        const variantStoragePath = `lessons/${lessonId}/audio/${config.quality}.m4a`;

        await transcodeAudio(tempInputPath, outputPath, config);
        await uploadFile(bucket, variantStoragePath, outputPath, 'audio/mp4');

        audioVariants[config.quality] = {
          path: variantStoragePath,
          bitrate_kbps: parseInt(config.bitrate.replace('k', ''), 10),
        };

        console.log(`[transcode] Uploaded ${config.quality} audio variant`);
      }
    }

    // -----------------------------------------------------------------------
    // 5. Update lesson in PostgreSQL with results
    // -----------------------------------------------------------------------
    const updateData: Record<string, unknown> = {
      status: 'ready',
      duration_sec: Math.round(metadata.duration),
      codec: metadata.codec,
      size_bytes: metadata.fileSize,
      updated_at: new Date().toISOString(),
    };

    if (lessonType === 'video') {
      updateData.renditions = renditions;
      updateData.thumbnail_url = `lessons/${lessonId}/thumb.jpg`;

      // Aspect ratio metadata (Issue #88)
      updateData.source_aspect_ratio = metadata.width && metadata.height
        ? `${metadata.width}:${metadata.height}`
        : null;
      updateData.output_aspect_ratio = '16:9';
      updateData.aspect_conversion_mode = aspectConversionMode;
    } else {
      updateData.audio_variants = audioVariants;
    }

    await updateLesson(lessonId, updateData);
    console.log('[transcode] Lesson updated with transcoding results');

    return {
      success: true,
      lessonId,
      lessonType,
      duration_sec: Math.round(metadata.duration),
      renditions: lessonType === 'video' ? Object.keys(renditions) : undefined,
      audioVariants: lessonType === 'audio' ? Object.keys(audioVariants) : undefined,
    };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[transcode] Failed:', err.message);

    // Update lesson status to 'failed'
    try {
      await updateLesson(lessonId, {
        status: 'failed',
        updated_at: new Date().toISOString(),
      });
    } catch (updateError) {
      console.error('[transcode] Failed to set error status:', updateError);
    }

    // Log to audit_logs
    try {
      await logAuditError(lessonId, err, storagePath);
    } catch (auditError) {
      console.error('[transcode] Failed to log audit error:', auditError);
    }

    throw err;
  } finally {
    // -----------------------------------------------------------------------
    // 6. Clean up temp files
    // -----------------------------------------------------------------------
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('[transcode] Temp files cleaned up');
    } catch (cleanupError) {
      console.warn('[transcode] Temp cleanup failed:', cleanupError);
    }
  }
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    return sendJson(res, 200, { status: 'ok', service: 'ora-transcoding', timestamp: new Date().toISOString() });
  }

  // Transcode endpoint
  if (req.method === 'POST' && req.url === '/transcode') {
    // Validate authorization
    if (!TRANSCODE_SECRET) {
      console.error('[server] TRANSCODE_SECRET not configured');
      return sendJson(res, 500, { error: 'Server misconfiguration: missing TRANSCODE_SECRET' });
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${TRANSCODE_SECRET}`) {
      console.warn('[server] Unauthorized request');
      return sendJson(res, 401, { error: 'Unauthorized: invalid or missing Bearer token' });
    }

    // Parse request body
    let body: unknown;
    try {
      const rawBody = await readBody(req);
      body = JSON.parse(rawBody);
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON body' });
    }

    // Validate payload
    if (!validateRequest(body)) {
      return sendJson(res, 400, {
        error: 'Invalid request body. Required fields: lessonId (string), storagePath (string), bucket (string), lessonType ("video" | "audio")',
      });
    }

    // Process transcoding
    try {
      const result = await handleTranscode(body);
      return sendJson(res, 200, result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown transcoding error';
      return sendJson(res, 500, { error: message, lessonId: body.lessonId });
    }
  }

  // 404 for all other routes
  return sendJson(res, 404, { error: 'Not found. Available endpoints: GET /health, POST /transcode' });
});

server.listen(PORT, () => {
  console.log(`[server] Ora Transcoding Service listening on port ${PORT}`);
  console.log(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[server] SUPABASE_URL: ${process.env.SUPABASE_URL ? 'configured' : 'MISSING'}`);
  console.log(`[server] SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'MISSING'}`);
  console.log(`[server] TRANSCODE_SECRET: ${TRANSCODE_SECRET ? 'configured' : 'MISSING'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[server] Server closed');
    process.exit(0);
  });
});
