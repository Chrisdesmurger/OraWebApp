/**
 * Lesson TypeScript Types
 * Matches Firestore schema with snake_case field names
 *
 * IMPORTANT - i18n Support (Issue #68):
 * - Text fields support multilingual content (FR/EN/ES)
 * - Firestore uses snake_case with language suffix (title_fr, title_en, title_es)
 * - TypeScript uses MultilingualText objects ({ fr: string, en?: string, es?: string })
 * - French (fr) is the primary language and always required
 */

import type {
  MultilingualText,
  YogaChapter,
  YogaChapterFirestore,
  MassageBodyZone,
  MassageBodyZoneFirestore,
  MeditationPhase,
  MeditationPhaseFirestore,
  YogaPose,
  YogaPoseFirestore,
  YogaPoseSide,
  YogaTargetZone,
} from '@/lib/firestore/conversions';

import {
  yogaChapterFromFirestore,
  yogaChapterToFirestore,
  massageBodyZoneFromFirestore,
  massageBodyZoneToFirestore,
  meditationPhaseFromFirestore,
  meditationPhaseToFirestore,
  yogaPoseFromFirestore,
  yogaPoseToFirestore,
  YOGA_TARGET_ZONES,
} from '@/lib/firestore/conversions';

// Re-export for convenience
export type { MultilingualText, YogaChapter, MassageBodyZone, MeditationPhase, YogaPose, YogaPoseSide, YogaTargetZone };
export { YOGA_TARGET_ZONES };

export type LessonType = 'video' | 'audio';

export type LessonStatus = 'draft' | 'uploading' | 'processing' | 'ready' | 'failed';

export type LessonCategory = 'yoga' | 'meditation' | 'pilates' | 'respiration' | 'auto-massage';

/**
 * Lesson category labels for display (French)
 */
export const LESSON_CATEGORY_LABELS: Record<LessonCategory, string> = {
  'yoga': 'Yoga',
  'meditation': 'Méditation',
  'pilates': 'Pilates',
  'respiration': 'Respiration',
  'auto-massage': 'Auto-massage',
};

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

// ============================================================================
// Firestore Document Interface (snake_case with i18n)
// ============================================================================

/**
 * Firestore lesson document (snake_case)
 * Now with multilingual support for text fields
 */
export interface LessonDocument {
  // Multilingual fields (snake_case with language suffix)
  title_fr: string;
  title_en?: string;
  title_es?: string;
  description_fr?: string | null;
  description_en?: string | null;
  description_es?: string | null;
  category_fr?: string | null;
  category_en?: string | null;
  category_es?: string | null;
  transcript_fr?: string | null;
  transcript_en?: string | null;
  transcript_es?: string | null;

  // Legacy single-language fields (for backward compatibility)
  title?: string;  // Deprecated - use title_fr
  description?: string | null;  // Deprecated - use description_fr
  transcript?: string | null;  // Deprecated - use transcript_fr

  // Category (simple enum, not multilingual)
  category?: LessonCategory | null;

  // Subcategory (Issue #XX - Subcategory system)
  subcategory_id?: string | null;
  subcategory_slug?: string | null;

  // Non-multilingual fields
  type: LessonType;
  program_id: string;
  order: number;
  duration_sec: number | null;
  tags: string[];
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
  preview_image_url?: string | null;
  preview_storage_path?: string | null;
  mime_type?: string | null;

  // Scheduling fields (Issue #22)
  scheduled_publish_at: string | null;
  scheduled_archive_at: string | null;
  auto_publish_enabled: boolean;

  // Yoga-specific (snake_case)
  chapters?: YogaChapterFirestore[];

  // Massage-specific (snake_case)
  body_zones?: MassageBodyZoneFirestore[];

  // Meditation-specific (snake_case)
  phases?: MeditationPhaseFirestore[];
  ambient_sound_name_fr?: string | null;
  ambient_sound_name_en?: string | null;
  ambient_sound_name_es?: string | null;
  breathing_instruction_fr?: string | null;
  breathing_instruction_en?: string | null;
  breathing_instruction_es?: string | null;

  // Yoga poses (Issue #74) - snake_case
  yoga_poses?: YogaPoseFirestore[];

  // Aspect ratio metadata (Issue #88) - snake_case
  source_aspect_ratio?: string | null;  // e.g., "1920:1080"
  output_aspect_ratio?: string | null;  // e.g., "16:9"
  aspect_conversion_mode?: 'crop' | 'letterbox' | 'none' | null;
}

