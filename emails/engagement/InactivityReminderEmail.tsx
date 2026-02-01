/**
 * Inactivity Reminder Email Template
 *
 * Sent when a user has been inactive for 7 or 30 days
 * Supports FR/EN/ES with variable interpolation
 */

import { Heading, Text, Hr, Section, Img } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { InactivityReminderEmailProps } from '@/types/email';

export function InactivityReminderEmail({
  recipientEmail,
  language = 'fr',
  firstName,
  lastActivityDate,
  suggestedContent,
  baseUrl,
  unsubscribeToken,
}: InactivityReminderEmailProps) {
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
      {/* Friendly icon */}
      <Section style={iconSectionStyle}>
        <div style={iconStyle}>🌿</div>
      </Section>

      {/* Main heading */}
      <Heading style={headingStyle}>{content.heading}</Heading>

      {/* Personalized greeting */}
      <Text style={greetingStyle}>{greeting}</Text>

      {/* Message */}
      <Text style={textStyle}>
        {content.message.replace('{date}', lastActivityDate)}
      </Text>

      <Text style={textStyle}>{content.encouragement}</Text>

      {/* Suggested content */}
      {suggestedContent && suggestedContent.length > 0 && (
        <Section style={suggestionsSectionStyle}>
          <Text style={suggestionsLabelStyle}>{content.suggestionsLabel}</Text>

          {suggestedContent.slice(0, 3).map((item, index) => (
            <div key={item.id} style={suggestionItemStyle}>
              {item.imageUrl && (
                <Img
                  src={item.imageUrl}
                  alt={item.title}
                  width="60"
                  height="60"
                  style={suggestionImageStyle}
                />
              )}
              <div style={suggestionInfoStyle}>
                <Text style={suggestionTypeStyle}>
                  {item.type === 'lesson' ? content.lesson : content.program}
                </Text>
                <Text style={suggestionTitleStyle}>{item.title}</Text>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* CTA Button */}
      <Section style={buttonSectionStyle}>
        <EmailButton href={dashboardUrl} variant="primary">
          {content.buttonText}
        </EmailButton>
      </Section>

      {/* Benefits reminder */}
      <Section style={benefitsSectionStyle}>
        <Text style={benefitsHeadingStyle}>{content.benefits.heading}</Text>
        <div style={benefitItemStyle}>
          <span style={benefitIconStyle}>✨</span>
          <span style={benefitTextStyle}>{content.benefits.item1}</span>
        </div>
        <div style={benefitItemStyle}>
          <span style={benefitIconStyle}>🧘</span>
          <span style={benefitTextStyle}>{content.benefits.item2}</span>
        </div>
        <div style={benefitItemStyle}>
          <span style={benefitIconStyle}>💪</span>
          <span style={benefitTextStyle}>{content.benefits.item3}</span>
        </div>
      </Section>

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
  message: string;
  encouragement: string;
  suggestionsLabel: string;
  lesson: string;
  program: string;
  buttonText: string;
  benefits: {
    heading: string;
    item1: string;
    item2: string;
    item3: string;
  };
  helpText: string;
}

const emailContent: Record<SupportedLanguage, EmailContentType> = {
  fr: {
    preview: 'Votre pratique vous attend - reprenez la ou vous vous etiez arrete',
    heading: 'Vous nous manquez !',
    greeting: 'Bonjour {name},',
    greetingNoName: 'Bonjour,',
    message: 'Votre derniere visite remonte au {date}. Votre tapis vous attend !',
    encouragement: 'Meme quelques minutes de pratique peuvent faire une grande difference dans votre journee. Pourquoi ne pas reprendre maintenant ?',
    suggestionsLabel: 'Pour vous remettre en selle :',
    lesson: 'Lecon',
    program: 'Programme',
    buttonText: 'Reprendre ma pratique',
    benefits: {
      heading: 'Rappelez-vous pourquoi vous avez commence :',
      item1: 'Reduire le stress et l\'anxiete',
      item2: 'Ameliorer votre flexibilite et votre force',
      item3: 'Cultiver la paix interieure',
    },
    helpText: 'Trop occupe ? Essayez nos seances de 5 minutes pour commencer en douceur.',
  },
  en: {
    preview: 'Your practice awaits - pick up where you left off',
    heading: 'We miss you!',
    greeting: 'Hello {name},',
    greetingNoName: 'Hello,',
    message: 'Your last visit was on {date}. Your mat is waiting for you!',
    encouragement: 'Even a few minutes of practice can make a big difference in your day. Why not start again now?',
    suggestionsLabel: 'To get you back on track:',
    lesson: 'Lesson',
    program: 'Program',
    buttonText: 'Resume my practice',
    benefits: {
      heading: 'Remember why you started:',
      item1: 'Reduce stress and anxiety',
      item2: 'Improve your flexibility and strength',
      item3: 'Cultivate inner peace',
    },
    helpText: 'Too busy? Try our 5-minute sessions to start gently.',
  },
  es: {
    preview: 'Tu practica te espera - retoma donde lo dejaste',
    heading: 'Te echamos de menos!',
    greeting: 'Hola {name},',
    greetingNoName: 'Hola,',
    message: 'Tu ultima visita fue el {date}. Tu tapete te esta esperando!',
    encouragement: 'Incluso unos minutos de practica pueden hacer una gran diferencia en tu dia. Por que no empezar de nuevo ahora?',
    suggestionsLabel: 'Para retomar el camino:',
    lesson: 'Leccion',
    program: 'Programa',
    buttonText: 'Retomar mi practica',
    benefits: {
      heading: 'Recuerda por que empezaste:',
      item1: 'Reducir el estres y la ansiedad',
      item2: 'Mejorar tu flexibilidad y fuerza',
      item3: 'Cultivar la paz interior',
    },
    helpText: 'Muy ocupado? Prueba nuestras sesiones de 5 minutos para empezar suavemente.',
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
  fontSize: '48px',
  lineHeight: '1',
};

const headingStyle: React.CSSProperties = {
  color: '#ea580c',
  fontSize: '28px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const greetingStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '500',
  margin: '0 0 8px 0',
};

const textStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
};

const suggestionsSectionStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const suggestionsLabelStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const suggestionItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '12px',
  padding: '12px',
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
};

const suggestionImageStyle: React.CSSProperties = {
  borderRadius: '6px',
  objectFit: 'cover',
  marginRight: '12px',
};

const suggestionInfoStyle: React.CSSProperties = {
  flex: 1,
};

const suggestionTypeStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  fontWeight: '500',
  margin: '0 0 2px 0',
  textTransform: 'uppercase',
};

const suggestionTitleStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: 0,
};

const buttonSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '32px 0',
};

const benefitsSectionStyle: React.CSSProperties = {
  backgroundColor: '#fff7ed',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const benefitsHeadingStyle: React.CSSProperties = {
  color: '#c2410c',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const benefitItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '8px',
};

const benefitIconStyle: React.CSSProperties = {
  fontSize: '16px',
  marginRight: '10px',
};

const benefitTextStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '14px',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const helpTextStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '1.5',
  textAlign: 'center',
};

// Export for preview
export default InactivityReminderEmail;
