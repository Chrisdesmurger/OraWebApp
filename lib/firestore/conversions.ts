/**
 * Firestore Data Conversion Utilities for i18n
 *
 * Handles conversion between:
 * - TypeScript (camelCase): titleFr, titleEn, titleEs
 * - Firestore (snake_case): title_fr, title_en, title_es
 *
 * IMPORTANT: Firestore is the source of truth and uses snake_case.
 * The Android app also expects snake_case from Firestore.
 * The Admin Portal (Next.js) uses camelCase internally.
 */

// ============================================================================
// Supported Languages
// ============================================================================

export type SupportedLanguage = 'fr' | 'en' | 'es';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'en', 'es'];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  fr: 'French',
  en: 'English',
  es: 'Spanish',
};

export const PRIMARY_LANGUAGE: SupportedLanguage = 'fr';

// ============================================================================
// Multilingual Field Types
// ============================================================================

/**
 * Multilingual text field (camelCase for TypeScript)
 * French is required, English and Spanish are optional
 */
export interface MultilingualText {
  fr: string;       // Required - French is primary language
  en?: string;      // Optional - English translation
  es?: string;      // Optional - Spanish translation
}

/**
 * Multilingual text field (snake_case for Firestore)
 */
export interface MultilingualTextFirestore {
  fr: string;
  en?: string;
  es?: string;
}

/**
 * Optional multilingual text field
 */
export interface MultilingualTextOptional {
  fr?: string;
  en?: string;
  es?: string;
}

// ============================================================================
// Generic Conversion Helpers
// ============================================================================

/**
 * Convert a snake_case field name to camelCase
 * @example snakeToCamel('title_fr') => 'titleFr'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a camelCase field name to snake_case
 * @example camelToSnake('titleFr') => 'title_fr'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Deep convert object keys from snake_case to camelCase
 */
export function deepSnakeToCamel<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => deepSnakeToCamel(item)) as unknown as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = deepSnakeToCamel(value);
    }
    return result as T;
  }

  return obj as T;
}

/**
 * Deep convert object keys from camelCase to snake_case
 */
export function deepCamelToSnake<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => deepCamelToSnake(item)) as unknown as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[camelToSnake(key)] = deepCamelToSnake(value);
    }
    return result as T;
  }

  return obj as T;
}

// ============================================================================
// Multilingual Field Expansion/Collapse
// ============================================================================

/**
 * Expand a base field into multilingual fields for Firestore
 * @example expandToMultilingual('title', { fr: 'Bonjour', en: 'Hello' })
 *          => { title_fr: 'Bonjour', title_en: 'Hello' }
 */
export function expandToMultilingual(
  baseFieldName: string,
  value: MultilingualText | MultilingualTextOptional | undefined
): Record<string, string | undefined> {
  if (!value) return {};

  const result: Record<string, string | undefined> = {};

  for (const lang of SUPPORTED_LANGUAGES) {
    const fieldName = `${baseFieldName}_${lang}`;
    result[fieldName] = value[lang];
  }

  return result;
}

/**
 * Collapse multilingual Firestore fields into a MultilingualText object
 * @example collapseFromMultilingual({ title_fr: 'Bonjour', title_en: 'Hello' }, 'title')
 *          => { fr: 'Bonjour', en: 'Hello' }
 */
export function collapseFromMultilingual(
  doc: Record<string, unknown>,
  baseFieldName: string
): MultilingualText | undefined {
  const result: MultilingualTextOptional = {};
  let hasValue = false;

  for (const lang of SUPPORTED_LANGUAGES) {
    const fieldName = `${baseFieldName}_${lang}`;
    const value = doc[fieldName];
    if (typeof value === 'string') {
      result[lang] = value;
      hasValue = true;
    }
  }

  if (!hasValue) return undefined;

  // Ensure fr is present (required)
  if (!result.fr) {
    result.fr = '';
  }

  return result as MultilingualText;
}

// ============================================================================
// Lesson-Specific Conversions (Yoga/Massage/Meditation)
// ============================================================================

/**
 * Yoga chapter instruction (TypeScript)
 */
export interface YogaInstruction {
  text: MultilingualText;
  durationSec: number;
  side?: 'left' | 'right' | 'none';
}

/**
 * Yoga chapter instruction (Firestore snake_case)
 */