// ============================================================================
// Client-side Interface (camelCase with i18n)
// ============================================================================

/**
 * Client-side lesson model (camelCase for frontend)
 * Uses MultilingualText for text fields
 */
export interface Lesson {
  id: string;

  // Multilingual fields
  title: MultilingualText;
  description?: MultilingualText | null;
  transcript?: MultilingualText | null;

  // Category (simple enum)
  category?: LessonCategory | null;

  // Subcategory
  subcategoryId?: string | null;
  subcategorySlug?: string | null;

  // Non-multilingual fields
  type: LessonType;
  programId: string;
  order: number;
  durationSec: number | null;
  tags: string[];
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
  previewImageUrl?: string | null;
  previewStoragePath?: string | null;
  mimeType?: string | null;

  // Scheduling fields (Issue #22)
  scheduledPublishAt: string | null;
  scheduledArchiveAt: string | null;
  autoPublishEnabled: boolean;

  // Yoga-specific
  chapters?: YogaChapter[];

  // Massage-specific
  bodyZones?: MassageBodyZone[];

  // Meditation-specific
  phases?: MeditationPhase[];
  ambientSoundName?: MultilingualText | null;
  breathingInstruction?: MultilingualText | null;

  // Yoga poses (Issue #74) - for yoga/pilates lessons
  yogaPoses?: YogaPose[];

  // Aspect ratio metadata (Issue #88)
  sourceAspectRatio?: string | null;  // e.g., "1920:1080"
  outputAspectRatio?: string | null;  // e.g., "16:9"
  aspectConversionMode?: 'crop' | 'letterbox' | 'none' | null;
}

// ============================================================================
// Legacy Lesson Interface (for backward compatibility)
// ============================================================================

/**
 * Legacy lesson interface with string title/description
 * Used for backward compatibility with existing code
 */
export interface LessonLegacy {
  id: string;
  title: string;  // French only
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
  previewImageUrl?: string | null;
  previewStoragePath?: string | null;
  mimeType?: string | null;
  scheduledPublishAt: string | null;
  scheduledArchiveAt: string | null;
  autoPublishEnabled: boolean;
}

// ============================================================================
// API Request/Response Interfaces
// ============================================================================

/**
 * Lesson creation request (with i18n)
 */
export interface CreateLessonRequest {
  title: MultilingualText | string;  // Accept both for backward compat
  description?: MultilingualText | string;
  category: LessonCategory;  // Required
  type: LessonType;
  programId?: string;  // Optional
  order?: number;
  tags?: string[];
  transcript?: MultilingualText | string;
  scheduledPublishAt?: string | null;
  scheduledArchiveAt?: string | null;
  autoPublishEnabled?: boolean;

  // Yoga-specific
  chapters?: YogaChapter[];

  // Massage-specific
  bodyZones?: MassageBodyZone[];

  // Meditation-specific
  phases?: MeditationPhase[];
  ambientSoundName?: MultilingualText;
  breathingInstruction?: MultilingualText;

  // Yoga poses (Issue #74)
  yogaPoses?: YogaPose[];

  // Subcategory
  subcategoryId?: string | null;
}

/**
 * Lesson update request (with i18n)
 */
export interface UpdateLessonRequest {
  title?: MultilingualText | string;
  description?: MultilingualText | string;
  order?: number;
  tags?: string[];
  transcript?: MultilingualText | string;
  scheduledPublishAt?: string | null;
  scheduledArchiveAt?: string | null;
  autoPublishEnabled?: boolean;

  // Yoga-specific
  chapters?: YogaChapter[];

  // Massage-specific
  bodyZones?: MassageBodyZone[];

  // Meditation-specific
  phases?: MeditationPhase[];
  ambientSoundName?: MultilingualText;
  breathingInstruction?: MultilingualText;

  // Yoga poses (Issue #74)
  yogaPoses?: YogaPose[];

  // Subcategory
  subcategoryId?: string | null;
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
 * Validation result for lesson data
 */
export interface LessonValidationResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
  i18nCoverage?: {
    title: { fr: boolean; en: boolean; es: boolean };
    description: { fr: boolean; en: boolean; es: boolean };
  };
}

// ============================================================================
// Validation & Mapping Functions
// ============================================================================

/**
 * Validate lesson data from Firestore
 * Returns validation result with details about missing or invalid fields
 */
