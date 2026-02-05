/**
 * Script de seed pour creer une configuration d'onboarding de test
 * Utilise tous les 9 types de layouts modernes
 *
 * Usage: npm run seed-onboarding
 *
 * Prerequisites:
 * - Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import type { OnboardingConfig, OnboardingQuestion, AnswerOption } from '../types/onboarding';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedOnboarding() {
  console.log('Demarrage du seed d\'onboarding...\n');

  // Creer l'ID de la configuration
  const configId = 'test-layouts-v1';

  // Question 1: Grid Selection - Objectifs de bien-etre
  const q1Options: AnswerOption[] = [
    { id: 'opt_meditate', label: 'Méditer', labelFr: 'Méditer', labelEn: 'Meditate', icon: '🧘', color: '#FFB84D', order: 0 },
    { id: 'opt_sleep', label: 'Mieux dormir', labelFr: 'Mieux dormir', labelEn: 'Sleep Better', icon: '😴', color: '#9B72CB', order: 1 },
    { id: 'opt_breathe', label: 'Respirer', labelFr: 'Respirer', labelEn: 'Breathe', icon: '🌬️', color: '#6FBAFF', order: 2 },
    { id: 'opt_focus', label: 'Focus', labelFr: 'Focus', labelEn: 'Focus', icon: '🎯', color: '#FF6B9D', order: 3 },
    { id: 'opt_move', label: 'Bouger', labelFr: 'Bouger', labelEn: 'Move', icon: '💪', color: '#4ECDC4', order: 4 },
    { id: 'opt_mental', label: 'Santé mentale', labelFr: 'Santé mentale', labelEn: 'Mental Health', icon: '🧠', color: '#95E1D3', order: 5 },
  ];

  // Question 2: Toggle List - Domaines d'interet
  const q2Options: AnswerOption[] = [
    { id: 'opt_exercise', label: 'Exercice physique', labelFr: 'Exercice physique', labelEn: 'Physical Exercise', order: 0 },
    { id: 'opt_habits', label: 'Habitudes saines', labelFr: 'Habitudes saines', labelEn: 'Healthy Habits', order: 1 },
    { id: 'opt_guided_meditation', label: 'Méditation guidée', labelFr: 'Méditation guidée', labelEn: 'Guided Meditation', order: 2 },
    { id: 'opt_sleep_sounds', label: 'Sons de sommeil', labelFr: 'Sons de sommeil', labelEn: 'Sleep Sounds', order: 3 },
    { id: 'opt_yoga', label: 'Yoga', labelFr: 'Yoga', labelEn: 'Yoga', order: 4 },
    { id: 'opt_gratitude', label: 'Journal de gratitude', labelFr: 'Journal de gratitude', labelEn: 'Gratitude Journal', order: 5 },
    { id: 'opt_breathing', label: 'Respiration consciente', labelFr: 'Respiration consciente', labelEn: 'Mindful Breathing', order: 6 },
    { id: 'opt_growth', label: 'Développement personnel', labelFr: 'Développement personnel', labelEn: 'Personal Growth', order: 7 },
  ];

  // Question 5: Rating - Niveau d'experience
  const q5Options: AnswerOption[] = [
    { id: 'opt_beginner', label: 'Débutant', labelFr: 'Débutant', labelEn: 'Beginner', icon: '⭐', order: 0 },
    { id: 'opt_novice', label: 'Novice', labelFr: 'Novice', labelEn: 'Novice', icon: '⭐', order: 1 },
    { id: 'opt_intermediate', label: 'Intermédiaire', labelFr: 'Intermédiaire', labelEn: 'Intermediate', icon: '⭐', order: 2 },
    { id: 'opt_advanced', label: 'Avancé', labelFr: 'Avancé', labelEn: 'Advanced', icon: '⭐', order: 3 },
    { id: 'opt_expert', label: 'Expert', labelFr: 'Expert', labelEn: 'Expert', icon: '⭐', order: 4 },
  ];

  // Question 6: Multiple Choice Grid - Moments de la journee
  const q6Options: AnswerOption[] = [
    { id: 'opt_morning', label: 'Matin', labelFr: 'Matin', labelEn: 'Morning', icon: '🌅', order: 0 },
    { id: 'opt_noon', label: 'Midi', labelFr: 'Midi', labelEn: 'Noon', icon: '☀️', order: 1 },
    { id: 'opt_afternoon', label: 'Après-midi', labelFr: 'Après-midi', labelEn: 'Afternoon', icon: '🌤️', order: 2 },
    { id: 'opt_evening', label: 'Soir', labelFr: 'Soir', labelEn: 'Evening', icon: '🌆', order: 3 },
    { id: 'opt_night', label: 'Nuit', labelFr: 'Nuit', labelEn: 'Night', icon: '🌙', order: 4 },
  ];

  // Question 7: Multiple Choice List - Style de pratique
  const q7Options: AnswerOption[] = [
    { id: 'opt_guided_voice', label: 'Guidée par la voix', labelFr: 'Guidée par la voix', labelEn: 'Voice Guided', icon: '🎧', order: 0 },
    { id: 'opt_music', label: 'Musique douce', labelFr: 'Musique douce', labelEn: 'Soft Music', icon: '🎵', order: 1 },
    { id: 'opt_nature', label: 'Sons de la nature', labelFr: 'Sons de la nature', labelEn: 'Nature Sounds', icon: '🌿', order: 2 },
    { id: 'opt_silence', label: 'Silence complet', labelFr: 'Silence complet', labelEn: 'Complete Silence', icon: '🤫', order: 3 },
  ];

  // Question 9: Image Card - Types de contenu
  const q9Options: AnswerOption[] = [
    { id: 'opt_short_meditation', label: 'Méditations courtes', labelFr: 'Méditations courtes', labelEn: 'Short Meditations', icon: '🧘‍♀️', order: 0 },
    { id: 'opt_yoga_sessions', label: 'Sessions de yoga', labelFr: 'Sessions de yoga', labelEn: 'Yoga Sessions', icon: '🕉️', order: 1 },
    { id: 'opt_breathing', label: 'Exercices de respiration', labelFr: 'Exercices de respiration', labelEn: 'Breathing Exercises', icon: '🌬️', order: 2 },
    { id: 'opt_sleep_stories', label: 'Histoires pour dormir', labelFr: 'Histoires pour dormir', labelEn: 'Sleep Stories', icon: '🌙', order: 3 },
  ];

  // Construire les questions
  const questions: OnboardingQuestion[] = [
    // Q1: Grid Selection
    {
      id: 'q1_objectives',
      category: 'goals',
      order: 0,
      title: 'Quels sont vos objectifs de bien-être ?',
      titleFr: 'Quels sont vos objectifs de bien-être ?',
      titleEn: 'What are your wellness goals?',
      subtitle: 'Sélectionnez tous les domaines qui vous intéressent',
      type: {
        kind: 'grid_selection',
        allowMultiple: true,
        gridColumns: 2,
      },
      options: q1Options,
      required: true,
    },

    // Q2: Toggle List
    {
      id: 'q2_interests',
      category: 'goals',
      order: 1,
      title: 'Quels domaines vous intéressent ?',
      titleFr: 'Quels domaines vous intéressent ?',
      titleEn: 'Which areas interest you?',
      subtitle: 'Activez les pratiques qui vous attirent',
      type: {
        kind: 'toggle_list',
        allowMultiple: true,
      },
      options: q2Options,
      required: false,
    },

    // Q3: Slider
    {
      id: 'q3_daily_time',
      category: 'preferences',
      order: 2,
      title: 'Combien de temps pouvez-vous consacrer par jour ?',
      titleFr: 'Combien de temps pouvez-vous consacrer par jour ?',
      titleEn: 'How much time can you dedicate per day?',
      subtitle: 'Soyez réaliste, vous pourrez ajuster plus tard',
      type: {
        kind: 'slider',
        sliderMin: 5,
        sliderMax: 60,
        sliderStep: 5,
        sliderUnit: 'minutes',
      },
      options: [],
      required: true,
    },

    // Q4: Circular Picker
    {
      id: 'q4_weekly_frequency',
      category: 'preferences',
      order: 3,
      title: 'Combien de jours par semaine souhaitez-vous pratiquer ?',
      titleFr: 'Combien de jours par semaine souhaitez-vous pratiquer ?',
      titleEn: 'How many days per week do you want to practice?',
      subtitle: 'Choisissez une fréquence confortable pour vous',
      type: {
        kind: 'circular_picker',
        sliderMin: 1,
        sliderMax: 7,
        sliderStep: 1,
        sliderUnit: 'jours',
      },
      options: [],
      required: true,
    },

    // Q5: Rating
    {
      id: 'q5_experience',
      category: 'experience',
      order: 4,
      title: 'Quel est votre niveau d\'expérience ?',
      titleFr: 'Quel est votre niveau d\'expérience ?',
      titleEn: 'What is your experience level?',
      subtitle: 'Cela nous aide à personnaliser votre parcours',
      type: {
        kind: 'rating',
        showLabels: true,
      },
      options: q5Options,
      required: true,
    },

    // Q6: Multiple Choice Grid
    {
      id: 'q6_daily_moments',
      category: 'preferences',
      order: 5,
      title: 'Quels moments de la journée vous conviennent ?',
      titleFr: 'Quels moments de la journée vous conviennent ?',
      titleEn: 'Which times of day suit you?',
      subtitle: 'Sélectionnez vos créneaux préférés',
      type: {
        kind: 'multiple_choice',
        allowMultiple: true,
        displayMode: 'grid',
      },
      options: q6Options,
      required: true,
    },

    // Q7: Multiple Choice List
    {
      id: 'q7_practice_style',
      category: 'preferences',
      order: 6,
      title: 'Quel style de pratique préférez-vous ?',
      titleFr: 'Quel style de pratique préférez-vous ?',
      titleEn: 'Which practice style do you prefer?',
      subtitle: 'Choisissez l\'ambiance qui vous correspond',
      type: {
        kind: 'multiple_choice',
        allowMultiple: false,
        displayMode: 'list',
      },
      options: q7Options,
      required: true,
    },

    // Q8: Text Input
    {
      id: 'q8_challenges',
      category: 'personalization',
      order: 7,
      title: 'Partagez vos défis actuels (optionnel)',
      titleFr: 'Partagez vos défis actuels (optionnel)',
      titleEn: 'Share your current challenges (optional)',
      subtitle: 'Cela nous aide à mieux vous accompagner',
      type: {
        kind: 'text_input',
        maxLines: 4,
        maxCharacters: 300,
        placeholder: 'Ex: Je cherche à réduire mon stress au travail...',
      },
      options: [],
      required: false,
    },

    // Q9: Image Card
    {
      id: 'q9_content_types',
      category: 'preferences',
      order: 8,
      title: 'Quels types de contenu vous attirent ?',
      titleFr: 'Quels types de contenu vous attirent ?',
      titleEn: 'Which content types attract you?',
      subtitle: 'Sélectionnez vos formats préférés',
      type: {
        kind: 'image_card',
        allowMultiple: true,
      },
      options: q9Options,
      required: true,
    },
  ];

  // Creer la configuration
  const config: Omit<OnboardingConfig, 'createdAt' | 'updatedAt'> = {
    id: configId,
    title: 'Découverte de Votre Parcours Wellbeing',
    description: 'Un questionnaire complet pour personnaliser votre expérience Ora et tester tous les layouts modernes',
    status: 'draft',
    version: '1.0.0',
    questions,
    createdBy: 'seed-script',
  };

  try {
    const now = new Date().toISOString();

    // Upsert into Supabase
    const { error } = await supabase
      .from('onboarding_configs')
      .upsert({
        id: configId,
        title: config.title,
        description: config.description,
        status: config.status,
        version: config.version,
        questions: config.questions,
        created_by: config.createdBy,
        created_at: now,
        updated_at: now,
      });

    if (error) {
      throw error;
    }

    console.log('Configuration d\'onboarding creee avec succes !');
    console.log(`ID: ${configId}`);
    console.log(`Nombre de questions: ${questions.length}`);
    console.log('\nQuestions creees:');
    questions.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.title} (${q.type.kind})`);
    });
    console.log('\nSeed termine ! Vous pouvez maintenant voir la configuration dans l\'admin.');
    console.log(`URL: http://localhost:3000/admin/onboarding/${configId}\n`);
  } catch (error) {
    console.error('Erreur lors du seed:', error);
    throw error;
  }
}

// Executer le script
seedOnboarding()
  .then(() => {
    console.log('Script termine avec succes');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
