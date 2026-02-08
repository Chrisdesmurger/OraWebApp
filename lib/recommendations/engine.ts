/**
 * Recommendation Engine
 *
 * Generates personalized lesson recommendations based on user onboarding
 * responses and admin-defined recommendation rules.
 *
 * Replaces the former Firebase Cloud Function `regenerateUserRecommendationsHttp`.
 *
 * Algorithm:
 * 1. Fetch user's onboarding responses
 * 2. Fetch active recommendation rules from onboarding config
 * 3. Evaluate rules against user responses (AND logic)
 * 4. Score lessons from matched programs
 * 5. Store top 5 recommendations in user_recommendations table
 */

import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { evaluateRule, type RecommendationRule } from '@/types/onboarding';
import type { RecommendationDocument } from '@/types/recommendation';

const ALGORITHM_VERSION = '2.0'; // v2 = Supabase-native (was v1 Firebase)
const TOP_N = 5;

export type RecommendationTrigger = 'onboarding_complete' | 'weekly_cron' | 'manual';

export interface GenerateResult {
  success: boolean;
  lessonCount: number;
  totalScored: number;
  avgScore: number;
}

/**
 * Generate personalized recommendations for a single user.
 */
export async function generateRecommendations(
  userId: string,
  trigger: RecommendationTrigger
): Promise<GenerateResult> {
  const supabase = createSupabaseServiceClient();

  // 1. Fetch user's onboarding responses
  const { data: responseRow, error: responseError } = await supabase
    .from('onboarding_responses')
    .select('*')
    .eq('uid', userId)
    .eq('completed', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (responseError) {
    console.error('[RecommendationEngine] Error fetching onboarding responses:', responseError);
    throw new Error('Failed to fetch onboarding responses');
  }

  if (!responseRow) {
    console.log(`[RecommendationEngine] No completed onboarding for user ${userId}`);
    throw new Error('User has no completed onboarding responses');
  }

  // 2. Fetch active onboarding config with recommendation rules
  const { data: activeConfig, error: configError } = await supabase
    .from('onboarding_configs')
    .select('id, recommendation_rules')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (configError) {
    console.error('[RecommendationEngine] Error fetching active config:', configError);
    throw new Error('Failed to fetch active onboarding configuration');
  }

  const rules: RecommendationRule[] = (activeConfig?.recommendation_rules as RecommendationRule[]) || [];
  const activeRules = rules.filter(r => r.active);

  if (activeRules.length === 0) {
    console.log('[RecommendationEngine] No active recommendation rules found');
    throw new Error('No active recommendation rules configured');
  }

  // 3. Build user responses map for rule evaluation
  const userResponses = buildUserResponsesMap(responseRow);

  // 4. Evaluate rules and collect matched program IDs with priorities
  const matchedPrograms: { programId: string; priority: number; conditionWeightAvg: number }[] = [];

  for (const rule of activeRules) {
    const matches = evaluateRule(rule, userResponses);
    if (matches) {
      const totalWeight = rule.conditions.reduce((sum, c) => sum + (c.weight || 1), 0);
      const avgWeight = totalWeight / rule.conditions.length;
      matchedPrograms.push({
        programId: rule.programId,
        priority: rule.priority,
        conditionWeightAvg: avgWeight,
      });
    }
  }

  // 5. Fetch lessons from matched programs (status = 'ready')
  const programIds = [...new Set(matchedPrograms.map(m => m.programId))];

  let allLessons: Record<string, unknown>[] = [];

  if (programIds.length > 0) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, title_fr, category_fr, program_id, duration_sec, tags, status, subcategory_id')
      .in('program_id', programIds)
      .eq('status', 'ready');

    allLessons = lessons || [];
  }

  // If no lessons from matched programs, fallback to all published ready lessons
  if (allLessons.length === 0) {
    const { data: fallbackLessons } = await supabase
      .from('lessons')
      .select('id, title_fr, category_fr, program_id, duration_sec, tags, status, subcategory_id')
      .eq('status', 'ready')
      .limit(50);

    allLessons = fallbackLessons || [];
  }

  // 6. Fetch programs info for category/difficulty matching
  const lessonProgramIds = [...new Set(allLessons.map(l => l.program_id as string).filter(Boolean))];
  const programMap = new Map<string, Record<string, unknown>>();

  if (lessonProgramIds.length > 0) {
    const { data: programs } = await supabase
      .from('programs')
      .select('id, category, difficulty')
      .in('id', lessonProgramIds);

    (programs || []).forEach(p => programMap.set(p.id, p));
  }

  // 7. Fetch user's completed lesson IDs to penalize re-watching
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('lesson_id')
    .eq('user_id', userId)
    .not('lesson_id', 'is', null);

  const completedLessonIds = new Set(
    (sessions || []).map(s => s.lesson_id as string)
  );

  // 8. Score each lesson
  const userIntentions: string[] = responseRow.goals || [];
  const userExperience: Record<string, string> = responseRow.experience_levels || {};
  const userTimeCommitment = parseTimeCommitment(responseRow.daily_time_commitment);

  const scoredLessons: { lessonId: string; score: number }[] = [];

  for (const lesson of allLessons) {
    const lessonId = lesson.id as string;
    const programId = lesson.program_id as string;
    const durationSec = (lesson.duration_sec as number) || 0;

    // Base score from matched program rule
    const matchedRule = matchedPrograms.find(m => m.programId === programId);
    let score = matchedRule ? 1.0 : 0.3; // 1.0 if from matched program, 0.3 fallback

    // Priority weight: higher priority (lower number) = higher weight
    if (matchedRule) {
      score *= 1 / Math.max(matchedRule.priority, 1);
      score *= matchedRule.conditionWeightAvg;
    }

    // Category bonus: does the program category match user intentions?
    const program = programMap.get(programId);
    if (program) {
      const category = program.category as string;
      if (userIntentions.some(i => categoryMatchesIntention(category, i))) {
        score += 0.15;
      }

      // Difficulty bonus: does difficulty match user experience?
      const difficulty = program.difficulty as string;
      if (difficultyMatchesExperience(difficulty, userExperience, category)) {
        score += 0.1;
      }
    }

    // Time bonus: lesson fits within user's daily time commitment
    if (userTimeCommitment > 0 && durationSec > 0) {
      const durationMin = durationSec / 60;
      if (durationMin <= userTimeCommitment) {
        score += 0.1;
      }
    }

    // Completion penalty: reduce score for already-watched lessons
    if (completedLessonIds.has(lessonId)) {
      score -= 0.3;
    }

    // Clamp score between 0 and 1
    score = Math.max(0, Math.min(1, score));

    scoredLessons.push({ lessonId, score });
  }

  // 9. Sort by score descending and take top N
  scoredLessons.sort((a, b) => b.score - a.score);
  const topLessons = scoredLessons.slice(0, TOP_N);

  const lessonIds = topLessons.map(l => l.lessonId);
  const scores: Record<string, number> = {};
  topLessons.forEach(l => {
    scores[l.lessonId] = Math.round(l.score * 100) / 100;
  });

  const totalScored = scoredLessons.length;
  const avgScore = totalScored > 0
    ? Math.round((scoredLessons.reduce((sum, l) => sum + l.score, 0) / totalScored) * 100) / 100
    : 0;

  // 10. Build recommendation document
  const recommendation: RecommendationDocument = {
    uid: userId,
    lesson_ids: lessonIds,
    scores,
    generated_at: new Date().toISOString(),
    algorithm_version: ALGORITHM_VERSION,
    based_on: {
      intentions: userIntentions,
      experience_levels: userExperience,
      time_commitment: responseRow.daily_time_commitment || '',
      completed_lesson_ids: [...completedLessonIds],
    },
    metadata: {
      total_lessons_scored: totalScored,
      avg_score: avgScore,
      trigger,
    },
  };

  // 11. Insert into user_recommendations
  const { error: insertError } = await supabase
    .from('user_recommendations')
    .insert({
      user_id: userId,
      recommendations: recommendation,
      generated_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('[RecommendationEngine] Error inserting recommendation:', insertError);
    throw new Error('Failed to save recommendation');
  }

  console.log(
    `[RecommendationEngine] Generated ${lessonIds.length} recommendations for user ${userId} ` +
    `(trigger: ${trigger}, scored: ${totalScored}, avg: ${avgScore})`
  );

  return {
    success: true,
    lessonCount: lessonIds.length,
    totalScored,
    avgScore,
  };
}

/**
 * Build a flat map of question ID -> answer value from onboarding response row.
 * Used by evaluateRule() for rule condition matching.
 */
function buildUserResponsesMap(
  responseRow: Record<string, unknown>
): Record<string, string | string[] | number> {
  const map: Record<string, string | string[] | number> = {};

  // Direct parsed fields
  if (responseRow.goals) map['goals'] = responseRow.goals as string[];
  if (responseRow.main_goal) map['main_goal'] = responseRow.main_goal as string;
  if (responseRow.experience_levels) {
    const levels = responseRow.experience_levels as Record<string, string>;
    for (const [discipline, level] of Object.entries(levels)) {
      map[`experience_${discipline}`] = level;
    }
  }
  if (responseRow.daily_time_commitment) map['daily_time_commitment'] = responseRow.daily_time_commitment as string;
  if (responseRow.preferred_times) map['preferred_times'] = responseRow.preferred_times as string[];
  if (responseRow.content_preferences) map['content_preferences'] = responseRow.content_preferences as string[];
  if (responseRow.practice_style) map['practice_style'] = responseRow.practice_style as string;
  if (responseRow.challenges) map['challenges'] = responseRow.challenges as string[];
  if (responseRow.support_preferences) map['support_preferences'] = responseRow.support_preferences as string[];

  // Also map individual answers by question ID
  const answers = responseRow.answers as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(answers)) {
    for (const answer of answers) {
      const questionId = answer.question_id as string;
      if (!questionId) continue;

      if (answer.selected_options) {
        map[questionId] = answer.selected_options as string[];
      } else if (answer.text_answer) {
        map[questionId] = answer.text_answer as string;
      } else if (answer.numeric_value !== undefined) {
        map[questionId] = answer.numeric_value as number;
      }
    }
  }

  return map;
}

