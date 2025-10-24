/**
 * FFmpeg Wrapper Utilities
 *
 * Provides helpers for video/audio transcoding using ffmpeg.
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import * as path from 'path';

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export interface MediaMetadata {
  duration: number; // in seconds
  codec: string;
  width?: number;
  height?: number;
  bitrate?: number;
  fileSize: number;
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
        console.error('❌ ffprobe error:', err);
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

      console.log('✅ Media metadata:', result);
      resolve(result);
    });
  });
}

/**
 * Transcode video to specific rendition
 */
export async function transcodeVideo(
  inputPath: string,
  outputPath: string,
  config: VideoRenditionConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎬 Transcoding video to ${config.quality} (${config.width}x${config.height} @ ${config.bitrate})...`);

    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('128k')
      .videoBitrate(config.bitrate)
      .size(`${config.width}x${config.height}`)
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-movflags +faststart', // Enable streaming
      ])
      .on('start', (commandLine: string) => {
        console.log('▶️  FFmpeg command:', commandLine);
      })
      .on('progress', (progress: any) => {
        if (progress.percent) {
          console.log(`⏳ Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`✅ Video transcoded: ${config.quality}`);
        resolve();
      })
      .on('error', (err: Error) => {
        console.error(`❌ Transcode error (${config.quality}):`, err.message);
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
    console.log(`🎵 Transcoding audio to ${config.quality} (${config.bitrate})...`);

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
        console.log('▶️  FFmpeg command:', commandLine);
      })
      .on('progress', (progress: any) => {
        if (progress.percent) {
          console.log(`⏳ Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`✅ Audio transcoded: ${config.quality}`);
        resolve();
      })
      .on('error', (err: Error) => {
        console.error(`❌ Transcode error (${config.quality}):`, err.message);
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
    console.log('📸 Generating thumbnail...');

    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timeOffset],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '1280x720',
      })
      .on('end', () => {
        console.log('✅ Thumbnail generated');
        resolve();
      })
      .on('error', (err: Error) => {
        console.error('❌ Thumbnail generation error:', err.message);
        reject(err);
      });
  });
}

/**
 * Video rendition configurations
 */
export const VIDEO_RENDITIONS: VideoRenditionConfig[] = [
  { quality: 'high', width: 1920, height: 1080, bitrate: '5000k' },
  { quality: 'medium', width: 1280, height: 720, bitrate: '2500k' },
  { quality: 'low', width: 640, height: 360, bitrate: '1000k' },
];

/**
 * Audio variant configurations
 */
export const AUDIO_VARIANTS: AudioVariantConfig[] = [
  { quality: 'high', bitrate: '320k' },
  { quality: 'medium', bitrate: '192k' },
  { quality: 'low', bitrate: '96k' },
];
