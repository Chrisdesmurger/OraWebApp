/**
 * Transcode On Finalize Function
 *
 * Triggers when a file is uploaded to media/lessons/{lessonId}/original/**
 * Transcodes video/audio to multiple quality levels and updates Firestore.
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import {
  probeMedia,
  transcodeVideo,
  transcodeAudio,
  generateThumbnail,
  VIDEO_RENDITIONS,
  AUDIO_VARIANTS,
} from './utils/ffmpeg-wrapper';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const storage = admin.storage();

/**
 * Main transcoding function
 * Triggers on Storage finalize event for lesson original files
 */
export const transcodeOnFinalize = functions.storage.onObjectFinalized(
  {
    region: 'us-central1',
    memory: '2GiB',
    timeoutSeconds: 540, // 9 minutes
    cpu: 2,
  },
  async (event) => {
    const filePath = event.data.name;
    console.log('🎬 Storage finalize event:', filePath);

    // Only process files in media/lessons/{lessonId}/original/**
    if (!filePath.startsWith('media/lessons/') || !filePath.includes('/original/')) {
      console.log('⏭️  Skipping - not a lesson original file');
      return;
    }

    // Extract lesson ID from path: media/lessons/{lessonId}/original/{filename}
    const pathParts = filePath.split('/');
    if (pathParts.length < 4) {
      console.error('❌ Invalid file path structure:', filePath);
      return;
    }

    const lessonId = pathParts[2];
    console.log('📝 Processing lesson:', lessonId);

    try {
      // Get lesson document
      const lessonRef = firestore.collection('lessons').doc(lessonId);
      const lessonDoc = await lessonRef.get();

      if (!lessonDoc.exists) {
        console.error('❌ Lesson not found:', lessonId);
        return;
      }

      const lessonData = lessonDoc.data();
      if (!lessonData) {
        console.error('❌ Lesson data is empty:', lessonId);
        return;
      }

      const lessonType = lessonData.type as 'video' | 'audio';
      console.log('📹 Lesson type:', lessonType);

      // Update status to 'processing'
      await lessonRef.update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      });
      console.log('✅ Status updated to processing');

      // Download original file to temp directory
      const bucket = storage.bucket(event.data.bucket);
      const tempDir = path.join(os.tmpdir(), `transcode-${lessonId}`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempInputPath = path.join(tempDir, 'original' + path.extname(filePath));
      console.log('⬇️  Downloading original file to:', tempInputPath);

      await bucket.file(filePath).download({ destination: tempInputPath });
      console.log('✅ Download complete');

      // Probe metadata
      const metadata = await probeMedia(tempInputPath);
      console.log('📊 Metadata:', metadata);

      // Transcode based on type
      const renditions: any = {};
      const audioVariants: any = {};

      if (lessonType === 'video') {
        // Generate thumbnail
        const thumbnailPath = path.join(tempDir, 'thumb.jpg');
        try {
          await generateThumbnail(tempInputPath, thumbnailPath);
          const thumbnailStoragePath = `media/lessons/${lessonId}/thumb.jpg`;
          await bucket.upload(thumbnailPath, {
            destination: thumbnailStoragePath,
            metadata: { contentType: 'image/jpeg' },
          });
          console.log('✅ Thumbnail uploaded');
        } catch (thumbError) {
          console.warn('⚠️  Thumbnail generation failed (non-critical):', thumbError);
        }

        // Transcode video renditions
        for (const config of VIDEO_RENDITIONS) {
          const outputPath = path.join(tempDir, `${config.quality}.mp4`);
          const storagePath = `media/lessons/${lessonId}/video/${config.quality}.mp4`;

          try {
            await transcodeVideo(tempInputPath, outputPath, config);

            // Upload to Storage
            await bucket.upload(outputPath, {
              destination: storagePath,
              metadata: { contentType: 'video/mp4' },
            });

            renditions[config.quality] = {
              path: storagePath,
              width: config.width,
              height: config.height,
              bitrate_kbps: parseInt(config.bitrate.replace('k', ''), 10),
            };

            console.log(`✅ Uploaded ${config.quality} rendition`);
          } catch (error) {
            console.error(`❌ Failed to transcode ${config.quality}:`, error);
            throw error;
          }
        }
      } else if (lessonType === 'audio') {
        // Transcode audio variants
        for (const config of AUDIO_VARIANTS) {
          const outputPath = path.join(tempDir, `${config.quality}.m4a`);
          const storagePath = `media/lessons/${lessonId}/audio/${config.quality}.m4a`;

          try {
            await transcodeAudio(tempInputPath, outputPath, config);

            // Upload to Storage
            await bucket.upload(outputPath, {
              destination: storagePath,
              metadata: { contentType: 'audio/mp4' },
            });

            audioVariants[config.quality] = {
              path: storagePath,
              bitrate_kbps: parseInt(config.bitrate.replace('k', ''), 10),
            };

            console.log(`✅ Uploaded ${config.quality} variant`);
          } catch (error) {
            console.error(`❌ Failed to transcode ${config.quality}:`, error);
            throw error;
          }
        }
      }

      // Update Firestore with results
      const updateData: any = {
        status: 'ready',
        duration_sec: Math.round(metadata.duration),
        codec: metadata.codec,
        size_bytes: metadata.fileSize,
        updated_at: new Date().toISOString(),
      };

      if (lessonType === 'video') {
        updateData.renditions = renditions;
        updateData.thumbnail_url = `media/lessons/${lessonId}/thumb.jpg`;
      } else {
        updateData.audio_variants = audioVariants;
      }

      await lessonRef.update(updateData);
      console.log('✅ Lesson updated with transcoding results');

      // Cleanup temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🗑️  Temp files cleaned up');

      console.log('🎉 Transcoding complete!');
    } catch (error: any) {
      console.error('❌ Transcoding failed:', error);

      // Update lesson status to 'failed'
      try {
        await firestore.collection('lessons').doc(lessonId).update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        });

        // Log error to audit_logs collection
        await firestore.collection('audit_logs').add({
          type: 'transcode_error',
          lesson_id: lessonId,
          error_message: error.message,
          error_stack: error.stack,
          file_path: filePath,
          created_at: new Date().toISOString(),
        });

        console.log('✅ Error logged to audit_logs');
      } catch (updateError) {
        console.error('❌ Failed to update error status:', updateError);
      }

      throw error;
    }
  }
);
