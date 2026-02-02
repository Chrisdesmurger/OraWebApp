/**
 * Magic Link Email Template
 *
 * Sent when a user requests passwordless login
 * Supports FR/EN/ES with variable interpolation
 */

import { Heading, Text, Hr, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { MagicLinkEmailProps } from '@/types/email';

export function MagicLinkEmail({
  recipientEmail,
  language = 'fr',
  magicLinkUrl,
  expiresIn = '1 heure',
  ipAddress,
  userAgent,
  baseUrl,
}: MagicLinkEmailProps) {
  const content = emailContent[language];
  const previewText = content.preview;

  return (
    <EmailLayout
      previewText={previewText}
      language={language}
      recipientEmail={recipientEmail}
      showUnsubscribe={false}
    >
      {/* Main heading */}
      <Heading style={headingStyle}>{content.heading}</Heading>

      {/* Introduction */}
      <Text style={textStyle}>{content.intro}</Text>

      {/* CTA Button */}
      <Section style={buttonSectionStyle}>
        <EmailButton href={magicLinkUrl} variant="primary">
          {content.buttonText}
        </EmailButton>
      </Section>

      {/* Expiration notice */}
      <Text style={noteStyle}>
        {content.expiresIn.replace('{time}', expiresIn)}
      </Text>

      <Hr style={hrStyle} />

      {/* Security info */}
      <Text style={securityTextStyle}>{content.securityNote}</Text>

      {/* Request details */}
      {(ipAddress || userAgent) && (
        <Section style={detailsSectionStyle}>
          <Text style={detailsLabelStyle}>{content.requestDetails}</Text>
          {ipAddress && (
            <Text style={detailsValueStyle}>
              {content.ipAddress}: {ipAddress}
            </Text>
          )}
          {userAgent && (
            <Text style={detailsValueStyle}>
              {content.device}: {userAgent.substring(0, 50)}
              {userAgent.length > 50 ? '...' : ''}
            </Text>
          )}
        </Section>
      )}

      {/* Alternative link */}
      <Text style={altLinkStyle}>
        {content.altLinkText}
        <br />
        <span style={linkTextStyle}>{magicLinkUrl}</span>
      </Text>
    </EmailLayout>
  );
}

// ============================================================================
// Content
// ============================================================================

interface EmailContentType {
  preview: string;
  heading: string;
  intro: string;
  buttonText: string;
  expiresIn: string;
  securityNote: string;
  requestDetails: string;
  ipAddress: string;
  device: string;
  altLinkText: string;
}

const emailContent: Record<SupportedLanguage, EmailContentType> = {
  fr: {
    preview: 'Votre lien de connexion Ora - valide 1 heure',
    heading: 'Connexion à votre compte',
    intro:
      'Vous avez demandé un lien de connexion à votre compte Ora. Cliquez sur le bouton ci-dessous pour vous connecter.',
    buttonText: 'Se connecter',
    expiresIn: 'Ce lien expire dans {time}.',
    securityNote:
      "Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email en toute sécurité.",
    requestDetails: 'Détails de la demande :',
    ipAddress: 'Adresse IP',
    device: 'Appareil',
    altLinkText:
      'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :',
  },
  en: {
    preview: 'Your Ora login link - valid for 1 hour',
    heading: 'Sign in to your account',
    intro:
      'You requested a login link for your Ora account. Click the button below to sign in.',
    buttonText: 'Sign in',
    expiresIn: 'This link expires in {time}.',
    securityNote:
      "If you didn't request this link, you can safely ignore this email.",
    requestDetails: 'Request details:',
    ipAddress: 'IP Address',
    device: 'Device',
    altLinkText:
      "If the button doesn't work, copy and paste this link in your browser:",
  },
  es: {
    preview: 'Tu enlace de inicio de sesión Ora - válido por 1 hora',
    heading: 'Inicia sesión en tu cuenta',
    intro:
      'Solicitaste un enlace de inicio de sesión para tu cuenta Ora. Haz clic en el botón de abajo para iniciar sesión.',
    buttonText: 'Iniciar sesión',
    expiresIn: 'Este enlace expira en {time}.',
    securityNote:
      'Si no solicitaste este enlace, puedes ignorar este correo de forma segura.',
    requestDetails: 'Detalles de la solicitud:',
    ipAddress: 'Dirección IP',
    device: 'Dispositivo',
    altLinkText:
      'Si el botón no funciona, copia y pega este enlace en tu navegador:',
  },
};

// ============================================================================
// Styles
// ============================================================================

const headingStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const textStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
};

const buttonSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '24px 0',
};

const noteStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center',
  margin: '16px 0 0 0',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const securityTextStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px 0',
};

const detailsSectionStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
};

const detailsLabelStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '12px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  textTransform: 'uppercase',
};

const detailsValueStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 4px 0',
  fontFamily: 'monospace',
};

const altLinkStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '24px 0 0 0',
};

const linkTextStyle: React.CSSProperties = {
  color: '#6b7280',
  wordBreak: 'break-all',
};

// Export for preview
export default MagicLinkEmail;
