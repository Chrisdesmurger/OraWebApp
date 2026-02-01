/**
 * Weekly Digest Email Template
 *
 * Sent weekly with user's activity summary and new content
 * Supports FR/EN/ES with variable interpolation
 */

import { Heading, Text, Hr, Section, Img } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { WeeklyDigestEmailProps } from '@/types/email';

export function WeeklyDigestEmail({
  recipientEmail,
  language = 'fr',
  firstName,
  weekStartDate,
  weekEndDate,
  newContent,
  lessonsCompleted = 0,
  minutesPracticed = 0,
  currentStreak = 0,
  tips,
  baseUrl,
  unsubscribeToken,
}: WeeklyDigestEmailProps) {
  const content = emailContent[language];
  const previewText = content.preview;

  const greeting = firstName
    ? content.greeting.replace('{name}', firstName)
    : content.greetingNoName;

  const dashboardUrl = `${baseUrl}/dashboard`;

  return (
    <EmailLayout
      previewText={previewText}
      language={language}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
      showUnsubscribe={true}
    >
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={dateRangeStyle}>
          {weekStartDate} - {weekEndDate}
        </Text>
        <Heading style={headingStyle}>{content.heading}</Heading>
        <Text style={greetingStyle}>{greeting}</Text>
      </Section>

      {/* Stats summary */}
      <Section style={statsSectionStyle}>
        <Text style={statsHeadingStyle}>{content.yourWeek}</Text>
        <div style={statsGridStyle}>
          <div style={statItemStyle}>
            <Text style={statValueStyle}>{lessonsCompleted}</Text>
            <Text style={statLabelStyle}>{content.lessonsCompleted}</Text>
          </div>
          <div style={statItemStyle}>
            <Text style={statValueStyle}>{minutesPracticed}</Text>
            <Text style={statLabelStyle}>{content.minutesPracticed}</Text>
          </div>
          <div style={statItemStyle}>
            <Text style={statValueStyle}>{currentStreak}</Text>
            <Text style={statLabelStyle}>{content.dayStreak}</Text>
          </div>
        </div>
      </Section>

      {/* Encouragement based on activity */}
      {lessonsCompleted > 0 ? (
        <Text style={encouragementStyle}>{content.activeEncouragement}</Text>
      ) : (
        <Text style={encouragementStyle}>{content.inactiveEncouragement}</Text>
      )}

      {/* New content section */}
      {newContent && newContent.length > 0 && (
        <>
          <Hr style={hrStyle} />
          <Section style={newContentSectionStyle}>
            <Text style={sectionHeadingStyle}>{content.newThisWeek}</Text>
            {newContent.slice(0, 3).map((item) => (
              <div key={item.id} style={contentItemStyle}>
                {item.imageUrl && (
                  <Img
                    src={item.imageUrl}
                    alt={item.title}
                    width="60"
                    height="60"
                    style={contentImageStyle}
                  />
                )}
                <div style={contentInfoStyle}>
                  <Text style={contentTypeStyle}>
                    {item.type === 'lesson' ? content.lesson : content.program}
                  </Text>
                  <Text style={contentTitleStyle}>{item.title}</Text>
                </div>
              </div>
            ))}
          </Section>
        </>
      )}

      {/* CTA Button */}
      <Section style={buttonSectionStyle}>
        <EmailButton href={dashboardUrl} variant="primary">
          {content.goToDashboard}
        </EmailButton>
      </Section>

      {/* Tips section */}
      {tips && tips.length > 0 && (
        <>
          <Hr style={hrStyle} />
          <Section style={tipsSectionStyle}>
            <Text style={sectionHeadingStyle}>{content.weeklyTip}</Text>
            {tips.slice(0, 2).map((tip, index) => (
              <div key={index} style={tipItemStyle}>
                <span style={tipIconStyle}>💡</span>
                <Text style={tipTextStyle}>{tip}</Text>
              </div>
            ))}
          </Section>
        </>
      )}

      <Hr style={hrStyle} />

      {/* Help text */}
      <Text style={helpTextStyle}>{content.helpText}</Text>
    </EmailLayout>
  );
}

// ============================================================================
// Content
// ============================================================================

interface EmailContentType {
  preview: string;
  heading: string;
  greeting: string;
  greetingNoName: string;
  yourWeek: string;
  lessonsCompleted: string;
  minutesPracticed: string;
  dayStreak: string;
  activeEncouragement: string;
  inactiveEncouragement: string;
  newThisWeek: string;
  lesson: string;
  program: string;
  goToDashboard: string;
  weeklyTip: string;
  helpText: string;
}

