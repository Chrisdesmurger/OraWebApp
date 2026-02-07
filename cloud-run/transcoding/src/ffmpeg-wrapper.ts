/**
 * FFmpeg Wrapper Utilities (Cloud Run version)
 *
 * Ported from functions/src/utils/ffmpeg-wrapper.ts for Cloud Run.
 * Uses system-installed FFmpeg/FFprobe instead of npm installer packages.
 *
 * All transcoding logic (renditions, audio variants, aspect ratio handling,
 * thumbnail generation) is identical to the Firebase Cloud Function version.
 */

import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';

// Use system-installed FFmpeg and FFprobe (installed via Dockerfile)
ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
ffmpeg.setFfprobePath('/usr/bin/ffprobe');

export interface MediaMetadata {
  duration: number; // in seconds
  codec: string;
  width?: number;
  height?: number;
  bitrate?: number;
  fileSize: number;
}

/**
 * Aspect ratio configuration for video transcoding
 * Issue #86: Handle aspect ratio conversion for 16:9 output
 */
export interface AspectRatioConfig {
  targetRatio: number; // 16/9 = 1.777...
  mode: 'crop' | 'letterbox' | 'auto';
}

/**
 * Default aspect ratio config - Auto mode for 16:9 output
 * - Crops if source is wider than 16:9
 * - Letterboxes if source is taller than 16:9
 */
export const DEFAULT_ASPECT_CONFIG: AspectRatioConfig = {
  targetRatio: 16 / 9,
  mode: 'auto',
};

/**
 * Calculate FFmpeg filter string for aspect ratio conversion
 * Issue #86: Handle aspect ratio conversion for 16:9 output
 *
 * @param sourceWidth - Source video width in pixels
 * @param sourceHeight - Source video height in pixels
 * @param targetWidth - Target output width in pixels
 * @param targetHeight - Target output height in pixels
 * @param mode - Conversion mode: 'crop', 'letterbox', or 'auto'
 * @returns FFmpeg filter string (e.g., "crop=1920:1080:320:0,scale=1920:1080")
 */
export function calculateAspectFilter(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  mode: 'crop' | 'letterbox' | 'auto'
): string {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  // For auto mode: crop if source is wider, letterbox if source is taller
  const effectiveMode = mode === 'auto'
    ? (sourceRatio > targetRatio ? 'crop' : 'letterbox')
    : mode;

  // If ratios are very close (within 1%), just scale directly
  const ratioDiff = Math.abs(sourceRatio - targetRatio) / targetRatio;
  if (ratioDiff < 0.01) {
    return `scale=${targetWidth}:${targetHeight}`;
  }

  if (effectiveMode === 'crop') {
    // Center crop: calculate crop dimensions to match target ratio
    const cropWidth = Math.floor(sourceHeight * targetRatio);
    const cropX = Math.floor((sourceWidth - cropWidth) / 2);
    return `crop=${cropWidth}:${sourceHeight}:${cropX}:0,scale=${targetWidth}:${targetHeight}`;
  } else {
    // Letterbox: scale to fit height, then pad to target width
    const scaledWidth = Math.floor(sourceWidth * (targetHeight / sourceHeight));
    const padX = Math.floor((targetWidth - scaledWidth) / 2);
    return `scale=${scaledWidth}:${targetHeight},pad=${targetWidth}:${targetHeight}:${padX}:0:black`;
  }
}

/**
 * Determine the effective conversion mode used
 */
export function getEffectiveAspectMode(
  sourceWidth: number,
  sourceHeight: number,
  targetRatio: number,
  mode: 'crop' | 'letterbox' | 'auto'
): 'crop' | 'letterbox' | 'none' {
  const sourceRatio = sourceWidth / sourceHeight;
  const ratioDiff = Math.abs(sourceRatio - targetRatio) / targetRatio;

  // If ratios are very close, no conversion needed
  if (ratioDiff < 0.01) {
    return 'none';
  }

  if (mode === 'auto') {
    return sourceRatio > targetRatio ? 'crop' : 'letterbox';
  }

  return mode;
}

export interface VideoRenditionConfig {
  quality: 'high' | 'medium' | 'low';
  width: number;
  height: number;
  bitrate: string; // e.g., '5000k'
}

export interface AudioVariantConfig {
  quality: 'high' | 'medium' | 'low';
  bitrate: string; // e.g., '320k'
}

/**
 * Probe media file to extract metadata
 */
export async function probeMedia(filePath: string): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('[ffprobe] Error:', err);
        return reject(err);
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
      const stream = videoStream || audioStream;

      if (!stream) {
        return reject(new Error('No video or audio stream found'));
      }

      const result: MediaMetadata = {
        duration: metadata.format.duration || 0,
        codec: stream.codec_name || 'unknown',
        bitrate: metadata.format.bit_rate ? parseInt(String(metadata.format.bit_rate), 10) : undefined,
        fileSize: typeof metadata.format.size === 'number' ? metadata.format.size : 0,
      };

      if (videoStream) {
        result.width = videoStream.width;
        result.height = videoStream.height;
      }

      console.log('[ffprobe] Media metadata:', JSON.stringify(result));
      resolve(result);
    });
  });
}