export function validateLessonDocument(id: string, doc: Partial<LessonDocument>): LessonValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Check required fields - now supports both legacy and i18n
  const hasTitle = doc.title_fr || doc.title;
  if (!hasTitle) {
    missingFields.push('title (title_fr or title)');
  }

  if (!doc.type) {
    missingFields.push('type');
  }

  // program_id is now optional (can be empty string)
  // No validation needed for program_id

  if (!doc.status) {
    missingFields.push('status');
  }

  if (!doc.author_id) {
    missingFields.push('author_id');
  }

  if (!doc.created_at) {
    missingFields.push('created_at');
  }

  if (!doc.updated_at) {
    missingFields.push('updated_at');
  }

  // Check tags is an array
  if (doc.tags !== undefined && !Array.isArray(doc.tags)) {
    warnings.push(`tags is not an array (got ${typeof doc.tags})`);
  }

  // Check type is valid
  if (doc.type && !['video', 'audio'].includes(doc.type)) {
    warnings.push(`invalid type: ${doc.type}`);
  }

  // Check status is valid
  if (doc.status && !['draft', 'uploading', 'processing', 'ready', 'failed'].includes(doc.status)) {
    warnings.push(`invalid status: ${doc.status}`);
  }

  // i18n coverage
  const i18nCoverage = {
    title: {
      fr: !!(doc.title_fr || doc.title),
      en: !!doc.title_en,
      es: !!doc.title_es,
    },
    description: {
      fr: !!(doc.description_fr || doc.description),
      en: !!doc.description_en,
      es: !!doc.description_es,
    },
  };

  // Warn if legacy fields are used without i18n
  if (doc.title && !doc.title_fr) {
    warnings.push('Using legacy title field - consider migrating to title_fr/en/es');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
    i18nCoverage,
  };
}

/**
 * Map Firestore document to client model (with i18n support)
 * Returns null if required fields are missing (with console warning)
 */
export function mapLessonFromFirestore(id: string, doc: LessonDocument): Lesson | null {
  // Validate the document
  const validation = validateLessonDocument(id, doc);

  if (!validation.isValid) {
    console.warn(`[mapLessonFromFirestore] Lesson ${id} missing required fields:`, validation.missingFields);
    return null;
  }

  if (validation.warnings.length > 0) {
    console.warn(`[mapLessonFromFirestore] Lesson ${id} has warnings:`, validation.warnings);
  }

  // Build multilingual title
  const title: MultilingualText = {
    fr: doc.title_fr || doc.title || '',
    en: doc.title_en,
    es: doc.title_es,
  };

  // Build multilingual description
  const description: MultilingualText | null = doc.description_fr || doc.description_en || doc.description_es || doc.description
    ? {
        fr: doc.description_fr ?? doc.description ?? '',
        en: doc.description_en ?? undefined,
        es: doc.description_es ?? undefined,
      }
    : null;

  // Get category (simple enum) with normalization for legacy values
  // Some lessons may have old category values that need to be mapped
  const normalizeCategory = (cat: string | null | undefined): LessonCategory | null => {
    if (!cat) return null;
    const categoryMap: Record<string, LessonCategory> = {
      'yoga': 'yoga',
      'pilates': 'pilates',
      'meditation': 'meditation',
      'respiration': 'respiration',
      'breathing': 'respiration',  // Legacy value
      'auto-massage': 'auto-massage',
      'self_massage': 'auto-massage',  // Legacy value
      'self-massage': 'auto-massage',  // Alternative legacy value
    };
    return categoryMap[cat.toLowerCase()] || (cat as LessonCategory);
  };
  const category = normalizeCategory(doc.category);

  // Build multilingual transcript
  const transcript: MultilingualText | null = doc.transcript_fr || doc.transcript_en || doc.transcript_es || doc.transcript
    ? {
        fr: doc.transcript_fr ?? doc.transcript ?? '',
        en: doc.transcript_en ?? undefined,
        es: doc.transcript_es ?? undefined,
      }
    : null;

  // Build multilingual ambient sound name (meditation)
  const ambientSoundName: MultilingualText | null = doc.ambient_sound_name_fr || doc.ambient_sound_name_en || doc.ambient_sound_name_es
    ? {
        fr: doc.ambient_sound_name_fr ?? '',
        en: doc.ambient_sound_name_en ?? undefined,
        es: doc.ambient_sound_name_es ?? undefined,
      }
    : null;

  // Build multilingual breathing instruction (meditation)
  const breathingInstruction: MultilingualText | null = doc.breathing_instruction_fr || doc.breathing_instruction_en || doc.breathing_instruction_es
    ? {
        fr: doc.breathing_instruction_fr ?? '',
        en: doc.breathing_instruction_en ?? undefined,
        es: doc.breathing_instruction_es ?? undefined,
      }
    : null;

  return {
    id,
    title,
    description,
    category,
    transcript,
    type: doc.type,
    programId: doc.program_id,
    order: doc.order ?? 0,
    durationSec: doc.duration_sec ?? null,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    status: doc.status,
    storagePathOriginal: doc.storage_path_original ?? null,
    renditions: doc.renditions,
    audioVariants: doc.audio_variants,
    codec: doc.codec ?? null,
    sizeBytes: doc.size_bytes ?? null,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    authorId: doc.author_id,
    thumbnailUrl: doc.thumbnail_url ?? null,
    previewImageUrl: doc.preview_image_url ?? null,
    previewStoragePath: doc.preview_storage_path ?? null,
    mimeType: doc.mime_type ?? null,
    scheduledPublishAt: doc.scheduled_publish_at ?? null,
    scheduledArchiveAt: doc.scheduled_archive_at ?? null,
    autoPublishEnabled: doc.auto_publish_enabled ?? false,
    // Specialized content
    chapters: doc.chapters?.map(yogaChapterFromFirestore),
    bodyZones: doc.body_zones?.map(massageBodyZoneFromFirestore),
    phases: doc.phases?.map(meditationPhaseFromFirestore),
    ambientSoundName,
    breathingInstruction,
    // Yoga poses (Issue #74)
    yogaPoses: doc.yoga_poses?.map(yogaPoseFromFirestore),
    // Subcategory
    subcategoryId: doc.subcategory_id ?? null,
    subcategorySlug: doc.subcategory_slug ?? null,
    // Aspect ratio metadata (Issue #88)
    sourceAspectRatio: doc.source_aspect_ratio ?? null,
    outputAspectRatio: doc.output_aspect_ratio ?? null,
    aspectConversionMode: doc.aspect_conversion_mode ?? null,
  };
}

