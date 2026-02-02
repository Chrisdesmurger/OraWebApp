/**
 * Streak Milestone Email Template
 *
 * Sent when a user reaches a practice streak milestone (7, 14, 30, 100 days)
 * Supports FR/EN/ES with variable interpolation
 */

import { Heading, Text, Hr, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { StreakNotificationEmailProps } from '@/types/email';

export function StreakMilestoneEmail({
  recipientEmail,
  language = 'fr',
  firstName,
  streakDays,
  nextMilestone,
  badgeUrl,
  baseUrl,
  unsubscribeToken,
}: StreakNotificationEmailProps) {
  const content = emailContent[language];
  const previewText = content.preview.replace('{days}', streakDays.toString());

  const greeting = firstName
    ? content.greeting.replace('{name}', firstName)
    : content.greetingNoName;

  const dashboardUrl = `${baseUrl}/dashboard`;

  // Get milestone-specific content
  const milestoneContent = getMilestoneContent(streakDays, language);

  return (
    <EmailLayout
      previewText={previewText}
      language={language}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
      showUnsubscribe={true}
    >
      {/* Celebration icon */}
      <Section style={iconSectionStyle}>
        <div style={iconStyle}>{milestoneContent.emoji}</div>
      </Section>

      {/* Main heading */}
      <Heading style={headingStyle}>{content.heading}</Heading>

      {/* Personalized greeting */}
      <Text style={greetingStyle}>{greeting}</Text>

      {/* Streak badge */}
      <Section style={badgeSectionStyle}>
        <div style={badgeStyle}>
          <Text style={badgeNumberStyle}>{streakDays}</Text>
          <Text style={badgeLabelStyle}>{content.days}</Text>
        </div>
      </Section>

      {/* Achievement message */}
      <Text style={achievementTextStyle}>
        {milestoneContent.message}
      </Text>

      {/* Encouragement */}
      <Text style={textStyle}>{milestoneContent.encouragement}</Text>

      {/* Next milestone teaser */}
      {nextMilestone && (
        <Section style={nextMilestoneSectionStyle}>
          <Text style={nextMilestoneTextStyle}>
            {content.nextMilestone.replace('{days}', nextMilestone.toString())}
          </Text>
          <div style={progressBarContainerStyle}>
            <div
              style={{
                ...progressBarStyle,
                width: `${Math.min((streakDays / nextMilestone) * 100, 100)}%`,
              }}
            />
          </div>
          <Text style={progressTextStyle}>
            {streakDays} / {nextMilestone} {content.days}
          </Text>
        </Section>
      )}

      {/* CTA Button */}
      <Section style={buttonSectionStyle}>
        <EmailButton href={dashboardUrl} variant="primary">
          {content.buttonText}
        </EmailButton>
      </Section>

      <Hr style={hrStyle} />

      {/* Motivational quote */}
      <Section style={quoteSectionStyle}>
        <Text style={quoteTextStyle}>"{content.quote.text}"</Text>
        <Text style={quoteAuthorStyle}>— {content.quote.author}</Text>
      </Section>

      <Hr style={hrStyle} />

      {/* Help text */}
      <Text style={helpTextStyle}>{content.helpText}</Text>
    </EmailLayout>
  );
}

// ============================================================================
// Milestone-specific content
// ============================================================================

interface MilestoneContent {
  emoji: string;
  message: string;
  encouragement: string;
}

function getMilestoneContent(days: number, language: SupportedLanguage): MilestoneContent {
  const milestones: Record<SupportedLanguage, Record<string, MilestoneContent>> = {
    fr: {
      '7': {
        emoji: '🌟',
        message: 'Une semaine complete de pratique ! Vous avez pose les fondations d\'une habitude saine.',
        encouragement: 'La regularite est la cle du progres. Continuez ainsi !',
      },
      '14': {
        emoji: '🔥',
        message: 'Deux semaines de suite ! Votre dedication est inspirante.',
        encouragement: 'Vous commencez a ressentir les bienfaits de la pratique reguliere.',
      },
      '30': {
        emoji: '🏆',
        message: 'Un mois complet ! Vous avez officiellement cree une nouvelle habitude.',
        encouragement: 'Les etudes montrent qu\'il faut environ 30 jours pour ancrer une habitude. Bravo !',
      },
      '100': {
        emoji: '💎',
        message: '100 jours consecutifs ! Vous etes un veritable yogi !',
        encouragement: 'Votre engagement est exceptionnel. Vous inspirez toute la communaute Ora.',
      },
      default: {
        emoji: '⭐',
        message: `${days} jours de pratique consecutive ! Felicitations !`,
        encouragement: 'Chaque jour compte. Continuez votre beau parcours.',
      },
    },
    en: {
      '7': {
        emoji: '🌟',
        message: 'One full week of practice! You\'ve laid the foundation for a healthy habit.',
        encouragement: 'Consistency is the key to progress. Keep it up!',
      },
      '14': {
        emoji: '🔥',
        message: 'Two weeks in a row! Your dedication is inspiring.',
        encouragement: 'You\'re starting to feel the benefits of regular practice.',
      },
      '30': {
        emoji: '🏆',
        message: 'A full month! You\'ve officially created a new habit.',
        encouragement: 'Studies show it takes about 30 days to form a habit. Well done!',
      },
      '100': {
        emoji: '💎',
        message: '100 consecutive days! You\'re a true yogi!',
        encouragement: 'Your commitment is exceptional. You inspire the entire Ora community.',
      },
      default: {
        emoji: '⭐',
        message: `${days} days of consecutive practice! Congratulations!`,
        encouragement: 'Every day counts. Keep up your beautiful journey.',
      },
    },
    es: {
      '7': {
        emoji: '🌟',
        message: 'Una semana completa de practica! Has sentado las bases de un habito saludable.',
        encouragement: 'La constancia es la clave del progreso. Sigue asi!',
      },
      '14': {
        emoji: '🔥',
        message: 'Dos semanas seguidas! Tu dedicacion es inspiradora.',
        encouragement: 'Estas empezando a sentir los beneficios de la practica regular.',
      },
      '30': {
        emoji: '🏆',
        message: 'Un mes completo! Oficialmente has creado un nuevo habito.',
        encouragement: 'Los estudios muestran que se necesitan unos 30 dias para formar un habito. Bien hecho!',
      },
      '100': {
        emoji: '💎',
        message: '100 dias consecutivos! Eres un verdadero yogi!',
        encouragement: 'Tu compromiso es excepcional. Inspiras a toda la comunidad Ora.',
      },
      default: {
        emoji: '⭐',
        message: `${days} dias de practica consecutiva! Felicidades!`,
        encouragement: 'Cada dia cuenta. Continua tu hermoso camino.',
      },
    },
  };

  const key = [7, 14, 30, 100].includes(days) ? days.toString() : 'default';
  return milestones[language][key];
}

// ============================================================================
// Content
// ============================================================================

interface EmailContentType {
  preview: string;
  heading: string;
  greeting: string;
  greetingNoName: string;
  days: string;
  nextMilestone: string;
  buttonText: string;
  quote: {
    text: string;
    author: string;
  };
  helpText: string;
}

const emailContent: Record<SupportedLanguage, EmailContentType> = {
  fr: {
    preview: 'Felicitations ! {days} jours de pratique consecutive',
    heading: 'Bravo !',
    greeting: 'Felicitations {name} !',
    greetingNoName: 'Felicitations !',
    days: 'jours',
    nextMilestone: 'Prochain objectif : {days} jours',
    buttonText: 'Continuer ma serie',
    quote: {
      text: 'La pratique constante apporte la perfection.',
      author: 'Patanjali',
    },
    helpText: 'Partagez votre reussite avec vos proches !',
  },
  en: {
    preview: 'Congratulations! {days} days of consecutive practice',
    heading: 'Well done!',
    greeting: 'Congratulations {name}!',
    greetingNoName: 'Congratulations!',
    days: 'days',
    nextMilestone: 'Next goal: {days} days',
    buttonText: 'Continue my streak',
    quote: {
      text: 'Constant practice brings perfection.',
      author: 'Patanjali',
    },
    helpText: 'Share your achievement with loved ones!',
  },
  es: {
    preview: 'Felicidades! {days} dias de practica consecutiva',
    heading: 'Bien hecho!',
    greeting: 'Felicidades {name}!',
    greetingNoName: 'Felicidades!',
    days: 'dias',
    nextMilestone: 'Proximo objetivo: {days} dias',
    buttonText: 'Continuar mi racha',
    quote: {
      text: 'La practica constante trae la perfeccion.',
      author: 'Patanjali',
    },
    helpText: 'Comparte tu logro con tus seres queridos!',
  },
};

// ============================================================================
// Styles
// ============================================================================

const iconSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '16px',
};

