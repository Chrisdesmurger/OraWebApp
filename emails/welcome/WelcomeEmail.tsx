/**
 * Welcome Email Template
 *
 * Sent when a new user creates an account
 * Supports FR/EN/ES with variable interpolation
 */

import { Heading, Text, Hr, Section, Img } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { WelcomeEmailProps } from '@/types/email';

export function WelcomeEmail({
  recipientEmail,
  language = 'fr',
  firstName,
  onboardingUrl,
  dashboardUrl,
  baseUrl,
}: WelcomeEmailProps) {
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
      {/* Welcome icon */}
      <Section style={iconSectionStyle}>
        <div style={iconStyle}>🙏</div>
      </Section>

      {/* Main heading */}
      <Heading style={headingStyle}>{content.heading}</Heading>

      {/* Personalized greeting */}
      <Text style={greetingStyle}>{greeting}</Text>

      {/* Introduction */}
      <Text style={textStyle}>{content.intro}</Text>

      {/* Features list */}
      <Section style={featuresSectionStyle}>
        <Text style={featuresLabelStyle}>{content.whatYouCanDo}</Text>

        <div style={featureItemStyle}>
          <span style={featureIconStyle}>🧘</span>
          <span style={featureTextStyle}>{content.feature1}</span>
        </div>
        <div style={featureItemStyle}>
          <span style={featureIconStyle}>🧠</span>
          <span style={featureTextStyle}>{content.feature2}</span>
        </div>
        <div style={featureItemStyle}>
          <span style={featureIconStyle}>🌱</span>
          <span style={featureTextStyle}>{content.feature3}</span>
        </div>
        <div style={featureItemStyle}>
          <span style={featureIconStyle}>📊</span>
          <span style={featureTextStyle}>{content.feature4}</span>
        </div>
      </Section>

      {/* CTA Button - Start Onboarding */}
      <Section style={buttonSectionStyle}>
        <EmailButton href={onboardingUrl} variant="primary">
          {content.startButtonText}
        </EmailButton>
      </Section>

      {/* Secondary action */}
      <Text style={secondaryTextStyle}>
        {content.orExplore}{' '}
        <a href={dashboardUrl} style={linkStyle}>
          {content.exploreDashboard}
        </a>
      </Text>

      <Hr style={hrStyle} />

      {/* Tips section */}
      <Text style={tipsHeadingStyle}>{content.tips.heading}</Text>
      <Text style={tipTextStyle}>
        <strong>{content.tips.tip1Title}</strong>
        <br />
        {content.tips.tip1Description}
      </Text>
      <Text style={tipTextStyle}>
        <strong>{content.tips.tip2Title}</strong>
        <br />
        {content.tips.tip2Description}
      </Text>

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
  whatYouCanDo: string;
  feature1: string;
  feature2: string;
  feature3: string;
  feature4: string;
  startButtonText: string;
  orExplore: string;
  exploreDashboard: string;
  tips: {
    heading: string;
    tip1Title: string;
    tip1Description: string;
    tip2Title: string;
    tip2Description: string;
  };
  helpText: string;
}

