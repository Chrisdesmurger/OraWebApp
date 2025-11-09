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
  | 'text_input';

export interface QuestionTypeConfig {
  kind: QuestionTypeKind;
  allowMultiple?: boolean;
  minSelections?: number;
  maxSelections?: number;
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
