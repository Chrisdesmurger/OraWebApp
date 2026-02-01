/**
 * Security Alert Email Template
 *
 * Sent when suspicious activity is detected on the account
 * Supports FR/EN/ES with variable interpolation
 */

import { Heading, Text, Hr, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { SecurityAlertEmailProps } from '@/types/email';

export function SecurityAlertEmail({
  recipientEmail,
  language = 'fr',
  alertType,
  deviceInfo,
  location,
  timestamp,
  baseUrl,
}: SecurityAlertEmailProps) {
  const content = emailContent[language];
  const alertContent = getAlertContent(alertType, language);
  const previewText = alertContent.preview;

  const securityUrl = `${baseUrl}/account/security`;

  return (
    <EmailLayout
      previewText={previewText}
      language={language}
      recipientEmail={recipientEmail}
      showUnsubscribe={false}
    >
      {/* Alert icon */}
      <Section style={alertIconSectionStyle}>
        <div style={alertIconStyle}>⚠️</div>
      </Section>

      {/* Main heading */}
      <Heading style={headingStyle}>{alertContent.heading}</Heading>

      {/* Alert description */}
      <Text style={alertTextStyle}>{alertContent.description}</Text>

      {/* Activity details */}
      <Section style={detailsSectionStyle}>
        <Text style={detailsLabelStyle}>{content.activityDetails}</Text>

        <table style={detailsTableStyle}>
          <tbody>
            <tr>
              <td style={detailsKeyStyle}>{content.when}:</td>
              <td style={detailsValueStyle}>{timestamp}</td>
            </tr>
            {deviceInfo && (
              <tr>
                <td style={detailsKeyStyle}>{content.device}:</td>
                <td style={detailsValueStyle}>{deviceInfo}</td>
              </tr>
            )}
            {location && (
              <tr>
                <td style={detailsKeyStyle}>{content.location}:</td>
                <td style={detailsValueStyle}>{location}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* What to do section */}
      <Text style={textStyle}>
        <strong>{content.wasThisYou}</strong>
      </Text>
      <Text style={textStyle}>{content.ifYes}</Text>
      <Text style={warningTextStyle}>{content.ifNo}</Text>

      {/* CTA Button */}
      <Section style={buttonSectionStyle}>
        <EmailButton href={securityUrl} variant="primary">
          {content.reviewActivity}
        </EmailButton>
      </Section>

      <Hr style={hrStyle} />

      {/* Help text */}
      <Text style={helpTextStyle}>{content.helpText}</Text>
    </EmailLayout>
  );
}

// ============================================================================
// Alert Type Content
// ============================================================================

interface AlertTypeContent {
  preview: string;
  heading: string;
  description: string;
}

function getAlertContent(
  alertType: 'new_login' | 'password_changed' | 'email_changed',
  language: SupportedLanguage
): AlertTypeContent {
  const alertContents: Record<typeof alertType, Record<SupportedLanguage, AlertTypeContent>> = {
    new_login: {
      fr: {
        preview: 'Nouvelle connexion détectée sur votre compte Ora',
        heading: 'Nouvelle connexion détectée',
        description: 'Une nouvelle connexion à votre compte Ora a été détectée depuis un appareil ou un emplacement inhabituel.',
      },
      en: {
        preview: 'New login detected on your Ora account',
        heading: 'New login detected',
        description: 'A new login to your Ora account was detected from an unusual device or location.',
      },
      es: {
        preview: 'Nuevo inicio de sesion detectado en tu cuenta Ora',
        heading: 'Nuevo inicio de sesion detectado',
        description: 'Se detecto un nuevo inicio de sesion en tu cuenta Ora desde un dispositivo o ubicacion inusual.',
      },
    },
    password_changed: {
      fr: {
        preview: 'Votre mot de passe Ora a été modifié',
        heading: 'Mot de passe modifié',
        description: 'Le mot de passe de votre compte Ora a été modifié avec succès.',
      },
      en: {
        preview: 'Your Ora password was changed',
        heading: 'Password changed',
        description: 'Your Ora account password was successfully changed.',
      },
      es: {
        preview: 'Tu contrasena de Ora fue cambiada',
        heading: 'Contrasena cambiada',
        description: 'La contrasena de tu cuenta Ora fue cambiada exitosamente.',
      },
    },
    email_changed: {
      fr: {
        preview: "L'adresse email de votre compte Ora a été modifiée",
        heading: 'Adresse email modifiée',
        description: "L'adresse email associée à votre compte Ora a été modifiée.",
      },
      en: {
        preview: 'Your Ora account email was changed',
        heading: 'Email address changed',
        description: 'The email address associated with your Ora account was changed.',
      },
      es: {
        preview: 'El correo de tu cuenta Ora fue cambiado',
        heading: 'Direccion de correo cambiada',
        description: 'La direccion de correo asociada a tu cuenta Ora fue cambiada.',
      },
    },
  };

  return alertContents[alertType][language];
}

// ============================================================================
// Content
// ============================================================================

interface EmailContentType {
  activityDetails: string;
  when: string;
  device: string;
  location: string;
  wasThisYou: string;
  ifYes: string;
  ifNo: string;
  reviewActivity: string;
  helpText: string;
}

const emailContent: Record<SupportedLanguage, EmailContentType> = {
  fr: {
    activityDetails: 'Détails de l\'activité',
    when: 'Quand',
    device: 'Appareil',
    location: 'Localisation',
    wasThisYou: 'Est-ce vous ?',
    ifYes: 'Si c\'est bien vous, vous pouvez ignorer cet email.',
    ifNo: 'Si ce n\'est pas vous, nous vous recommandons de changer immédiatement votre mot de passe et de vérifier l\'activité de votre compte.',
    reviewActivity: 'Vérifier mon compte',
    helpText: 'Pour toute question concernant la sécurité de votre compte, contactez notre équipe support.',
  },
  en: {
    activityDetails: 'Activity details',
    when: 'When',
    device: 'Device',
    location: 'Location',
    wasThisYou: 'Was this you?',
    ifYes: 'If this was you, you can ignore this email.',
    ifNo: 'If this wasn\'t you, we recommend changing your password immediately and reviewing your account activity.',
    reviewActivity: 'Review my account',
    helpText: 'For any questions about your account security, contact our support team.',
  },
  es: {
    activityDetails: 'Detalles de la actividad',
    when: 'Cuando',
    device: 'Dispositivo',
    location: 'Ubicacion',
    wasThisYou: 'Fuiste tu?',
    ifYes: 'Si fuiste tu, puedes ignorar este correo.',
    ifNo: 'Si no fuiste tu, te recomendamos cambiar tu contrasena inmediatamente y revisar la actividad de tu cuenta.',
    reviewActivity: 'Revisar mi cuenta',
    helpText: 'Para cualquier pregunta sobre la seguridad de tu cuenta, contacta a nuestro equipo de soporte.',
  },
};

// ============================================================================
// Styles
// ============================================================================

const alertIconSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '16px',
};

const alertIconStyle: React.CSSProperties = {
  fontSize: '48px',
  lineHeight: '1',
};

const headingStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const alertTextStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
  textAlign: 'center',
};

const textStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 12px 0',
};

const warningTextStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
  fontWeight: '500',
};

const detailsSectionStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #fecaca',
};

const detailsLabelStyle: React.CSSProperties = {
  color: '#991b1b',
  fontSize: '12px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  textTransform: 'uppercase',
};

const detailsTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const detailsKeyStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  padding: '4px 12px 4px 0',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
};

const detailsValueStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '14px',
  padding: '4px 0',
  fontFamily: 'monospace',
};

const buttonSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '24px 0',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const helpTextStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '1.5',
  textAlign: 'center',
};

// Export for preview
export default SecurityAlertEmail;