/**
 * Parse time commitment string to minutes.
 * Handles formats like "15-20 minutes", "20", "30 min", etc.
 */
function parseTimeCommitment(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;

  // Try to extract numbers, take the first one
  const numbers = value.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    // If range like "15-20", take the average
    if (numbers.length >= 2) {
      return (parseInt(numbers[0], 10) + parseInt(numbers[1], 10)) / 2;
    }
    return parseInt(numbers[0], 10);
  }
  return 0;
}

/**
 * Check if a program category matches a user intention.
 */
function categoryMatchesIntention(category: string, intention: string): boolean {
  const intentionLower = intention.toLowerCase();
  const categoryLower = category.toLowerCase();

  // Direct match
  if (intentionLower.includes(categoryLower) || categoryLower.includes(intentionLower)) {
    return true;
  }

  // Semantic matches
  const categoryIntentionMap: Record<string, string[]> = {
    'yoga': ['souplesse', 'flexibility', 'force', 'strength', 'posture', 'corps', 'body', 'yoga'],
    'meditation': ['stress', 'calme', 'calm', 'anxiety', 'anxiete', 'sommeil', 'sleep', 'focus', 'concentration', 'meditation', 'mindfulness', 'pleine conscience'],
    'respiration': ['stress', 'calme', 'calm', 'energie', 'energy', 'respiration', 'breathing', 'souffle'],
    'pilates': ['force', 'strength', 'posture', 'tonification', 'toning', 'corps', 'body', 'pilates'],
    'auto-massage': ['detente', 'relaxation', 'douleur', 'pain', 'tension', 'recovery', 'recuperation', 'massage'],
  };

  const relatedIntentions = categoryIntentionMap[categoryLower] || [];
  return relatedIntentions.some(ri => intentionLower.includes(ri));
}

/**
 * Check if program difficulty matches user experience level for a category.
 */
function difficultyMatchesExperience(
  difficulty: string,
  experienceLevels: Record<string, string>,
  category: string
): boolean {
  const userLevel = experienceLevels[category] || experienceLevels['general'];
  if (!userLevel) return false;

  const levelMap: Record<string, number> = {
    'beginner': 1, 'debutant': 1, 'débutant': 1,
    'intermediate': 2, 'intermediaire': 2, 'intermédiaire': 2,
    'advanced': 3, 'avance': 3, 'avancé': 3,
  };

  const userLevelNum = levelMap[userLevel.toLowerCase()] || 1;
  const difficultyNum = levelMap[difficulty.toLowerCase()] || 1;

  // Match if difficulty is at user's level or one below
  return difficultyNum <= userLevelNum;
}
