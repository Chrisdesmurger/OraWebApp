/**
 * Onboarding Type Definitions
 * Admin Portal - Onboarding Management Interface
 *
 * IMPORTANT - i18n Support (Issue #68):
 * - All text fields now support multilingual content (FR/EN/ES)
 * - French (fr) is the primary language and always required
 * - English (en) and Spanish (es) are optional
 * - Fields follow the pattern: title, titleFr, titleEn, titleEs
 *
 * NOTE: Timestamp fields use string (ISO format) or Date instead of
 * Firebase Timestamp, as the backend now uses PostgreSQL via Supabase.
 */

// ============================================================================
// Question Types & Options
// ============================================================================

export type QuestionTypeKind =
  | 'multiple_choice'
  | 'rating'
  | 'time_selection'
  | 'text_input'
  | 'grid_selection'
  | 'toggle_list'
  | 'slider'
  | 'circular_picker'
  | 'image_card'
  | 'profile_group';

export type ProfileFieldInputType = 'text' | 'date' | 'radio';

/**
 * Profile field option with multilingual labels (FR/EN/ES)
 */
export interface ProfileFieldOption {
  id: string;
  label: string;        // Default/legacy label
  labelFr?: string;     // French translation
  labelEn?: string;     // English translation
  labelEs?: string;     // Spanish translation (NEW - Issue #68)
  icon?: string;
  order: number;
}

/**
 * Profile field with multilingual labels and placeholders (FR/EN/ES)
 */
export interface ProfileField {
  id: string;
  label: string;            // Default/legacy label
  labelFr?: string;         // French translation
  labelEn?: string;         // English translation
  labelEs?: string;         // Spanish translation (NEW - Issue #68)
  inputType: ProfileFieldInputType;
  placeholder?: string;         // Default/legacy placeholder
  placeholderFr?: string;       // French placeholder (NEW - Issue #68)
  placeholderEn?: string;       // English placeholder (NEW - Issue #68)
  placeholderEs?: string;       // Spanish placeholder (NEW - Issue #68)
  maxLength?: number;
  required?: boolean;
  order: number;
  options?: ProfileFieldOption[];
}

export interface QuestionTypeConfig {
  kind: QuestionTypeKind;

  // Multiple choice / Grid selection
  allowMultiple?: boolean;
  minSelections?: number;
  maxSelections?: number;
  gridColumns?: number; // For grid_selection (default: 2)
  displayMode?: 'list' | 'grid'; // Layout mode

  // Rating
  showLabels?: boolean; // Display labels below rating icons

  // Slider / Circular Picker
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  sliderUnit?: string; // "minutes", "days", "hours", etc.

  // Text input
  maxLines?: number; // Number of lines for multiline input
  maxCharacters?: number; // Character limit
  placeholder?: string; // Placeholder text
  placeholderFr?: string; // French placeholder (NEW - Issue #68)
  placeholderEn?: string; // English placeholder (NEW - Issue #68)
  placeholderEs?: string; // Spanish placeholder (NEW - Issue #68)

  // Profile group
  fields?: ProfileField[]; // For profile_group type
}

/**
 * Answer option with multilingual labels and descriptions (FR/EN/ES)
 */
export interface AnswerOption {
  id: string;
  label: string;            // Default/legacy label
  labelFr?: string;         // French translation
  labelEn?: string;         // English translation
  labelEs?: string;         // Spanish translation (NEW - Issue #68)
  description?: string;     // Default/legacy description (NEW - Issue #68)
  descriptionFr?: string;   // French description (NEW - Issue #68)
  descriptionEn?: string;   // English description (NEW - Issue #68)
  descriptionEs?: string;   // Spanish description (NEW - Issue #68)
  icon?: string;            // Emoji or icon name
  color?: string;           // Hex color for visual distinction
  imageUrl?: string;        // Optional illustration URL
  order: number;

  // For slider and circular picker types
  minValue?: number;
  maxValue?: number;
  step?: number;
  unit?: string; // "minutes", "days", "hours", etc.
  value?: number; // Numeric value for this option
}

export interface SkipLogic {
  condition: string; // e.g., "if answer contains 'beginner'"
  conditionType: 'contains' | 'equals' | 'not_contains' | 'not_equals';
  targetValue: string | string[];
  nextQuestionId: string;
}