const emailContent: Record<SupportedLanguage, EmailContentType> = {
  fr: {
    preview: 'Bienvenue sur Ora ! Commencez votre voyage bien-être',
    heading: 'Bienvenue sur Ora !',
    greeting: 'Bonjour {name},',
    greetingNoName: 'Bonjour,',
    intro:
      'Nous sommes ravis de vous accueillir dans la communauté Ora. Votre parcours vers plus de bien-être commence maintenant.',
    whatYouCanDo: 'Ce qui vous attend :',
    feature1: 'Des cours de yoga adaptés à tous les niveaux',
    feature2: 'Des séances de méditation guidées',
    feature3: 'Des programmes personnalisés selon vos objectifs',
    feature4: 'Un suivi de votre progression',
    startButtonText: 'Commencer mon parcours',
    orExplore: 'Ou',
    exploreDashboard: 'explorez directement le tableau de bord',
    tips: {
      heading: 'Conseils pour bien démarrer',
      tip1Title: 'Prenez votre temps',
      tip1Description:
        "Même 5 minutes par jour peuvent faire une grande différence. L'important est la régularité.",
      tip2Title: 'Personnalisez votre expérience',
      tip2Description:
        "Complétez l'onboarding pour recevoir des recommandations adaptées à vos besoins.",
    },
    helpText:
      "Besoin d'aide ? Répondez simplement à cet email, notre équipe est là pour vous accompagner.",
  },
  en: {
    preview: 'Welcome to Ora! Start your wellness journey',
    heading: 'Welcome to Ora!',
    greeting: 'Hello {name},',
    greetingNoName: 'Hello,',
    intro:
      "We're thrilled to welcome you to the Ora community. Your journey towards greater wellbeing starts now.",
    whatYouCanDo: 'What awaits you:',
    feature1: 'Yoga classes adapted to all levels',
    feature2: 'Guided meditation sessions',
    feature3: 'Personalized programs based on your goals',
    feature4: 'Track your progress',
    startButtonText: 'Start my journey',
    orExplore: 'Or',
    exploreDashboard: 'explore the dashboard directly',
    tips: {
      heading: 'Tips to get started',
      tip1Title: 'Take your time',
      tip1Description:
        'Even 5 minutes a day can make a big difference. Consistency is key.',
      tip2Title: 'Personalize your experience',
      tip2Description:
        'Complete the onboarding to receive recommendations tailored to your needs.',
    },
    helpText:
      'Need help? Simply reply to this email, our team is here to support you.',
  },
  es: {
    preview: 'Bienvenido a Ora! Comienza tu viaje de bienestar',
    heading: 'Bienvenido a Ora!',
    greeting: 'Hola {name},',
    greetingNoName: 'Hola,',
    intro:
      'Estamos encantados de darte la bienvenida a la comunidad Ora. Tu viaje hacia un mayor bienestar comienza ahora.',
    whatYouCanDo: 'Lo que te espera:',
    feature1: 'Clases de yoga adaptadas a todos los niveles',
    feature2: 'Sesiones de meditacion guiadas',
    feature3: 'Programas personalizados segun tus objetivos',
    feature4: 'Seguimiento de tu progreso',
    startButtonText: 'Comenzar mi viaje',
    orExplore: 'O',
    exploreDashboard: 'explora el panel directamente',
    tips: {
      heading: 'Consejos para empezar',
      tip1Title: 'Tomate tu tiempo',
      tip1Description:
        'Incluso 5 minutos al dia pueden marcar una gran diferencia. La constancia es clave.',
      tip2Title: 'Personaliza tu experiencia',
      tip2Description:
        'Completa la incorporacion para recibir recomendaciones adaptadas a tus necesidades.',
    },
    helpText:
      'Necesitas ayuda? Simplemente responde a este correo, nuestro equipo esta aqui para apoyarte.',
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
  color: '#ea580c', // Orange Ora color
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
  margin: '0 0 24px 0',
};

const featuresSectionStyle: React.CSSProperties = {
  backgroundColor: '#fff7ed', // Light orange background
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #fed7aa',
};

const featuresLabelStyle: React.CSSProperties = {
  color: '#c2410c',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  textTransform: 'uppercase',
};

const featureItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '12px',
};

const featureIconStyle: React.CSSProperties = {
  fontSize: '18px',
  marginRight: '12px',
  lineHeight: '1.4',
};

const featureTextStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '1.4',
};

const buttonSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '32px 0 16px 0',
};

const secondaryTextStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center',
  margin: '0 0 24px 0',
};

const linkStyle: React.CSSProperties = {
  color: '#ea580c',
  textDecoration: 'underline',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const tipsHeadingStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const tipTextStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 12px 0',
};

const helpTextStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '1.5',
  textAlign: 'center',
};

// Export for preview
export default WelcomeEmail;
