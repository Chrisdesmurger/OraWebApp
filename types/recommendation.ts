/**
 * Types for User Recommendation System
 * Matches Firestore schema in users/{uid}/recommendations/{id}
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Firestore document structure (snake_case)
 * Retrieved directly from Firestore
 */
export interface RecommendationDocument {
  uid: string;
  lesson_ids: string[]; // Top 5 lesson IDs sorted by score
  scores: { [lessonId: string]: number }; // Score for each lesson
  generated_at: Timestamp;
  algorithm_version: string;
  based_on: {
    intentions: string[];
    experience_levels: { [discipline: string]: string };
    time_commitment: string;
    completed_lesson_ids: string[];
  };
  metadata: {
    total_lessons_scored: number;
    avg_score: number;
    trigger: 'onboarding_complete' | 'weekly_cron' | 'manual';
  };
}

/**
 * Frontend representation (camelCase)
 * Used by React components
 */
export interface Recommendation {
  uid: string;
  lessonIds: string[]; // Top 5 recommended lesson IDs
  scores: { [lessonId: string]: number };
  generatedAt: Date;
  algorithmVersion: string;
  basedOn: {
    intentions: string[];
    experienceLevels: { [discipline: string]: string };
    timeCommitment: string;
    completedLessonIds: string[];
  };
  metadata: {
    totalLessonsScored: number;
    avgScore: number;
    trigger: 'onboarding_complete' | 'weekly_cron' | 'manual';
  };
}

/**
 * Recommendation with lesson details
 * Includes enriched lesson information
 */
export interface RecommendationWithLessons extends Recommendation {
  lessons: RecommendedLesson[];
}

/**
 * Recommended lesson with score and metadata
 */
export interface RecommendedLesson {
  id: string;
  title: string;
  discipline: string;
  difficulty: string;
  duration: number; // in seconds
  score: number;
  rank: number; // 1-5 for top recommendations
  thumbnailUrl?: string;
  programId?: string;
  programTitle?: string;
}

/**
 * Recommendation history item
 */
export interface RecommendationHistoryItem {
  id: string; // Document ID (e.g., "latest", "2024-12-10", "manual")
  uid: string;
  lessonCount: number;
  avgScore: number;
  generatedAt: Date;
  trigger: 'onboarding_complete' | 'weekly_cron' | 'manual';
}

/**
 * Score classification for UI display
 */
export type ScoreLevel = 'high' | 'medium' | 'low';

/**
 * Helper function to classify score
 */
export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

/**
 * Helper function to get score badge color
 */
export function getScoreBadgeColor(score: number): string {
  const level = getScoreLevel(score);
  switch (level) {
    case 'high':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-orange-100 text-orange-800 border-orange-200';
  }
}

/**
 * Helper function to get trigger badge color
 */
export function getTriggerBadgeColor(
  trigger: 'onboarding_complete' | 'weekly_cron' | 'manual'
): string {
  switch (trigger) {
    case 'onboarding_complete':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'weekly_cron':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'manual':
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Helper function to format trigger label (French)
 */
export function formatTriggerLabel(
  trigger: 'onboarding_complete' | 'weekly_cron' | 'manual'
): string {
  switch (trigger) {
    case 'onboarding_complete':
      return 'Fin d\'onboarding';
    case 'weekly_cron':
      return 'Mise à jour hebdomadaire';
    case 'manual':
      return 'Recalcul manuel';
  }
}