// ============================================================================
// Onboarding Question
// ============================================================================

export type QuestionCategory = 'goals' | 'experience' | 'preferences' | 'personalization';

/**
 * Onboarding question with multilingual support (FR/EN/ES)
 */
export interface OnboardingQuestion {
  id: string;
  category: QuestionCategory;
  order: number;
  title: string;            // Default/legacy title
  titleFr?: string;         // French translation
  titleEn?: string;         // English translation
  titleEs?: string;         // Spanish translation (NEW - Issue #68)
  subtitle?: string;        // Default/legacy subtitle
  subtitleFr?: string;      // French subtitle
  subtitleEn?: string;      // English subtitle
  subtitleEs?: string;      // Spanish subtitle (NEW - Issue #68)
  hint?: string;            // Default/legacy hint (NEW - Issue #68)
  hintFr?: string;          // French hint (NEW - Issue #68)
  hintEn?: string;          // English hint (NEW - Issue #68)
  hintEs?: string;          // Spanish hint (NEW - Issue #68)
  type: QuestionTypeConfig;
  options: AnswerOption[];
  required: boolean;
  skipLogic?: SkipLogic;
}

// ============================================================================
// Onboarding Configuration
// ============================================================================

export type OnboardingStatus = 'draft' | 'active' | 'archived';

export interface OnboardingConfig {
  id: string; // version ID (v1.0, v1.1, v2.0, etc.)
  title: string;
  description: string;
  status: OnboardingStatus;
  version: string; // Semantic version (1.0.0)
  questions: OnboardingQuestion[];
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: string; // Admin UID
  publishedAt?: string | Date;
  publishedBy?: string; // Admin UID
}

// ============================================================================
// User Onboarding Response (read from Android app)
// ============================================================================

export interface UserOnboardingAnswer {
  questionId: string;
  selectedOptions: string[]; // Option IDs
  textAnswer?: string; // For text_input questions
  answeredAt: string | Date;
}