const emailContent: Record<SupportedLanguage, EmailContentType> = {
  fr: {
    preview: 'Votre resume hebdomadaire Ora est arrive',
    heading: 'Votre semaine en resume',
    greeting: 'Bonjour {name},',
    greetingNoName: 'Bonjour,',
    yourWeek: 'Cette semaine',
    lessonsCompleted: 'lecons',
    minutesPracticed: 'minutes',
    dayStreak: 'jours de suite',
    activeEncouragement: 'Bravo pour votre pratique cette semaine ! Continuez sur cette lancee.',
    inactiveEncouragement: 'Cette semaine a ete calme. Pourquoi ne pas reprendre avec une courte seance ?',
    newThisWeek: 'Nouveau cette semaine',
    lesson: 'Lecon',
    program: 'Programme',
    goToDashboard: 'Voir mon tableau de bord',
    weeklyTip: 'Conseil de la semaine',
    helpText: 'Vous recevez cet email car vous etes abonne au resume hebdomadaire.',
  },
  en: {
    preview: 'Your weekly Ora digest has arrived',
    heading: 'Your week in review',
    greeting: 'Hello {name},',
    greetingNoName: 'Hello,',
    yourWeek: 'This week',
    lessonsCompleted: 'lessons',
    minutesPracticed: 'minutes',
    dayStreak: 'day streak',
    activeEncouragement: 'Great job on your practice this week! Keep up the momentum.',
    inactiveEncouragement: 'It was a quiet week. Why not start fresh with a short session?',
    newThisWeek: 'New this week',
    lesson: 'Lesson',
    program: 'Program',
    goToDashboard: 'Go to my dashboard',
    weeklyTip: 'Weekly tip',
    helpText: 'You receive this email because you\'re subscribed to the weekly digest.',
  },
  es: {
    preview: 'Tu resumen semanal de Ora ha llegado',
    heading: 'Tu semana en resumen',
    greeting: 'Hola {name},',
    greetingNoName: 'Hola,',
    yourWeek: 'Esta semana',
    lessonsCompleted: 'lecciones',
    minutesPracticed: 'minutos',
    dayStreak: 'dias seguidos',
    activeEncouragement: 'Buen trabajo con tu practica esta semana! Sigue con el impulso.',
    inactiveEncouragement: 'Fue una semana tranquila. Por que no empezar de nuevo con una sesion corta?',
    newThisWeek: 'Nuevo esta semana',
    lesson: 'Leccion',
    program: 'Programa',
    goToDashboard: 'Ir a mi panel',
    weeklyTip: 'Consejo de la semana',
    helpText: 'Recibes este correo porque estas suscrito al resumen semanal.',
  },
};

// ============================================================================
// Styles
// ============================================================================

const headerSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '24px',
};

const dateRangeStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  fontWeight: '500',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const headingStyle: React.CSSProperties = {
  color: '#ea580c',
  fontSize: '28px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const greetingStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '16px',
  margin: '0',
};

const statsSectionStyle: React.CSSProperties = {
  backgroundColor: '#fff7ed',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center',
};

const statsHeadingStyle: React.CSSProperties = {
  color: '#c2410c',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: '0 0 16px 0',
};

const statsGridStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around',
};

const statItemStyle: React.CSSProperties = {
  flex: 1,
  textAlign: 'center',
};

const statValueStyle: React.CSSProperties = {
  color: '#ea580c',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
  lineHeight: '1',
};

const statLabelStyle: React.CSSProperties = {
  color: '#9a3412',
  fontSize: '12px',
  margin: '4px 0 0 0',
};

const encouragementStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  textAlign: 'center',
  margin: '0 0 24px 0',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const newContentSectionStyle: React.CSSProperties = {
  margin: '24px 0',
};

const sectionHeadingStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const contentItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '12px',
  padding: '12px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
};

const contentImageStyle: React.CSSProperties = {
  borderRadius: '6px',
  objectFit: 'cover',
  marginRight: '12px',
};

const contentInfoStyle: React.CSSProperties = {
  flex: 1,
};

const contentTypeStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  fontWeight: '500',
  margin: '0 0 2px 0',
  textTransform: 'uppercase',
};

const contentTitleStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: 0,
};

const buttonSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '32px 0',
};

const tipsSectionStyle: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const tipItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '10px',
};

const tipIconStyle: React.CSSProperties = {
  fontSize: '16px',
  marginRight: '10px',
  flexShrink: 0,
};

const tipTextStyle: React.CSSProperties = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
};

const helpTextStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '1.5',
  textAlign: 'center',
};

// Export for preview
export default WeeklyDigestEmail;
