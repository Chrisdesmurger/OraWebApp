/**
 * New Content Email Template
 *
 * Sent when new content (lessons/programs) is published
 * Supports FR/EN/ES with variable interpolation
 */

import { Heading, Text, Hr, Section, Img } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { NewContentEmailProps } from '@/types/email';

export function NewContentEmail({
  recipientEmail,
  language = 'fr',
  contentTitle,
  contentType,
  contentUrl,
  contentDescription,
  contentImageUrl,
  authorName,
  baseUrl,
  unsubscribeToken,
}: NewContentEmailProps) {
  const content = emailContent[language];
  const previewText = content.preview.replace('{title}', contentTitle);

  const typeLabel = contentType === 'lesson' ? content.newLesson : content.newProgram;

  return (
    <EmailLayout
      previewText={previewText}
      language={language}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
      showUnsubscribe={true}
    >
      {/* New badge */}
      <Section style={badgeSectionStyle}>
        <span style={badgeStyle}>{content.newBadge}</span>
      </Section>

      {/* Main heading */}
      <Heading style={headingStyle}>{typeLabel}</Heading>

      {/* Content card */}
      <Section style={contentCardStyle}>
        {contentImageUrl && (
          <Img
            src={contentImageUrl}
            alt={contentTitle}
            width="100%"
            height="200"
            style={contentImageStyle}
          />
        )}
        <div style={contentInfoStyle}>
          <Text style={contentTitleStyle}>{contentTitle}</Text>
          {contentDescription && (
            <Text style={contentDescriptionStyle}>{contentDescription}</Text>
          )}
          {authorName && (
            <Text style={authorStyle}>
              {content.by} {authorName}
            </Text>
          )}
        </div>
      </Section>

      {/* Introduction text */}
      <Text style={textStyle}>{content.intro}</Text>

      {/* CTA Button */}
      <Section style={buttonSectionStyle}>
        <EmailButton href={contentUrl} variant="primary">
          {contentType === 'lesson' ? content.watchLesson : content.viewProgram}
        </EmailButton>
      </Section>

      <Hr style={hrStyle} />

      {/* What to expect */}
      {contentType === 'lesson' && (
        <Section style={expectSectionStyle}>
          <Text style={expectHeadingStyle}>{content.whatToExpect}</Text>
          <div style={expectItemStyle}>
            <span style={expectIconStyle}>🧘</span>
            <span style={expectTextStyle}>{content.expect1}</span>
          </div>
          <div style={expectItemStyle}>
            <span style={expectIconStyle}>🎯</span>
            <span style={expectTextStyle}>{content.expect2}</span>
          </div>
          <div style={expectItemStyle}>
            <span style={expectIconStyle}>✨</span>
            <span style={expectTextStyle}>{content.expect3}</span>
          </div>
        </Section>
      )}

      {contentType === 'program' && (
        <Section style={expectSectionStyle}>
          <Text style={expectHeadingStyle}>{content.programIncludes}</Text>
          <div style={expectItemStyle}>
            <span style={expectIconStyle}>📚</span>
            <span style={expectTextStyle}>{content.programFeature1}</span>
          </div>
          <div style={expectItemStyle}>
            <span style={expectIconStyle}>🎓</span>
            <span style={expectTextStyle}>{content.programFeature2}</span>
          </div>
          <div style={expectItemStyle}>
            <span style={expectIconStyle}>📈</span>
            <span style={expectTextStyle}>{content.programFeature3}</span>
          </div>
        </Section>
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
  newBadge: string;
  newLesson: string;
  newProgram: string;
  by: string;
  intro: string;
  watchLesson: string;
  viewProgram: string;
  whatToExpect: string;
  expect1: string;
  expect2: string;
  expect3: string;
  programIncludes: string;
  programFeature1: string;
  programFeature2: string;
  programFeature3: string;
  helpText: string;
}

const emailContent: Record<SupportedLanguage, EmailContentType> = {
  fr: {
    preview: 'Nouveau contenu disponible : {title}',
    newBadge: 'NOUVEAU',
    newLesson: 'Nouvelle lecon disponible',
    newProgram: 'Nouveau programme disponible',
    by: 'Par',
    intro: 'Nous avons ajoute du nouveau contenu specialement pour vous. Decouvrez-le maintenant !',
    watchLesson: 'Regarder la lecon',
    viewProgram: 'Decouvrir le programme',
    whatToExpect: 'Ce qui vous attend :',
    expect1: 'Des instructions claires et detaillees',
    expect2: 'Des exercices adaptes a votre niveau',
    expect3: 'Des conseils d\'experts pour progresser',
    programIncludes: 'Ce programme comprend :',
    programFeature1: 'Plusieurs lecons structurees',
    programFeature2: 'Une progression adaptee',
    programFeature3: 'Un suivi de vos progres',
    helpText: 'Vous pouvez gerer vos preferences de notification dans les parametres de votre compte.',
  },
  en: {
    preview: 'New content available: {title}',
    newBadge: 'NEW',
    newLesson: 'New lesson available',
    newProgram: 'New program available',
    by: 'By',
    intro: 'We\'ve added new content just for you. Discover it now!',
    watchLesson: 'Watch the lesson',
    viewProgram: 'Discover the program',
    whatToExpect: 'What to expect:',
    expect1: 'Clear and detailed instructions',
    expect2: 'Exercises suited to your level',
    expect3: 'Expert tips to help you progress',
    programIncludes: 'This program includes:',
    programFeature1: 'Multiple structured lessons',
    programFeature2: 'Adapted progression',
    programFeature3: 'Track your progress',
    helpText: 'You can manage your notification preferences in your account settings.',
  },
  es: {
    preview: 'Nuevo contenido disponible: {title}',
    newBadge: 'NUEVO',
    newLesson: 'Nueva leccion disponible',
    newProgram: 'Nuevo programa disponible',
    by: 'Por',
    intro: 'Hemos agregado nuevo contenido especialmente para ti. Descubrelo ahora!',
    watchLesson: 'Ver la leccion',
    viewProgram: 'Descubrir el programa',
    whatToExpect: 'Que te espera:',
    expect1: 'Instrucciones claras y detalladas',
    expect2: 'Ejercicios adaptados a tu nivel',
    expect3: 'Consejos de expertos para progresar',
    programIncludes: 'Este programa incluye:',
    programFeature1: 'Multiples lecciones estructuradas',
    programFeature2: 'Progresion adaptada',
    programFeature3: 'Seguimiento de tu progreso',
    helpText: 'Puedes gestionar tus preferencias de notificacion en la configuracion de tu cuenta.',
  },
};

// ============================================================================
// Styles
// ============================================================================

const badgeSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '16px',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#ea580c',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: '700',
  padding: '4px 12px',
  borderRadius: '9999px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const headingStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 24px 0',
  textAlign: 'center',
};

const contentCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  border: '1px solid #e5e7eb',
  margin: '24px 0',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
};

const contentImageStyle: React.CSSProperties = {
  objectFit: 'cover',
  width: '100%',
};

const contentInfoStyle: React.CSSProperties = {
  padding: '20px',
};

const contentTitleStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const contentDescriptionStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 12px 0',
};

const authorStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  margin: '0',
};

const textStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
  textAlign: 'center',
};

const buttonSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '24px 0',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const expectSectionStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const expectHeadingStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const expectItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px',
};

const expectIconStyle: React.CSSProperties = {
  fontSize: '16px',
  marginRight: '10px',
};

const expectTextStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '14px',
};

const helpTextStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '1.5',
  textAlign: 'center',
};

// Export for preview
export default NewContentEmail;