/**
 * Transcode video to specific rendition with optional aspect ratio conversion
 * Issue #86: Updated to support aspect ratio handling
 *
 * @param inputPath - Path to input video file
 * @param outputPath - Path for output video file
 * @param config - Rendition configuration (resolution, bitrate)
 * @param sourceMetadata - Optional source video metadata for aspect ratio calculation
 * @param aspectConfig - Optional aspect ratio configuration (defaults to 16:9 auto)
 */
export async function transcodeVideo(
  inputPath: string,
  outputPath: string,
  config: VideoRenditionConfig,
  sourceMetadata?: MediaMetadata,
  aspectConfig: AspectRatioConfig = DEFAULT_ASPECT_CONFIG
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[transcode] Video ${config.quality} (${config.width}x${config.height} @ ${config.bitrate})...`);

    let command = ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('128k')
      .videoBitrate(config.bitrate);

    // Apply aspect ratio filter if source dimensions are known
    if (sourceMetadata?.width && sourceMetadata?.height) {
      const filter = calculateAspectFilter(
        sourceMetadata.width,
        sourceMetadata.height,
        config.width,
        config.height,
        aspectConfig.mode
      );
      console.log(`[transcode] Applying aspect filter: ${filter}`);
      command = command.videoFilters(filter);
    } else {
      // Fallback to simple scaling if no metadata (may cause distortion)
      console.log('[transcode] No source metadata - using simple scale (may distort)');
      command = command.size(`${config.width}x${config.height}`);
    }

    command
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-movflags +faststart', // Enable streaming
      ])
      .on('start', (commandLine: string) => {
        console.log('[ffmpeg] Command:', commandLine);
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[transcode] Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`[transcode] Video transcoded: ${config.quality}`);
        resolve();
      })
      .on('error', (err: Error) => {
        console.error(`[transcode] Error (${config.quality}):`, err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Transcode audio to specific variant
 */
export async function transcodeAudio(
  inputPath: string,
  outputPath: string,
  config: AudioVariantConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[transcode] Audio ${config.quality} (${config.bitrate})...`);

    ffmpeg(inputPath)
      .output(outputPath)
      .audioCodec('aac')
      .audioBitrate(config.bitrate)
      .audioChannels(2)
      .audioFrequency(44100)
      .outputOptions([
        '-movflags +faststart',
      ])
      .on('start', (commandLine: string) => {
        console.log('[ffmpeg] Command:', commandLine);
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`[transcode] Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`[transcode] Audio transcoded: ${config.quality}`);
        resolve();
      })
      .on('error', (err: Error) => {
        console.error(`[transcode] Error (${config.quality}):`, err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Generate video thumbnail
 */
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  timeOffset: string = '00:00:01'
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[transcode] Generating thumbnail...');

    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timeOffset],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '1280x720',
      })
      .on('end', () => {
        console.log('[transcode] Thumbnail generated');
        resolve();
      })
      .on('error', (err: Error) => {
        console.error('[transcode] Thumbnail generation error:', err.message);
        reject(err);
      });
  });
}

/**
 * Video rendition configurations (default)
 */
export const VIDEO_RENDITIONS: VideoRenditionConfig[] = [
  { quality: 'high', width: 1920, height: 1080, bitrate: '5000k' },
  { quality: 'medium', width: 1280, height: 720, bitrate: '2500k' },
  { quality: 'low', width: 640, height: 360, bitrate: '1000k' },
];

/**
 * Yoga/Pilates video renditions - Higher bitrate for instructor detail
 * Issue #87: Content-type specific transcoding profiles
 */
export const YOGA_VIDEO_RENDITIONS: VideoRenditionConfig[] = [
  { quality: 'high', width: 1920, height: 1080, bitrate: '6000k' },
  { quality: 'medium', width: 1280, height: 720, bitrate: '3000k' },
  { quality: 'low', width: 854, height: 480, bitrate: '1200k' },
];

/**
 * Meditation/Breathing video renditions - Standard bitrate (less movement)
 * Issue #87: Content-type specific transcoding profiles
 */
export const MEDITATION_VIDEO_RENDITIONS: VideoRenditionConfig[] = [
  { quality: 'high', width: 1920, height: 1080, bitrate: '4000k' },
  { quality: 'medium', width: 1280, height: 720, bitrate: '2000k' },
  { quality: 'low', width: 640, height: 360, bitrate: '800k' },
];

/**
 * Get appropriate video renditions based on content category
 * Issue #87: Content-type specific transcoding profiles
 *
 * @param category - Lesson category (yoga, meditation, pilates, respiration, auto-massage)
 * @returns VideoRenditionConfig array for the content type
 */
export function getRenditionsForContentType(category: string | null | undefined): VideoRenditionConfig[] {
  if (!category) {
    return VIDEO_RENDITIONS;
  }

  switch (category.toLowerCase()) {
    case 'yoga':
    case 'pilates':
      return YOGA_VIDEO_RENDITIONS;
    case 'meditation':
    case 'respiration':
    case 'breathing': // Legacy value
      return MEDITATION_VIDEO_RENDITIONS;
    default:
      return VIDEO_RENDITIONS;
  }
}

/**
 * Audio variant configurations
 */
export const AUDIO_VARIANTS: AudioVariantConfig[] = [
  { quality: 'high', bitrate: '320k' },
  { quality: 'medium', bitrate: '192k' },
  { quality: 'low', bitrate: '96k' },
];