/**
 * Map Firestore document to legacy client model (string fields, French only)
 * For backward compatibility with existing code
 */
export function mapLessonFromFirestoreLegacy(id: string, doc: LessonDocument): LessonLegacy | null {
  const validation = validateLessonDocument(id, doc);

  if (!validation.isValid) {
    console.warn(`[mapLessonFromFirestoreLegacy] Lesson ${id} missing required fields:`, validation.missingFields);
    return null;
  }

  return {
    id,
    title: doc.title_fr || doc.title || '',
    description: doc.description_fr ?? doc.description ?? null,
    type: doc.type,
    programId: doc.program_id,
    order: doc.order ?? 0,
    durationSec: doc.duration_sec ?? null,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    transcript: doc.transcript_fr ?? doc.transcript ?? null,
    status: doc.status,
    storagePathOriginal: doc.storage_path_original ?? null,
    renditions: doc.renditions,
    audioVariants: doc.audio_variants,
    codec: doc.codec ?? null,
    sizeBytes: doc.size_bytes ?? null,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    authorId: doc.author_id,
    thumbnailUrl: doc.thumbnail_url ?? null,
    previewImageUrl: doc.preview_image_url ?? null,
    previewStoragePath: doc.preview_storage_path ?? null,
    mimeType: doc.mime_type ?? null,
    scheduledPublishAt: doc.scheduled_publish_at ?? null,
    scheduledArchiveAt: doc.scheduled_archive_at ?? null,
    autoPublishEnabled: doc.auto_publish_enabled ?? false,
  };
}

/**
 * Map client model to Firestore document (with i18n support)
 */
