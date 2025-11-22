/**
 * Onboarding Type Definitions
 * Admin Portal - Onboarding Management Interface
 */

import { Timestamp } from 'firebase/firestore';

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
  | 'image_card';

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
}

export interface AnswerOption {
  id: string;
  label: string;
  labelFr?: string; // French translation
  labelEn?: string; // English translation
  icon?: string; // Emoji or icon name
  color?: string; // Hex color for visual distinction
  imageUrl?: string; // Optional illustration URL
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

export interface OnboardingQuestion {
  id: string;
  category: QuestionCategory;
  order: number;
  title: string;
  titleFr?: string;
  titleEn?: string;
  subtitle?: string;
  subtitleFr?: string;
  subtitleEn?: string;
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
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string; // Admin UID
  publishedAt?: Timestamp | Date;
  publishedBy?: string; // Admin UID
}

// ============================================================================
// User Onboarding Response (read from Android app)
// ============================================================================

export interface UserOnboardingAnswer {
  questionId: string;
  selectedOptions: string[]; // Option IDs
  textAnswer?: string; // For text_input questions
  answeredAt: Timestamp | Date;
}

export interface UserOnboardingResponse {
  uid: string;
  configVersion: string; // Which version they completed
  completed: boolean;
  completedAt?: Timestamp | Date;
  startedAt: Timestamp | Date;
  answers: UserOnboardingAnswer[];
  metadata: {
    deviceType?: string;
    appVersion?: string;
    totalTimeSeconds?: number;
    locale?: 'fr' | 'en';
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
  updatedAt: Timestamp | Date;
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
 * Information Screen
 * Dynamic screens shown between onboarding questions
 * Provides contextual information, tips, or encouragement
 */
export interface InformationScreen {
  id: string;
  position: number; // Position in onboarding flow (0 = before first question)
  title: string;
  titleFr?: string;
  titleEn?: string;
  subtitle?: string;
  subtitleFr?: string;
  subtitleEn?: string;
  content?: string; // Rich content (markdown or HTML)
  contentFr?: string;
  contentEn?: string;
  bulletPoints?: string[]; // Key points to highlight
  bulletPointsFr?: string[];
  bulletPointsEn?: string[];
  imageUrl?: string; // Optional illustration
  ctaText?: string; // Call-to-action button text
  ctaTextFr?: string;
  ctaTextEn?: string;
  backgroundColor?: string; // Hex color
  displayConditions?: DisplayConditions;
  order: number; // Order if multiple screens at same position
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
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
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
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
  subtitle?: string;
  content?: string;
  bulletPoints?: string[];
  imageUrl?: string;
  ctaText?: string;
  backgroundColor?: string;
  displayConditions?: DisplayConditions;
  order: number;
}

export interface UpdateInformationScreenRequest {
  position?: number;
  title?: string;
  titleFr?: string;
  titleEn?: string;
  subtitle?: string;
  content?: string;
  bulletPoints?: string[];
  imageUrl?: string;
  ctaText?: string;
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

  // Localization warnings
  if (!screen.titleFr && !screen.titleEn) {
    warnings.push({ field: 'title', message: 'Consider adding French or English translations' });
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