export interface YogaInstructionFirestore {
  text_fr: string;
  text_en?: string;
  text_es?: string;
  duration_sec: number;
  side?: 'left' | 'right' | 'none';
}

/**
 * Yoga chapter (TypeScript)
 */
export interface YogaChapter {
  id: string;
  name: MultilingualText;
  order: number;
  startTimeSec: number;
  endTimeSec: number;
  instructions: YogaInstruction[];
}

/**
 * Yoga chapter (Firestore snake_case)
 */
export interface YogaChapterFirestore {
  id: string;
  name_fr: string;
  name_en?: string;
  name_es?: string;
  order: number;
  start_time_sec: number;
  end_time_sec: number;
  instructions: YogaInstructionFirestore[];
}

/**
 * Massage body zone (TypeScript)
 */
export interface MassageBodyZone {
  id: string;
  name: MultilingualText;
  order: number;
  startTimeSec: number;
  endTimeSec: number;
  instructions: MassageInstruction[];
}

/**
 * Massage instruction (TypeScript)
 */
export interface MassageInstruction {
  text: MultilingualText;
  durationSec: number;
  pressureLevel?: MultilingualText;
}

/**
 * Massage body zone (Firestore snake_case)
 */
export interface MassageBodyZoneFirestore {
  id: string;
  name_fr: string;
  name_en?: string;
  name_es?: string;
  order: number;
  start_time_sec: number;
  end_time_sec: number;
  instructions: MassageInstructionFirestore[];
}

/**
 * Massage instruction (Firestore snake_case)
 */
export interface MassageInstructionFirestore {
  text_fr: string;
  text_en?: string;
  text_es?: string;
  duration_sec: number;
  pressure_level_fr?: string;
  pressure_level_en?: string;
  pressure_level_es?: string;
}

/**
 * Meditation phase (TypeScript)
 */
export interface MeditationPhase {
  id: string;
  name: MultilingualText;
  order: number;
  startTimeSec: number;
  endTimeSec: number;
  breathingInstruction?: MultilingualText;
  ambientSoundName?: MultilingualText;
}

/**
 * Meditation phase (Firestore snake_case)
 */
export interface MeditationPhaseFirestore {
  id: string;
  name_fr: string;
  name_en?: string;
  name_es?: string;
  order: number;
  start_time_sec: number;
  end_time_sec: number;
  breathing_instruction_fr?: string;
  breathing_instruction_en?: string;
  breathing_instruction_es?: string;
  ambient_sound_name_fr?: string;
  ambient_sound_name_en?: string;
  ambient_sound_name_es?: string;
}

// ============================================================================
// Yoga Conversion Functions
// ============================================================================

/**
 * Convert YogaInstruction from TypeScript to Firestore format
 */
export function yogaInstructionToFirestore(instruction: YogaInstruction): YogaInstructionFirestore {
  return {
    text_fr: instruction.text.fr,
    text_en: instruction.text.en,
    text_es: instruction.text.es,
    duration_sec: instruction.durationSec,
    side: instruction.side,
  };
}

/**
 * Convert YogaInstruction from Firestore to TypeScript format
 */
export function yogaInstructionFromFirestore(doc: YogaInstructionFirestore): YogaInstruction {
  return {
    text: {
      fr: doc.text_fr,
      en: doc.text_en,
      es: doc.text_es,
    },
    durationSec: doc.duration_sec,
    side: doc.side,
  };
}

/**
 * Convert YogaChapter from TypeScript to Firestore format
 */
export function yogaChapterToFirestore(chapter: YogaChapter): YogaChapterFirestore {
  return {
    id: chapter.id,
    name_fr: chapter.name.fr,
    name_en: chapter.name.en,
    name_es: chapter.name.es,
    order: chapter.order,
    start_time_sec: chapter.startTimeSec,
    end_time_sec: chapter.endTimeSec,
    instructions: chapter.instructions.map(yogaInstructionToFirestore),
  };
}

/**
 * Convert YogaChapter from Firestore to TypeScript format
 */
export function yogaChapterFromFirestore(doc: YogaChapterFirestore): YogaChapter {
  return {
    id: doc.id,
    name: {
      fr: doc.name_fr,
      en: doc.name_en,
      es: doc.name_es,
    },
    order: doc.order,
    startTimeSec: doc.start_time_sec,
    endTimeSec: doc.end_time_sec,
    instructions: doc.instructions?.map(yogaInstructionFromFirestore) || [],
  };
}