export function mapLessonToFirestore(lesson: Partial<Lesson>): Partial<LessonDocument> {
  const doc: Partial<LessonDocument> = {};

  // Map multilingual title
  if (lesson.title !== undefined) {
    if (typeof lesson.title === 'string') {
      doc.title_fr = lesson.title;
    } else {
      doc.title_fr = lesson.title.fr;
      if (lesson.title.en) doc.title_en = lesson.title.en;
      if (lesson.title.es) doc.title_es = lesson.title.es;
    }
  }

  // Map multilingual description
  if (lesson.description !== undefined) {
    if (lesson.description === null) {
      doc.description_fr = null;
      doc.description_en = null;
      doc.description_es = null;
    } else if (typeof lesson.description === 'string') {
      doc.description_fr = lesson.description;
    } else {
      doc.description_fr = lesson.description.fr || null;
      doc.description_en = lesson.description.en || null;
      doc.description_es = lesson.description.es || null;
    }
  }

  // Map category (simple enum)
  if (lesson.category !== undefined) {
    doc.category = lesson.category;
  }

  // Map multilingual transcript
  if (lesson.transcript !== undefined) {
    if (lesson.transcript === null) {
      doc.transcript_fr = null;
      doc.transcript_en = null;
      doc.transcript_es = null;
    } else if (typeof lesson.transcript === 'string') {
      doc.transcript_fr = lesson.transcript;
    } else {
      doc.transcript_fr = lesson.transcript.fr || null;
      doc.transcript_en = lesson.transcript.en || null;
      doc.transcript_es = lesson.transcript.es || null;
    }
  }

  // Map non-multilingual fields
  if (lesson.type !== undefined) doc.type = lesson.type;
  if (lesson.programId !== undefined) doc.program_id = lesson.programId;
  if (lesson.order !== undefined) doc.order = lesson.order;
  if (lesson.durationSec !== undefined) doc.duration_sec = lesson.durationSec;
  if (lesson.tags !== undefined) doc.tags = lesson.tags;
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

  // Map meditation-specific multilingual fields
  if (lesson.ambientSoundName !== undefined) {
    if (lesson.ambientSoundName === null) {
      doc.ambient_sound_name_fr = null;
      doc.ambient_sound_name_en = null;
      doc.ambient_sound_name_es = null;
    } else {
      doc.ambient_sound_name_fr = lesson.ambientSoundName.fr || null;
      doc.ambient_sound_name_en = lesson.ambientSoundName.en || null;
      doc.ambient_sound_name_es = lesson.ambientSoundName.es || null;
    }
  }

  if (lesson.breathingInstruction !== undefined) {
    if (lesson.breathingInstruction === null) {
      doc.breathing_instruction_fr = null;
      doc.breathing_instruction_en = null;
      doc.breathing_instruction_es = null;
    } else {
      doc.breathing_instruction_fr = lesson.breathingInstruction.fr || null;
      doc.breathing_instruction_en = lesson.breathingInstruction.en || null;
      doc.breathing_instruction_es = lesson.breathingInstruction.es || null;
    }
  }

  // Map specialized content arrays
  if (lesson.chapters !== undefined) {
    doc.chapters = lesson.chapters?.map(yogaChapterToFirestore);
  }
  if (lesson.bodyZones !== undefined) {
    doc.body_zones = lesson.bodyZones?.map(massageBodyZoneToFirestore);
  }
  if (lesson.phases !== undefined) {
    doc.phases = lesson.phases?.map(meditationPhaseToFirestore);
  }

  // Map yoga poses (Issue #74)
  if (lesson.yogaPoses !== undefined) {
    doc.yoga_poses = lesson.yogaPoses?.map(yogaPoseToFirestore);
  }

  // Map subcategory
  if (lesson.subcategoryId !== undefined) {
    doc.subcategory_id = lesson.subcategoryId;
  }
  if (lesson.subcategorySlug !== undefined) {
    doc.subcategory_slug = lesson.subcategorySlug;
  }

  // Map aspect ratio metadata (Issue #88)
  if (lesson.sourceAspectRatio !== undefined) {
    doc.source_aspect_ratio = lesson.sourceAspectRatio;
  }
  if (lesson.outputAspectRatio !== undefined) {
    doc.output_aspect_ratio = lesson.outputAspectRatio;
  }
  if (lesson.aspectConversionMode !== undefined) {
    doc.aspect_conversion_mode = lesson.aspectConversionMode;
  }

  return doc;
}

/**
 * Get French text from a multilingual field (for display)
 */
export function getFrenchText(text: MultilingualText | string | null | undefined): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text.fr || '';
}

/**
 * Get localized text with fallback to French
 */
export function getLocalizedText(
  text: MultilingualText | string | null | undefined,
  lang: 'fr' | 'en' | 'es' = 'fr'
): string {
  if (!text) return '';
  if (typeof text === 'string') return text;

  // Try requested language, fallback to French
  return text[lang] || text.fr || '';
}