const iconStyle: React.CSSProperties = {
  fontSize: '56px',
  lineHeight: '1',
};

const headingStyle: React.CSSProperties = {
  color: '#ea580c',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const greetingStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '500',
  margin: '0 0 24px 0',
  textAlign: 'center',
};

const badgeSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '24px 0',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  borderRadius: '50%',
  width: '120px',
  height: '120px',
  padding: '20px',
  boxShadow: '0 8px 24px rgba(234, 88, 12, 0.3)',
};

const badgeNumberStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '42px',
  fontWeight: '700',
  margin: '0',
  lineHeight: '1',
};

const badgeLabelStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '14px',
  fontWeight: '500',
  margin: '4px 0 0 0',
  textTransform: 'uppercase',
};

const achievementTextStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '500',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const textStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
  textAlign: 'center',
};

const nextMilestoneSectionStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center',
};

const nextMilestoneTextStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const progressBarContainerStyle: React.CSSProperties = {
  backgroundColor: '#e5e7eb',
  borderRadius: '9999px',
  height: '8px',
  overflow: 'hidden',
  margin: '0 0 8px 0',
};

const progressBarStyle: React.CSSProperties = {
  backgroundColor: '#ea580c',
  height: '100%',
  borderRadius: '9999px',
  transition: 'width 0.3s ease',
};

const progressTextStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
};

const buttonSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '32px 0',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const quoteSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '16px',
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
};

const quoteTextStyle: React.CSSProperties = {
  color: '#92400e',
  fontSize: '16px',
  fontStyle: 'italic',
  lineHeight: '1.5',
  margin: '0 0 8px 0',
};

const quoteAuthorStyle: React.CSSProperties = {
  color: '#b45309',
  fontSize: '14px',
  margin: 0,
};

const helpTextStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '1.5',
  textAlign: 'center',
};

// Export for preview
export default StreakMilestoneEmail;