// ============================================================================
// Massage Conversion Functions
// ============================================================================

/**
 * Convert MassageInstruction from TypeScript to Firestore format
 */
export function massageInstructionToFirestore(instruction: MassageInstruction): MassageInstructionFirestore {
  return {
    text_fr: instruction.text.fr,
    text_en: instruction.text.en,
    text_es: instruction.text.es,
    duration_sec: instruction.durationSec,
    pressure_level_fr: instruction.pressureLevel?.fr,
    pressure_level_en: instruction.pressureLevel?.en,
    pressure_level_es: instruction.pressureLevel?.es,
  };
}

/**
 * Convert MassageInstruction from Firestore to TypeScript format
 */
export function massageInstructionFromFirestore(doc: MassageInstructionFirestore): MassageInstruction {
  const pressureLevel = doc.pressure_level_fr
    ? { fr: doc.pressure_level_fr, en: doc.pressure_level_en, es: doc.pressure_level_es }
    : undefined;

  return {
    text: {
      fr: doc.text_fr,
      en: doc.text_en,
      es: doc.text_es,
    },
    durationSec: doc.duration_sec,
    pressureLevel,
  };
}

/**
 * Convert MassageBodyZone from TypeScript to Firestore format
 */
export function massageBodyZoneToFirestore(zone: MassageBodyZone): MassageBodyZoneFirestore {
  return {
    id: zone.id,
    name_fr: zone.name.fr,
    name_en: zone.name.en,
    name_es: zone.name.es,
    order: zone.order,
    start_time_sec: zone.startTimeSec,
    end_time_sec: zone.endTimeSec,
    instructions: zone.instructions.map(massageInstructionToFirestore),
  };
}

/**
 * Convert MassageBodyZone from Firestore to TypeScript format
 */
export function massageBodyZoneFromFirestore(doc: MassageBodyZoneFirestore): MassageBodyZone {
  return {
    id: doc.id,
    name: {
      fr: doc.name_fr,
      en: doc.name_en,
      es: doc.name_es,
    },
    order: doc.order,
    startTimeSec: doc.start_time_sec,
    endTimeSec: doc.end_time_sec,
    instructions: doc.instructions?.map(massageInstructionFromFirestore) || [],
  };
}

// ============================================================================
// Meditation Conversion Functions
// ============================================================================

/**
 * Convert MeditationPhase from TypeScript to Firestore format
 */
export function meditationPhaseToFirestore(phase: MeditationPhase): MeditationPhaseFirestore {
  return {
    id: phase.id,
    name_fr: phase.name.fr,
    name_en: phase.name.en,
    name_es: phase.name.es,
    order: phase.order,
    start_time_sec: phase.startTimeSec,
    end_time_sec: phase.endTimeSec,
    breathing_instruction_fr: phase.breathingInstruction?.fr,
    breathing_instruction_en: phase.breathingInstruction?.en,
    breathing_instruction_es: phase.breathingInstruction?.es,
    ambient_sound_name_fr: phase.ambientSoundName?.fr,
    ambient_sound_name_en: phase.ambientSoundName?.en,
    ambient_sound_name_es: phase.ambientSoundName?.es,
  };
}

/**
 * Convert MeditationPhase from Firestore to TypeScript format
 */
export function meditationPhaseFromFirestore(doc: MeditationPhaseFirestore): MeditationPhase {
  const breathingInstruction = doc.breathing_instruction_fr
    ? { fr: doc.breathing_instruction_fr, en: doc.breathing_instruction_en, es: doc.breathing_instruction_es }
    : undefined;

  const ambientSoundName = doc.ambient_sound_name_fr
    ? { fr: doc.ambient_sound_name_fr, en: doc.ambient_sound_name_en, es: doc.ambient_sound_name_es }
    : undefined;

  return {
    id: doc.id,
    name: {
      fr: doc.name_fr,
      en: doc.name_en,
      es: doc.name_es,
    },
    order: doc.order,
    startTimeSec: doc.start_time_sec,
    endTimeSec: doc.end_time_sec,
    breathingInstruction,
    ambientSoundName,
  };
}