export interface UserOnboardingResponse {
  uid: string;
  configVersion: string; // Which version they completed
  completed: boolean;
  completedAt?: string | Date;
  startedAt: string | Date;
  answers: UserOnboardingAnswer[];
  metadata: {
    deviceType?: string;
    appVersion?: string;
    totalTimeSeconds?: number;
    locale?: 'fr' | 'en' | 'es'; // Added 'es' for Spanish (Issue #68)
  };
  // Parsed responses for easy access
  goals?: string[];
  mainGoal?: string;
  experienceLevels?: Record<string, string>;
  dailyTimeCommitment?: string;
  preferredTimes?: string[];
  contentPreferences?: string[];
  practiceStyle?: string;
  challenges?: string[];
  supportPreferences?: string[];
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface QuestionMetrics {
  questionId: string;
  questionTitle: string;
  views: number; // How many users saw this question
  answers: number; // How many users answered
  dropOffs: number; // How many users dropped off at this question
  dropOffRate: number; // Percentage
  averageTimeSeconds: number;
  answerDistribution: Record<string, number>; // optionId -> count
}

export interface OnboardingAnalytics {
  versionId: string;
  totalStarts: number;
  totalCompletions: number;
  completionRate: number; // Percentage
  averageTimeSeconds: number;
  questionMetrics: Record<string, QuestionMetrics>; // questionId -> metrics
  updatedAt: string | Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateOnboardingRequest {
  title: string;
  description: string;
  questions: Omit<OnboardingQuestion, 'id'>[];
}

export interface UpdateOnboardingRequest {
  title?: string;
  description?: string;
  questions?: OnboardingQuestion[];
  status?: OnboardingStatus;
}

export interface PublishOnboardingRequest {
  versionId: string;
}

export interface GetAnalyticsParams {
  versionId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface GetResponsesParams {
  versionId: string;
  page?: number;
  limit?: number;
  completed?: boolean;
}

export interface ExportResponsesParams {
  versionId: string;
  format: 'csv' | 'json';
}

// ============================================================================
// UI State Types (for Admin Portal)
// ============================================================================

export interface OnboardingBuilderState {
  config: OnboardingConfig | null;
  selectedQuestionId: string | null;
  isEditingQuestion: boolean;
  isDragging: boolean;
  previewQuestionIndex: number;
}

export interface OnboardingAnalyticsState {
  analytics: OnboardingAnalytics | null;
  isLoading: boolean;
  error: string | null;
  selectedQuestionId: string | null;
}

export interface OnboardingDashboardState {
  configs: OnboardingConfig[];
  isLoading: boolean;
  error: string | null;
  selectedVersion: string | null;
}

// ============================================================================
// Helper Types
// ============================================================================

export interface QuestionTemplate {
  id: string;
  name: string;
  category: QuestionCategory;
  question: Omit<OnboardingQuestion, 'id' | 'order'>;
  tags: string[];
  usageCount: number;
}

export interface OnboardingVersion {
  id: string;
  version: string;
  title: string;
  status: OnboardingStatus;
  publishedAt?: Date;
  questionsCount: number;
}

// ============================================================================
// Validation Schemas (for use with Zod or similar)
// ============================================================================

export interface OnboardingValidationError {
  field: string;
  message: string;
  questionId?: string;
}

export interface OnboardingValidationResult {
  isValid: boolean;
  errors: OnboardingValidationError[];
  warnings: OnboardingValidationError[];
}

// ============================================================================
// Information Screens (Phase 3 - Dynamic Information Screens)
// ============================================================================

/**
 * Display conditions for information screens
 * Controls when a screen should be shown based on user responses
 */
export interface DisplayConditions {
  showIfAnswer?: string; // Question ID
  expectedAnswer?: string | string[]; // Expected answer value(s)
  showIfGoal?: string; // Show if user selected this goal
  showIfExperience?: 'beginner' | 'intermediate' | 'advanced';
  logicOperator?: 'AND' | 'OR'; // For multiple conditions
}

/**
 * Bullet point with multilingual text (FR/EN/ES)
 * For structured content in information screens
 */
export interface BulletPoint {
  id?: string;          // Optional ID for tracking
  order: number;        // Display order
  text: string;         // Default/legacy text
  textFr?: string;      // French translation (NEW - Issue #68)
  textEn?: string;      // English translation (NEW - Issue #68)
  textEs?: string;      // Spanish translation (NEW - Issue #68)
  icon?: string;        // Optional icon/emoji
}

/**
 * Information Screen
 * Dynamic screens shown between onboarding questions
 * Provides contextual information, tips, or encouragement
 *
 * Now with full multilingual support (FR/EN/ES) - Issue #68
 */
export interface InformationScreen {
  id: string;
  position: number; // Position in onboarding flow (0 = before first question)
  title: string;            // Default/legacy title
  titleFr?: string;         // French translation
  titleEn?: string;         // English translation
  titleEs?: string;         // Spanish translation (NEW - Issue #68)
  subtitle?: string;        // Default/legacy subtitle
  subtitleFr?: string;      // French subtitle
  subtitleEn?: string;      // English subtitle
  subtitleEs?: string;      // Spanish subtitle (NEW - Issue #68)
  content?: string;         // Default/legacy content (markdown or HTML)
  contentFr?: string;       // French content
  contentEn?: string;       // English content
  contentEs?: string;       // Spanish content (NEW - Issue #68)
  // Legacy bullet points (simple string arrays)
  bulletPoints?: string[];      // Default/legacy bullet points
  bulletPointsFr?: string[];    // French bullet points
  bulletPointsEn?: string[];    // English bullet points
  bulletPointsEs?: string[];    // Spanish bullet points (NEW - Issue #68)
  // New structured bullet points with individual translations
  bulletPointsStructured?: BulletPoint[];  // Structured bullet points with i18n (NEW - Issue #68)
  imageUrl?: string;        // Optional illustration
  ctaText?: string;         // Default/legacy CTA button text
  ctaTextFr?: string;       // French CTA text
  ctaTextEn?: string;       // English CTA text
  ctaTextEs?: string;       // Spanish CTA text (NEW - Issue #68)
  backgroundColor?: string; // Hex color
  displayConditions?: DisplayConditions;
  order: number; // Order if multiple screens at same position
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ============================================================================
// Recommendation Rules (Phase 3 - Program Recommendation Engine)
// ============================================================================

/**
 * Rule condition for recommendation engine
 * Defines matching criteria based on user onboarding responses
 */
export interface RuleCondition {
  questionId: string; // Which question to check
  operator: 'contains' | 'equals' | 'not_contains' | 'not_equals' | 'greater_than' | 'less_than';
  value: string | string[] | number;
  weight?: number; // Priority weight (higher = more important)
}

/**
 * Recommendation Rule
 * Maps user onboarding answers to recommended programs
 */
export interface RecommendationRule {
  id: string;
  programId: string; // Which program to recommend
  programTitle: string; // Cached for display
  conditions: RuleCondition[]; // All conditions must match (AND logic)
  priority: number; // Display order (1 = highest priority)
  active: boolean; // Can be disabled without deletion
  description?: string; // Admin notes
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: string; // Admin UID
}

// ============================================================================
// Enhanced Onboarding Config (with Phase 3 additions)
// ============================================================================

export interface EnhancedOnboardingConfig extends OnboardingConfig {
  informationScreens?: InformationScreen[];
  recommendationRules?: RecommendationRule[];
}

// ============================================================================
// API Request/Response Types (Phase 3)
// ============================================================================

export interface CreateInformationScreenRequest {
  position: number;
  title: string;
  titleFr?: string;
  titleEn?: string;
  titleEs?: string;         // Spanish (NEW - Issue #68)
  subtitle?: string;
  subtitleFr?: string;
  subtitleEn?: string;
  subtitleEs?: string;      // Spanish (NEW - Issue #68)
  content?: string;
  contentFr?: string;
  contentEn?: string;
  contentEs?: string;       // Spanish (NEW - Issue #68)
  bulletPoints?: string[];
  bulletPointsFr?: string[];
  bulletPointsEn?: string[];
  bulletPointsEs?: string[];  // Spanish (NEW - Issue #68)
  bulletPointsStructured?: BulletPoint[];  // Structured with i18n (NEW - Issue #68)
  imageUrl?: string;
  ctaText?: string;
  ctaTextFr?: string;
  ctaTextEn?: string;
  ctaTextEs?: string;       // Spanish (NEW - Issue #68)
  backgroundColor?: string;
  displayConditions?: DisplayConditions;
  order: number;
}

export interface UpdateInformationScreenRequest {
  position?: number;
  title?: string;
  titleFr?: string;
  titleEn?: string;
  titleEs?: string;         // Spanish (NEW - Issue #68)
  subtitle?: string;
  subtitleFr?: string;
  subtitleEn?: string;
  subtitleEs?: string;      // Spanish (NEW - Issue #68)
  content?: string;
  contentFr?: string;
  contentEn?: string;
  contentEs?: string;       // Spanish (NEW - Issue #68)
  bulletPoints?: string[];
  bulletPointsFr?: string[];
  bulletPointsEn?: string[];
  bulletPointsEs?: string[];  // Spanish (NEW - Issue #68)
  bulletPointsStructured?: BulletPoint[];  // Structured with i18n (NEW - Issue #68)
  imageUrl?: string;
  ctaText?: string;
  ctaTextFr?: string;
  ctaTextEn?: string;
  ctaTextEs?: string;       // Spanish (NEW - Issue #68)
  backgroundColor?: string;
  displayConditions?: DisplayConditions;
  order?: number;
}

export interface CreateRecommendationRuleRequest {
  programId: string;
  conditions: RuleCondition[];
  priority: number;
  description?: string;
}

export interface UpdateRecommendationRuleRequest {
  programId?: string;
  conditions?: RuleCondition[];
  priority?: number;
  active?: boolean;
  description?: string;
}

// ============================================================================
// i18n Helper Types (NEW - Issue #68)
// ============================================================================

/**
 * Supported languages for onboarding content
 */
export type OnboardingLanguage = 'fr' | 'en' | 'es';

/**
 * Translation coverage for a single item
 */
export interface TranslationCoverage {
  fr: boolean;  // Always true (required)
  en: boolean;
  es: boolean;
}

/**
 * i18n validation result for onboarding content
 */
export interface OnboardingI18nValidation {
  isComplete: boolean;       // All languages have translations
  missingLanguages: OnboardingLanguage[];
  fieldsCoverage: Record<string, TranslationCoverage>;
}

// ============================================================================
// Validation Helpers (Phase 3)
// ============================================================================

/**
 * Validates an information screen configuration
 */
export function validateInformationScreen(screen: Partial<InformationScreen>): OnboardingValidationResult {
  const errors: OnboardingValidationError[] = [];
  const warnings: OnboardingValidationError[] = [];

  // Required fields
  if (!screen.title || screen.title.trim() === '') {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  if (screen.position === undefined || screen.position < 0) {
    errors.push({ field: 'position', message: 'Valid position is required (>= 0)' });
  }

  // Background color validation
  if (screen.backgroundColor && !/^#[0-9A-F]{6}$/i.test(screen.backgroundColor)) {
    errors.push({ field: 'backgroundColor', message: 'Background color must be a valid hex color (#RRGGBB)' });
  }

  // Display conditions validation
  if (screen.displayConditions) {
    if (screen.displayConditions.showIfAnswer && !screen.displayConditions.expectedAnswer) {
      warnings.push({ field: 'displayConditions.expectedAnswer', message: 'Expected answer should be specified when using showIfAnswer' });
    }
  }

  // Localization warnings - now checks for Spanish too (Issue #68)
  if (!screen.titleFr && !screen.titleEn && !screen.titleEs) {
    warnings.push({ field: 'title', message: 'Consider adding French, English, or Spanish translations' });
  }

  // Check for incomplete Spanish translations (Issue #68)
  if ((screen.titleFr || screen.titleEn) && !screen.titleEs) {
    warnings.push({ field: 'titleEs', message: 'Spanish translation is missing for title' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a recommendation rule configuration
 */
export function validateRecommendationRule(rule: Partial<RecommendationRule>): OnboardingValidationResult {
  const errors: OnboardingValidationError[] = [];
  const warnings: OnboardingValidationError[] = [];

  // Required fields
  if (!rule.programId || rule.programId.trim() === '') {
    errors.push({ field: 'programId', message: 'Program ID is required' });
  }

  if (!rule.conditions || rule.conditions.length === 0) {
    errors.push({ field: 'conditions', message: 'At least one condition is required' });
  }

  if (rule.priority === undefined || rule.priority < 1) {
    errors.push({ field: 'priority', message: 'Priority must be >= 1' });
  }

  // Validate each condition
  rule.conditions?.forEach((condition, index) => {
    if (!condition.questionId) {
      errors.push({ field: `conditions[${index}].questionId`, message: 'Question ID is required' });
    }

    if (!condition.operator) {
      errors.push({ field: `conditions[${index}].operator`, message: 'Operator is required' });
    }

    if (condition.value === undefined || condition.value === null) {
      errors.push({ field: `conditions[${index}].value`, message: 'Value is required' });
    }
  });

  // Warnings
  if (!rule.description) {
    warnings.push({ field: 'description', message: 'Consider adding a description for clarity' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Checks if a user response matches a rule condition
 */
export function matchesCondition(condition: RuleCondition, userAnswer: string | string[] | number): boolean {
  const { operator, value } = condition;

  switch (operator) {
    case 'equals':
      return userAnswer === value;

    case 'not_equals':
      return userAnswer !== value;

    case 'contains':
      if (Array.isArray(userAnswer)) {
        return Array.isArray(value)
          ? value.some(v => userAnswer.includes(v))
          : userAnswer.includes(value as string);
      }
      return String(userAnswer).includes(String(value));

    case 'not_contains':
      if (Array.isArray(userAnswer)) {
        return Array.isArray(value)
          ? !value.some(v => userAnswer.includes(v))
          : !userAnswer.includes(value as string);
      }
      return !String(userAnswer).includes(String(value));

    case 'greater_than':
      return Number(userAnswer) > Number(value);

    case 'less_than':
      return Number(userAnswer) < Number(value);

    default:
      return false;
  }
}

/**
 * Evaluates if all rule conditions match user responses
 */
export function evaluateRule(rule: RecommendationRule, userResponses: Record<string, string | string[] | number>): boolean {
  return rule.conditions.every(condition => {
    const userAnswer = userResponses[condition.questionId];
    if (userAnswer === undefined) return false;
    return matchesCondition(condition, userAnswer);
  });
}

// ============================================================================
// i18n Helper Functions (NEW - Issue #68)
// ============================================================================

/**
 * Get localized text for a field with fallback chain: requested -> fr -> default
 */
export function getLocalizedOnboardingText(
  defaultText: string | undefined,
  textFr: string | undefined,
  textEn: string | undefined,
  textEs: string | undefined,
  lang: OnboardingLanguage
): string {
  switch (lang) {
    case 'es':
      return textEs || textFr || defaultText || '';
    case 'en':
      return textEn || textFr || defaultText || '';
    case 'fr':
    default:
      return textFr || defaultText || '';
  }
}

/**
 * Check translation coverage for a question
 */
export function getQuestionTranslationCoverage(question: OnboardingQuestion): OnboardingI18nValidation {
  const fieldsCoverage: Record<string, TranslationCoverage> = {
    title: {
      fr: !!(question.titleFr || question.title),
      en: !!question.titleEn,
      es: !!question.titleEs,
    },
    subtitle: {
      fr: !!(question.subtitleFr || question.subtitle),
      en: !!question.subtitleEn,
      es: !!question.subtitleEs,
    },
    hint: {
      fr: !!(question.hintFr || question.hint),
      en: !!question.hintEn,
      es: !!question.hintEs,
    },
  };

  // Check options
  question.options.forEach((option, index) => {
    fieldsCoverage[`option_${index}_label`] = {
      fr: !!(option.labelFr || option.label),
      en: !!option.labelEn,
      es: !!option.labelEs,
    };
    if (option.description || option.descriptionFr || option.descriptionEn || option.descriptionEs) {
      fieldsCoverage[`option_${index}_description`] = {
        fr: !!(option.descriptionFr || option.description),
        en: !!option.descriptionEn,
        es: !!option.descriptionEs,
      };
    }
  });

  const missingLanguages: OnboardingLanguage[] = [];
  let hasAllEn = true;
  let hasAllEs = true;

  Object.values(fieldsCoverage).forEach(coverage => {
    if (!coverage.en) hasAllEn = false;
    if (!coverage.es) hasAllEs = false;
  });

  if (!hasAllEn) missingLanguages.push('en');
  if (!hasAllEs) missingLanguages.push('es');

  return {
    isComplete: missingLanguages.length === 0,
    missingLanguages,
    fieldsCoverage,
  };
}

/**
 * Check translation coverage for an information screen
 */
export function getInformationScreenTranslationCoverage(screen: InformationScreen): OnboardingI18nValidation {
  const fieldsCoverage: Record<string, TranslationCoverage> = {
    title: {
      fr: !!(screen.titleFr || screen.title),
      en: !!screen.titleEn,
      es: !!screen.titleEs,
    },
    subtitle: {
      fr: !!(screen.subtitleFr || screen.subtitle),
      en: !!screen.subtitleEn,
      es: !!screen.subtitleEs,
    },
    content: {
      fr: !!(screen.contentFr || screen.content),
      en: !!screen.contentEn,
      es: !!screen.contentEs,
    },
    ctaText: {
      fr: !!(screen.ctaTextFr || screen.ctaText),
      en: !!screen.ctaTextEn,
      es: !!screen.ctaTextEs,
    },
  };

  // Check structured bullet points if present
  if (screen.bulletPointsStructured) {
    screen.bulletPointsStructured.forEach((bp, index) => {
      fieldsCoverage[`bulletPoint_${index}`] = {
        fr: !!(bp.textFr || bp.text),
        en: !!bp.textEn,
        es: !!bp.textEs,
      };
    });
  }

  const missingLanguages: OnboardingLanguage[] = [];
  let hasAllEn = true;
  let hasAllEs = true;

  Object.values(fieldsCoverage).forEach(coverage => {
    if (!coverage.en) hasAllEn = false;
    if (!coverage.es) hasAllEs = false;
  });

  if (!hasAllEn) missingLanguages.push('en');
  if (!hasAllEs) missingLanguages.push('es');

  return {
    isComplete: missingLanguages.length === 0,
    missingLanguages,
    fieldsCoverage,
  };
}
