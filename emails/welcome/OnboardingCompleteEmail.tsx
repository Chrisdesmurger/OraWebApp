/**
 * Onboarding Complete Email Template
 *
 * Sent when a user completes the onboarding questionnaire
 * Shows personalized program recommendations
 * Supports FR/EN/ES with variable interpolation
 */

import { Heading, Text, Hr, Section, Img, Row, Column } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { OnboardingCompleteEmailProps } from '@/types/email';

export function OnboardingCompleteEmail({
  recipientEmail,
  language = 'fr',
  firstName,
  recommendedPrograms,
  firstLessonUrl,
  baseUrl,
}: OnboardingCompleteEmailProps) {
  const content = emailContent[language];
  const previewText = content.preview;

  // Personalize greeting if we have the first name
  const greeting = firstName
    ? content.greeting.replace('{name}', firstName)
    : content.greetingNoName;

  return (
    <EmailLayout
      previewText={previewText}
      language={language}
      recipientEmail={recipientEmail}
      showUnsubscribe={true}
    >
      {/* Success icon */}
      <Section style={iconSectionStyle}>
        <div style={iconStyle}>✨</div>
      </Section>

      {/* Main heading */}
      <Heading style={headingStyle}>{content.heading}</Heading>

      {/* Personalized greeting */}
      <Text style={greetingStyle}>{greeting}</Text>

      {/* Introduction */}
      <Text style={textStyle}>{content.intro}</Text>

      {/* Personalization message */}
      <Section style={personalizationSectionStyle}>
        <Text style={personalizationTextStyle}>{content.personalizationNote}</Text>
      </Section>

      {/* Recommended Programs */}
      {recommendedPrograms && recommendedPrograms.length > 0 && (
        <Section style={recommendationsSectionStyle}>
          <Text style={recommendationsLabelStyle}>{content.recommendedForYou}</Text>

          {recommendedPrograms.slice(0, 3).map((program, index) => (
            <div key={program.id} style={programCardStyle}>
              {program.imageUrl && (
                <Img
                  src={program.imageUrl}
                  alt={program.title}
                  width="80"
                  height="80"
                  style={programImageStyle}
                />
              )}
              <div style={programInfoStyle}>
                <Text style={programNumberStyle}>
                  {content.program} {index + 1}
                </Text>
                <Text style={programTitleStyle}>{program.title}</Text>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* CTA Button */}
      <Section style={buttonSectionStyle}>
        <EmailButton href={firstLessonUrl} variant="primary">
          {content.startButtonText}
        </EmailButton>
      </Section>

      <Hr style={hrStyle} />

      {/* What to expect */}
      <Text style={sectionHeadingStyle}>{content.whatToExpect.heading}</Text>

      <div style={expectationItemStyle}>
        <span style={expectationIconStyle}>1</span>
        <div style={expectationContentStyle}>
          <Text style={expectationTitleStyle}>{content.whatToExpect.step1Title}</Text>
          <Text style={expectationDescStyle}>{content.whatToExpect.step1Desc}</Text>
        </div>
      </div>

      <div style={expectationItemStyle}>
        <span style={expectationIconStyle}>2</span>
        <div style={expectationContentStyle}>
          <Text style={expectationTitleStyle}>{content.whatToExpect.step2Title}</Text>
          <Text style={expectationDescStyle}>{content.whatToExpect.step2Desc}</Text>
        </div>
      </div>

      <div style={expectationItemStyle}>
        <span style={expectationIconStyle}>3</span>
        <div style={expectationContentStyle}>
          <Text style={expectationTitleStyle}>{content.whatToExpect.step3Title}</Text>
          <Text style={expectationDescStyle}>{content.whatToExpect.step3Desc}</Text>
        </div>
      </div>

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
// Content
// ============================================================================

interface EmailContentType {
  preview: string;
  heading: string;
  greeting: string;
  greetingNoName: string;
  intro: string;
  personalizationNote: string;
  recommendedForYou: string;
  program: string;
  startButtonText: string;
  whatToExpect: {
    heading: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
  };
  quote: {
    text: string;
    author: string;
  };
  helpText: string;
}

const emailContent: Record<SupportedLanguage, EmailContentType> = {
  fr: {
    preview: 'Votre parcours personnalise est pret - decouvrez vos recommandations',
    heading: 'Votre parcours est pret !',
    greeting: 'Felicitations {name} !',
    greetingNoName: 'Felicitations !',
    intro:
      "Vous avez complete votre questionnaire d'onboarding. Nous avons analyse vos reponses pour creer un parcours qui vous correspond.",
    personalizationNote:
      'Vos recommandations sont basees sur vos objectifs, votre niveau et vos preferences. Elles evolueront au fil de votre pratique.',
    recommendedForYou: 'Recommande pour vous',
    program: 'Programme',
    startButtonText: 'Commencer ma premiere lecon',
    whatToExpect: {
      heading: 'Les prochaines etapes',
      step1Title: 'Explorez vos recommandations',
      step1Desc:
        'Parcourez les programmes suggeres et choisissez celui qui vous inspire le plus.',
      step2Title: 'Suivez votre premiere lecon',
      step2Desc:
        "Commencez par une courte session. L'important est de faire le premier pas.",
      step3Title: 'Creez votre routine',
      step3Desc:
        'Definissez des rappels et integrez la pratique dans votre quotidien.',
    },
    quote: {
      text: 'Le voyage de mille lieues commence par un seul pas.',
      author: 'Lao Tseu',
    },
    helpText:
      "Des questions sur vos recommandations ? Notre equipe est la pour vous guider. Repondez a cet email.",
  },
  en: {
    preview: 'Your personalized journey is ready - discover your recommendations',
    heading: 'Your journey is ready!',
    greeting: 'Congratulations {name}!',
    greetingNoName: 'Congratulations!',
    intro:
      "You've completed your onboarding questionnaire. We've analyzed your answers to create a journey that fits you.",
    personalizationNote:
      'Your recommendations are based on your goals, level, and preferences. They will evolve as you practice.',
    recommendedForYou: 'Recommended for you',
    program: 'Program',
    startButtonText: 'Start my first lesson',
    whatToExpect: {
      heading: 'Next steps',
      step1Title: 'Explore your recommendations',
      step1Desc:
        'Browse the suggested programs and choose the one that inspires you most.',
      step2Title: 'Take your first lesson',
      step2Desc:
        'Start with a short session. The important thing is to take the first step.',
      step3Title: 'Create your routine',
      step3Desc:
        'Set reminders and integrate practice into your daily life.',
    },
    quote: {
      text: 'A journey of a thousand miles begins with a single step.',
      author: 'Lao Tzu',
    },
    helpText:
      'Questions about your recommendations? Our team is here to guide you. Reply to this email.',
  },
  es: {
    preview: 'Tu viaje personalizado esta listo - descubre tus recomendaciones',
    heading: 'Tu viaje esta listo!',
    greeting: 'Felicidades {name}!',
    greetingNoName: 'Felicidades!',
    intro:
      'Has completado tu cuestionario de incorporacion. Hemos analizado tus respuestas para crear un viaje que se adapte a ti.',
    personalizationNote:
      'Tus recomendaciones se basan en tus objetivos, nivel y preferencias. Evolucionaran a medida que practiques.',
    recommendedForYou: 'Recomendado para ti',
    program: 'Programa',
    startButtonText: 'Comenzar mi primera leccion',
    whatToExpect: {
      heading: 'Proximos pasos',
      step1Title: 'Explora tus recomendaciones',
      step1Desc:
        'Navega por los programas sugeridos y elige el que mas te inspire.',
      step2Title: 'Toma tu primera leccion',
      step2Desc:
        'Comienza con una sesion corta. Lo importante es dar el primer paso.',
      step3Title: 'Crea tu rutina',
      step3Desc:
        'Establece recordatorios e integra la practica en tu vida diaria.',
    },
    quote: {
      text: 'Un viaje de mil millas comienza con un solo paso.',
      author: 'Lao Tse',
    },
    helpText:
      'Preguntas sobre tus recomendaciones? Nuestro equipo esta aqui para guiarte. Responde a este correo.',
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

const personalizationSectionStyle: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0 24px 0',
  borderLeft: '4px solid #22c55e',
};

const personalizationTextStyle: React.CSSProperties = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
};

const recommendationsSectionStyle: React.CSSProperties = {
  margin: '24px 0',
};

const recommendationsLabelStyle: React.CSSProperties = {
  color: '#c2410c',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  textTransform: 'uppercase',
};

const programCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#fff7ed',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
  border: '1px solid #fed7aa',
};

const programImageStyle: React.CSSProperties = {
  borderRadius: '6px',
  objectFit: 'cover',
  marginRight: '16px',
};

const programInfoStyle: React.CSSProperties = {
  flex: 1,
};

const programNumberStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0 0 4px 0',
  textTransform: 'uppercase',
};

const programTitleStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: 0,
};

const buttonSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '32px 0',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const sectionHeadingStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const expectationItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '16px',
};

const expectationIconStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  backgroundColor: '#ea580c',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '12px',
  flexShrink: 0,
};

const expectationContentStyle: React.CSSProperties = {
  flex: 1,
};

const expectationTitleStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const expectationDescStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: 0,
};

const quoteSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '16px',
  backgroundColor: '#fef3c7',
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
export default OnboardingCompleteEmail;
