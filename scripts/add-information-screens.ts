/**
 * Script to add information screens to "Decouverte de Votre Parcours Wellbeing" onboarding
 * Inspired by Minday's onboarding flow
 *
 * Usage: npm run add-info-screens
 *
 * Prerequisites:
 * - Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import type { InformationScreen } from '../types/onboarding';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const informationScreens: Omit<InformationScreen, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Ecran 0: Bienvenue - Position 0 (avant la premiere question)
  {
    position: 0,
    order: 0,
    title: 'Bienvenue dans votre parcours wellbeing',
    titleFr: 'Bienvenue dans votre parcours wellbeing',
    titleEn: 'Welcome to your wellbeing journey',
    subtitle: 'Créons ensemble votre expérience personnalisée',
    subtitleFr: 'Créons ensemble votre expérience personnalisée',
    subtitleEn: "Let's create your personalized experience together",
    content: 'Nous allons vous poser quelques questions pour mieux comprendre vos besoins et créer un parcours adapté à vos objectifs de bien-être.',
    contentFr: 'Nous allons vous poser quelques questions pour mieux comprendre vos besoins et créer un parcours adapté à vos objectifs de bien-être.',
    contentEn: "We'll ask you a few questions to better understand your needs and create a journey tailored to your wellbeing goals.",
    bulletPoints: [
      '✨ Quelques questions simples',
      '⏱️ Moins de 2 minutes',
      '🎯 Une expérience 100% personnalisée',
    ],
    bulletPointsFr: [
      '✨ Quelques questions simples',
      '⏱️ Moins de 2 minutes',
      '🎯 Une expérience 100% personnalisée',
    ],
    bulletPointsEn: [
      '✨ A few simple questions',
      '⏱️ Less than 2 minutes',
      '🎯 A 100% personalized experience',
    ],
    ctaText: 'Commencer',
    ctaTextFr: 'Commencer',
    ctaTextEn: 'Get started',
    backgroundColor: '#F5EFE6',
  },

  // Ecran 1: Apres objectifs - Position 1 (apres Q1 sur les objectifs)
  {
    position: 1,
    order: 0,
    title: 'Excellent choix !',
    titleFr: 'Excellent choix !',
    titleEn: 'Great choice!',
    subtitle: 'Vos objectifs sont la clé de votre réussite',
    subtitleFr: 'Vos objectifs sont la clé de votre réussite',
    subtitleEn: 'Your goals are the key to your success',
    content: 'Nous allons personnaliser votre parcours en fonction de vos aspirations. Chaque pratique sera choisie pour vous aider à atteindre vos objectifs.',
    contentFr: 'Nous allons personnaliser votre parcours en fonction de vos aspirations. Chaque pratique sera choisie pour vous aider à atteindre vos objectifs.',
    contentEn: "We'll personalize your journey based on your aspirations. Each practice will be chosen to help you achieve your goals.",
    bulletPoints: [
      '🧘 Méditations guidées adaptées',
      '💪 Exercices de yoga ciblés',
      '📝 Journaling pour suivre votre progression',
    ],
    bulletPointsFr: [
      '🧘 Méditations guidées adaptées',
      '💪 Exercices de yoga ciblés',
      '📝 Journaling pour suivre votre progression',
    ],
    bulletPointsEn: [
      '🧘 Tailored guided meditations',
      '💪 Targeted yoga exercises',
      '📝 Journaling to track your progress',
    ],
    ctaText: 'Continuer',
    ctaTextFr: 'Continuer',
    ctaTextEn: 'Continue',
    backgroundColor: '#E8F4F8',
  },

  // Ecran 2: Pour debutants - Position 2 (conditionnel apres experience)
  {
    position: 2,
    order: 0,
    title: 'Parfait pour débuter !',
    titleFr: 'Parfait pour débuter !',
    titleEn: 'Perfect for beginners!',
    subtitle: 'Nous commencerons en douceur',
    subtitleFr: 'Nous commencerons en douceur',
    subtitleEn: "We'll start gently",
    content: 'Pas de pression ! Nous avons conçu des programmes spécialement pour les débutants. Vous progresserez à votre rythme.',
    contentFr: 'Pas de pression ! Nous avons conçu des programmes spécialement pour les débutants. Vous progresserez à votre rythme.',
    contentEn: "No pressure! We've designed programs specifically for beginners. You'll progress at your own pace.",
    bulletPoints: [
      '🌱 Sessions courtes (5-10 min)',
      '👥 Accompagnement pas à pas',
      '📈 Progression adaptée à votre niveau',
    ],
    bulletPointsFr: [
      '🌱 Sessions courtes (5-10 min)',
      '👥 Accompagnement pas à pas',
      '📈 Progression adaptée à votre niveau',
    ],
    bulletPointsEn: [
      '🌱 Short sessions (5-10 min)',
      '👥 Step-by-step guidance',
      '📈 Progress adapted to your level',
    ],
    displayConditions: {
      showIfExperience: 'beginner',
    },
    ctaText: 'Super !',
    ctaTextFr: 'Super !',
    ctaTextEn: 'Great!',
    backgroundColor: '#F0F8E8',
  },

  // Ecran 3: A mi-parcours - Position 3
  {
    position: 3,
    order: 0,
    title: 'Vous y êtes presque !',
    titleFr: 'Vous y êtes presque !',
    titleEn: "You're almost there!",
    subtitle: 'Plus que quelques questions',
    subtitleFr: 'Plus que quelques questions',
    subtitleEn: 'Just a few more questions',
    content: 'Vous faites un excellent travail. Ces dernières informations nous aideront à affiner votre expérience.',
    contentFr: 'Vous faites un excellent travail. Ces dernières informations nous aideront à affiner votre expérience.',
    contentEn: "You're doing great. These final details will help us refine your experience.",
    ctaText: 'Continuer',
    ctaTextFr: 'Continuer',
    ctaTextEn: 'Continue',
    backgroundColor: '#FFF4E6',
  },

  // Ecran 4: Engagement temps - Position 5 (apres question sur le temps disponible)
  {
    position: 5,
    order: 0,
    title: 'Respectons votre emploi du temps',
    titleFr: 'Respectons votre emploi du temps',
    titleEn: "Let's respect your schedule",
    subtitle: 'Votre temps est précieux',
    subtitleFr: 'Votre temps est précieux',
    subtitleEn: 'Your time is precious',
    content: 'Nous allons créer un programme qui s\'intègre parfaitement dans votre routine quotidienne. Même 5 minutes par jour peuvent faire la différence !',
    contentFr: 'Nous allons créer un programme qui s\'intègre parfaitement dans votre routine quotidienne. Même 5 minutes par jour peuvent faire la différence !',
    contentEn: "We'll create a program that fits perfectly into your daily routine. Even 5 minutes a day can make a difference!",
    bulletPoints: [
      '⏰ Sessions adaptées à votre disponibilité',
      '🔔 Rappels personnalisés',
      '📊 Progression visible même avec peu de temps',
    ],
    bulletPointsFr: [
      '⏰ Sessions adaptées à votre disponibilité',
      '🔔 Rappels personnalisés',
      '📊 Progression visible même avec peu de temps',
    ],
    bulletPointsEn: [
      '⏰ Sessions adapted to your availability',
      '🔔 Personalized reminders',
      '📊 Visible progress even with limited time',
    ],
    ctaText: 'Parfait',
    ctaTextFr: 'Parfait',
    ctaTextEn: 'Perfect',
    backgroundColor: '#F5F0FF',
  },

  // Ecran 5: Avant la fin - Position 7
  {
    position: 7,
    order: 0,
    title: 'Dernière étape !',
    titleFr: 'Dernière étape !',
    titleEn: 'Final step!',
    subtitle: 'Votre parcours personnalisé est presque prêt',
    subtitleFr: 'Votre parcours personnalisé est presque prêt',
    subtitleEn: 'Your personalized journey is almost ready',
    content: 'Plus qu\'une question et nous pourrons vous proposer les meilleurs programmes adaptés à vos besoins.',
    contentFr: 'Plus qu\'une question et nous pourrons vous proposer les meilleurs programmes adaptés à vos besoins.',
    contentEn: "Just one more question and we'll be able to suggest the best programs tailored to your needs.",
    ctaText: 'Terminer',
    ctaTextFr: 'Terminer',
    ctaTextEn: 'Finish',
    backgroundColor: '#FFE8F0',
  },

  // Ecran 6: Felicitations - Position 100 (a la fin, apres toutes les questions)
  {
    position: 100,
    order: 0,
    title: '🎉 Félicitations !',
    titleFr: '🎉 Félicitations !',
    titleEn: '🎉 Congratulations!',
    subtitle: 'Votre parcours est prêt',
    subtitleFr: 'Votre parcours est prêt',
    subtitleEn: 'Your journey is ready',
    content: 'Nous avons créé une expérience unique basée sur vos réponses. Découvrez les programmes recommandés pour vous.',
    contentFr: 'Nous avons créé une expérience unique basée sur vos réponses. Découvrez les programmes recommandés pour vous.',
    contentEn: "We've created a unique experience based on your answers. Discover the programs recommended for you.",
    bulletPoints: [
      '✅ Profil wellbeing complété',
      '🎯 Programmes personnalisés sélectionnés',
      '🚀 Prêt à commencer votre transformation',
    ],
    bulletPointsFr: [
      '✅ Profil wellbeing complété',
      '🎯 Programmes personnalisés sélectionnés',
      '🚀 Prêt à commencer votre transformation',
    ],
    bulletPointsEn: [
      '✅ Wellbeing profile completed',
      '🎯 Personalized programs selected',
      '🚀 Ready to start your transformation',
    ],
    ctaText: 'Voir mes programmes',
    ctaTextFr: 'Voir mes programmes',
    ctaTextEn: 'View my programs',
    backgroundColor: '#E8FFF0',
  },
];

async function addInformationScreens() {
  try {
    console.log('Recherche de la configuration "Decouverte de Votre Parcours Wellbeing"...');

    // Find the onboarding config by title
    const { data: configRow, error: findError } = await supabase
      .from('onboarding_configs')
      .select('*')
      .eq('title', 'Découverte de Votre Parcours Wellbeing')
      .limit(1)
      .single();

    if (findError || !configRow) {
      console.log('Configuration non trouvee. Recherche de toutes les configurations...');

      // List all configs to help user
      const { data: allConfigs, error: listError } = await supabase
        .from('onboarding_configs')
        .select('id, title, status');

      if (listError) {
        throw new Error(`Failed to list configs: ${listError.message}`);
      }

      console.log('\nConfigurations disponibles:');
      if (allConfigs && allConfigs.length > 0) {
        allConfigs.forEach((cfg) => {
          console.log(`  - ${cfg.title} (${cfg.id}) - Status: ${cfg.status}`);
        });
      } else {
        console.log('  (aucune configuration trouvee)');
      }

      return;
    }

    const configId = configRow.id;

    console.log(`Configuration trouvee: ${configId}`);
    console.log(`   Titre: ${configRow.title}`);
    console.log(`   Version: ${configRow.version}`);
    console.log(`   Status: ${configRow.status}`);
    console.log(`   Questions: ${configRow.questions?.length || 0}`);

    // Add information screens to the config
    console.log('\nAjout des ecrans d\'information...');

    const now = new Date().toISOString();
    const screensWithIds = informationScreens.map((screen, index) => ({
      ...screen,
      id: `info_screen_${Date.now()}_${index}`,
      createdAt: now,
      updatedAt: now,
    }));

    // Update the config with information screens
    const { error: updateError } = await supabase
      .from('onboarding_configs')
      .update({
        information_screens: screensWithIds,
        updated_at: now,
      })
      .eq('id', configId);

    if (updateError) {
      throw new Error(`Failed to update config: ${updateError.message}`);
    }

    console.log(`${screensWithIds.length} ecrans d'information ajoutes avec succes !`);

    console.log('\nResume des ecrans ajoutes:');
    screensWithIds.forEach((screen, index) => {
      console.log(`  ${index + 1}. "${screen.title}" - Position ${screen.position}`);
      if (screen.displayConditions) {
        console.log(`     Conditionnel: ${JSON.stringify(screen.displayConditions)}`);
      }
    });

    console.log('\nTermine ! Vous pouvez maintenant voir les ecrans dans l\'interface admin.');
    console.log(`   URL: /admin/onboarding/${configId}/information-screens`);

  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}

// Run the script
addInformationScreens()
  .then(() => {
    console.log('\nScript termine avec succes');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nErreur fatale:', error);
    process.exit(1);
  });