// ============================================================================
// Program-Specific Conversions
// ============================================================================

/**
 * Program objective (TypeScript)
 */
export interface ProgramObjective {
  id: string;
  text: MultilingualText;
  order: number;
}

/**
 * Program objective (Firestore snake_case)
 */
export interface ProgramObjectiveFirestore {
  id: string;
  text_fr: string;
  text_en?: string;
  text_es?: string;
  order: number;
}

/**
 * Convert ProgramObjective from TypeScript to Firestore format
 */
export function programObjectiveToFirestore(objective: ProgramObjective): ProgramObjectiveFirestore {
  return {
    id: objective.id,
    text_fr: objective.text.fr,
    text_en: objective.text.en,
    text_es: objective.text.es,
    order: objective.order,
  };
}

/**
 * Convert ProgramObjective from Firestore to TypeScript format
 */
export function programObjectiveFromFirestore(doc: ProgramObjectiveFirestore): ProgramObjective {
  return {
    id: doc.id,
    text: {
      fr: doc.text_fr,
      en: doc.text_en,
      es: doc.text_es,
    },
    order: doc.order,
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a multilingual text has the primary language (French)
 */
export function hasRequiredLanguage(text: MultilingualText | undefined): boolean {
  return !!text?.fr && text.fr.trim().length > 0;
}

/**
 * Get translation coverage for a multilingual text
 * @returns Object with coverage info { complete: boolean, missing: string[] }
 */
export function getTranslationCoverage(text: MultilingualText | undefined): { complete: boolean; missing: SupportedLanguage[] } {
  const missing: SupportedLanguage[] = [];

  if (!text) {
    return { complete: false, missing: SUPPORTED_LANGUAGES };
  }

  for (const lang of SUPPORTED_LANGUAGES) {
    if (!text[lang] || text[lang]!.trim().length === 0) {
      missing.push(lang);
    }
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

/**
 * Get text for a specific language with fallback to French
 */
export function getLocalizedText(text: MultilingualText | undefined, lang: SupportedLanguage): string {
  if (!text) return '';

  // Try requested language first
  if (text[lang] && text[lang]!.trim().length > 0) {
    return text[lang]!;
  }

  // Fallback to French (primary language)
  return text.fr || '';
}

// ============================================================================
// Migration Helpers
// ============================================================================

/**
 * Create multilingual text from a single French value
 * Used when migrating existing French-only content
 */
export function createFromFrench(frenchText: string): MultilingualText {
  return {
    fr: frenchText,
    en: undefined,
    es: undefined,
  };
}

/**
 * Merge existing translations with new ones
 * Preserves existing translations, only adds new ones
 */
export function mergeTranslations(
  existing: MultilingualText | undefined,
  updates: Partial<MultilingualText>
): MultilingualText {
  return {
    fr: updates.fr ?? existing?.fr ?? '',
    en: updates.en ?? existing?.en,
    es: updates.es ?? existing?.es,
  };
}

// ============================================================================
// Yoga Pose Types (Issue #74)
// ============================================================================

/**
 * Side type for bilateral poses
 */
export type YogaPoseSide = 'none' | 'left' | 'right' | 'both';

/**
 * Target zones for yoga poses
 */
export const YOGA_TARGET_ZONES = [
  'back',
  'legs',
  'hips',
  'shoulders',
  'arms',
  'core',
  'spine',
  'hamstrings',
  'calves',
  'chest',
  'neck',
  'glutes',
  'full_body',
] as const;

export type YogaTargetZone = (typeof YOGA_TARGET_ZONES)[number];

/**
 * Yoga pose entry (TypeScript - camelCase)
 * Embedded in lesson document for yoga/pilates content
 */
export interface YogaPose {
  // Timing
  startTimeMs: number;
  endTimeMs: number;

  // Identity (optional reference to global pose library)
  poseId?: string;

  // Content with i18n support
  title: MultilingualText;
  stimulus: MultilingualText;
  instructions: MultilingualText[];

  // Metadata
  targetZones: string[];
  benefits?: MultilingualText[];
  side: YogaPoseSide;
  thumbnailUrl?: string;
  difficulty?: number; // 1-3
}

/**
 * Yoga pose entry (Firestore - snake_case)
 */
export interface YogaPoseFirestore {
  // Timing
  start_time_ms: number;
  end_time_ms: number;

  // Identity
  pose_id?: string;

  // Content with i18n (snake_case with language suffix)
  title_fr: string;
  title_en?: string;
  title_es?: string;

  stimulus_fr: string;
  stimulus_en?: string;
  stimulus_es?: string;

  // Instructions as array of multilingual objects
  instructions_fr: string[];
  instructions_en?: string[];
  instructions_es?: string[];

  // Metadata
  target_zones: string[];
  benefits_fr?: string[];
  benefits_en?: string[];
  benefits_es?: string[];

  side: YogaPoseSide;
  thumbnail_url?: string;
  difficulty?: number;
}

// ============================================================================
// Yoga Pose Conversion Functions
// ============================================================================

/**
 * Convert YogaPose from TypeScript to Firestore format
 * Note: Firestore doesn't accept undefined values, so we filter them out
 */
export function yogaPoseToFirestore(pose: YogaPose): YogaPoseFirestore {
  const result: Record<string, unknown> = {
    start_time_ms: pose.startTimeMs,
    end_time_ms: pose.endTimeMs,
    title_fr: pose.title.fr,
    stimulus_fr: pose.stimulus.fr,
    instructions_fr: pose.instructions.map((i) => i.fr),
    target_zones: pose.targetZones,
    side: pose.side,
  };

  // Only include optional fields if they have values (Firestore rejects undefined)
  if (pose.poseId) result.pose_id = pose.poseId;
  if (pose.title.en) result.title_en = pose.title.en;
  if (pose.title.es) result.title_es = pose.title.es;
  if (pose.stimulus.en) result.stimulus_en = pose.stimulus.en;
  if (pose.stimulus.es) result.stimulus_es = pose.stimulus.es;

  if (pose.instructions.some((i) => i.en)) {
    result.instructions_en = pose.instructions.map((i) => i.en || '');
  }
  if (pose.instructions.some((i) => i.es)) {
    result.instructions_es = pose.instructions.map((i) => i.es || '');
  }

  if (pose.benefits && pose.benefits.length > 0) {
    result.benefits_fr = pose.benefits.map((b) => b.fr);
    if (pose.benefits.some((b) => b.en)) {
      result.benefits_en = pose.benefits.map((b) => b.en || '');
    }
    if (pose.benefits.some((b) => b.es)) {
      result.benefits_es = pose.benefits.map((b) => b.es || '');
    }
  }

  if (pose.thumbnailUrl) result.thumbnail_url = pose.thumbnailUrl;
  if (pose.difficulty !== undefined) result.difficulty = pose.difficulty;

  return result as unknown as YogaPoseFirestore;
}

/**
 * Convert YogaPose from Firestore to TypeScript format
 */
export function yogaPoseFromFirestore(doc: YogaPoseFirestore): YogaPose {
  // Build instructions array with i18n
  const instructionsFr = doc.instructions_fr || [];
  const instructionsEn = doc.instructions_en || [];
  const instructionsEs = doc.instructions_es || [];
  const instructions: MultilingualText[] = instructionsFr.map((fr, index) => ({
    fr,
    en: instructionsEn[index],
    es: instructionsEs[index],
  }));

  // Build benefits array with i18n (if present)
  let benefits: MultilingualText[] | undefined;
  if (doc.benefits_fr && doc.benefits_fr.length > 0) {
    const benefitsEn = doc.benefits_en || [];
    const benefitsEs = doc.benefits_es || [];
    benefits = doc.benefits_fr.map((fr, index) => ({
      fr,
      en: benefitsEn[index],
      es: benefitsEs[index],
    }));
  }

  return {
    startTimeMs: doc.start_time_ms,
    endTimeMs: doc.end_time_ms,
    poseId: doc.pose_id,
    title: {
      fr: doc.title_fr,
      en: doc.title_en,
      es: doc.title_es,
    },
    stimulus: {
      fr: doc.stimulus_fr,
      en: doc.stimulus_en,
      es: doc.stimulus_es,
    },
    instructions,
    targetZones: doc.target_zones || [],
    benefits,
    side: doc.side || 'none',
    thumbnailUrl: doc.thumbnail_url,
    difficulty: doc.difficulty,
  };
}
