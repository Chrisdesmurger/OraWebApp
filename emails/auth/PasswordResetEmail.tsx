/**
 * Password Reset Email Template
 *
 * Sent when a user requests to reset their password
 * Supports FR/EN/ES with variable interpolation
 */

import { Heading, Text, Hr, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { PasswordResetEmailProps } from '@/types/email';

export function PasswordResetEmail({
  recipientEmail,
  language = 'fr',
  resetUrl,
  expiresIn = '1 heure',
  ipAddress,
  baseUrl,
}: PasswordResetEmailProps) {
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
        <EmailButton href={resetUrl} variant="primary">
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
      {ipAddress && (
        <Section style={detailsSectionStyle}>
          <Text style={detailsLabelStyle}>{content.requestDetails}</Text>
          <Text style={detailsValueStyle}>
            {content.ipAddress}: {ipAddress}
          </Text>
        </Section>
      )}

      {/* Alternative link */}
      <Text style={altLinkStyle}>
        {content.altLinkText}
        <br />
        <span style={linkTextStyle}>{resetUrl}</span>
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
  altLinkText: string;
}

const emailContent: Record<SupportedLanguage, EmailContentType> = {
  fr: {
    preview: 'Réinitialisez votre mot de passe Ora',
    heading: 'Réinitialisation de mot de passe',
    intro:
      'Vous avez demandé à réinitialiser le mot de passe de votre compte Ora. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.',
    buttonText: 'Réinitialiser le mot de passe',
    expiresIn: 'Ce lien expire dans {time}.',
    securityNote:
      "Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe restera inchangé.",
    requestDetails: 'Détails de la demande :',
    ipAddress: 'Adresse IP',
    altLinkText:
      'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :',
  },
  en: {
    preview: 'Reset your Ora password',
    heading: 'Password Reset',
    intro:
      'You requested to reset your Ora account password. Click the button below to create a new password.',
    buttonText: 'Reset Password',
    expiresIn: 'This link expires in {time}.',
    securityNote:
      "If you didn't request this reset, you can safely ignore this email. Your password will remain unchanged.",
    requestDetails: 'Request details:',
    ipAddress: 'IP Address',
    altLinkText:
      "If the button doesn't work, copy and paste this link in your browser:",
  },
  es: {
    preview: 'Restablece tu contrasena de Ora',
    heading: 'Restablecimiento de contrasena',
    intro:
      'Solicitaste restablecer la contrasena de tu cuenta Ora. Haz clic en el boton de abajo para crear una nueva contrasena.',
    buttonText: 'Restablecer contrasena',
    expiresIn: 'Este enlace expira en {time}.',
    securityNote:
      'Si no solicitaste este restablecimiento, puedes ignorar este correo de forma segura. Tu contrasena permanecera sin cambios.',
    requestDetails: 'Detalles de la solicitud:',
    ipAddress: 'Direccion IP',
    altLinkText:
      'Si el boton no funciona, copia y pega este enlace en tu navegador:',
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
export default PasswordResetEmail;
