/**
 * Lesson TypeScript Types
 * Matches Firestore schema with snake_case field names
 */

export type LessonType = 'video' | 'audio';

export type LessonStatus = 'draft' | 'uploading' | 'processing' | 'ready' | 'failed';

export interface Rendition {
  path: string;
  width?: number;
  height?: number;
  bitrate_kbps?: number;
}

export interface AudioVariant {
  path: string;
  bitrate_kbps: number;
}

export interface Renditions {
  high?: Rendition;
  medium?: Rendition;
  low?: Rendition;
}

export interface AudioVariants {
  high?: AudioVariant;
  medium?: AudioVariant;
  low?: AudioVariant;
}

/**
 * Firestore lesson document (snake_case)
 */
export interface LessonDocument {
  title: string;
  description: string | null;
  type: LessonType;
  program_id: string;
  order: number;
  duration_sec: number | null;
  tags: string[];
  transcript: string | null;
  status: LessonStatus;
  storage_path_original: string | null;
  renditions?: Renditions;
  audio_variants?: AudioVariants;
  codec: string | null;
  size_bytes: number | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  author_id: string;
  thumbnail_url?: string | null;
  preview_image_url?: string | null;  // High-quality image for featured content
  preview_storage_path?: string | null;  // Firebase Storage path for preview image
  mime_type?: string | null;

  // Scheduling fields (Issue #22)
  scheduled_publish_at: string | null;  // ISO timestamp
  scheduled_archive_at: string | null;  // ISO timestamp
  auto_publish_enabled: boolean;
}

/**
 * Client-side lesson model (camelCase for frontend)
 */
export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  type: LessonType;
  programId: string;
  order: number;
  durationSec: number | null;
  tags: string[];
  transcript: string | null;
  status: LessonStatus;
  storagePathOriginal: string | null;
  renditions?: Renditions;
  audioVariants?: AudioVariants;
  codec: string | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  thumbnailUrl?: string | null;
  previewImageUrl?: string | null;  // High-quality image for featured content
  previewStoragePath?: string | null;  // Firebase Storage path for preview image
  mimeType?: string | null;

  // Scheduling fields (Issue #22)
  scheduledPublishAt: string | null;  // ISO timestamp
  scheduledArchiveAt: string | null;  // ISO timestamp
  autoPublishEnabled: boolean;
}

/**
 * Lesson creation request
 */
export interface CreateLessonRequest {
  title: string;
  description?: string;
  type: LessonType;
  programId: string;
  order?: number;
  tags?: string[];
  transcript?: string;
  scheduledPublishAt?: string | null;  // ISO timestamp
  scheduledArchiveAt?: string | null;  // ISO timestamp
  autoPublishEnabled?: boolean;
}

/**
 * Lesson update request
 */
export interface UpdateLessonRequest {
  title?: string;
  description?: string;
  order?: number;
  tags?: string[];
  transcript?: string;
  scheduledPublishAt?: string | null;  // ISO timestamp
  scheduledArchiveAt?: string | null;  // ISO timestamp
  autoPublishEnabled?: boolean;
}

/**
 * Upload initialization response
 */
export interface UploadInitResponse {
  uploadUrl: string;
  lessonId: string;
  storagePath: string;
}

/**
 * Map Firestore document to client model
 */
export function mapLessonFromFirestore(id: string, doc: LessonDocument): Lesson {
  return {
    id,
    title: doc.title,
    description: doc.description,
    type: doc.type,
    programId: doc.program_id,
    order: doc.order,
    durationSec: doc.duration_sec,
    tags: doc.tags,
    transcript: doc.transcript,
    status: doc.status,
    storagePathOriginal: doc.storage_path_original,
    renditions: doc.renditions,
    audioVariants: doc.audio_variants,
    codec: doc.codec,
    sizeBytes: doc.size_bytes,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    authorId: doc.author_id,
    thumbnailUrl: doc.thumbnail_url,
    previewImageUrl: doc.preview_image_url,
    previewStoragePath: doc.preview_storage_path,
    mimeType: doc.mime_type,
    scheduledPublishAt: doc.scheduled_publish_at || null,
    scheduledArchiveAt: doc.scheduled_archive_at || null,
    autoPublishEnabled: doc.auto_publish_enabled || false,
  };
}

/**
 * Map client model to Firestore document
 */
export function mapLessonToFirestore(lesson: Partial<Lesson>): Partial<LessonDocument> {
  const doc: Partial<LessonDocument> = {};

  if (lesson.title !== undefined) doc.title = lesson.title;
  if (lesson.description !== undefined) doc.description = lesson.description;
  if (lesson.type !== undefined) doc.type = lesson.type;
  if (lesson.programId !== undefined) doc.program_id = lesson.programId;
  if (lesson.order !== undefined) doc.order = lesson.order;
  if (lesson.durationSec !== undefined) doc.duration_sec = lesson.durationSec;
  if (lesson.tags !== undefined) doc.tags = lesson.tags;
  if (lesson.transcript !== undefined) doc.transcript = lesson.transcript;
  if (lesson.status !== undefined) doc.status = lesson.status;
  if (lesson.storagePathOriginal !== undefined) doc.storage_path_original = lesson.storagePathOriginal;
  if (lesson.renditions !== undefined) doc.renditions = lesson.renditions;
  if (lesson.audioVariants !== undefined) doc.audio_variants = lesson.audioVariants;
  if (lesson.codec !== undefined) doc.codec = lesson.codec;
  if (lesson.sizeBytes !== undefined) doc.size_bytes = lesson.sizeBytes;
  if (lesson.createdAt !== undefined) doc.created_at = lesson.createdAt;
  if (lesson.updatedAt !== undefined) doc.updated_at = lesson.updatedAt;
  if (lesson.authorId !== undefined) doc.author_id = lesson.authorId;
  if (lesson.thumbnailUrl !== undefined) doc.thumbnail_url = lesson.thumbnailUrl;
  if (lesson.previewImageUrl !== undefined) doc.preview_image_url = lesson.previewImageUrl;
  if (lesson.previewStoragePath !== undefined) doc.preview_storage_path = lesson.previewStoragePath;
  if (lesson.mimeType !== undefined) doc.mime_type = lesson.mimeType;
  if (lesson.scheduledPublishAt !== undefined) doc.scheduled_publish_at = lesson.scheduledPublishAt;
  if (lesson.scheduledArchiveAt !== undefined) doc.scheduled_archive_at = lesson.scheduledArchiveAt;
  if (lesson.autoPublishEnabled !== undefined) doc.auto_publish_enabled = lesson.autoPublishEnabled;

  return doc;
}
