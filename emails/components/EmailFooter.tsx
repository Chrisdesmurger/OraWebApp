/**
 * Email Footer Component
 *
 * Footer with unsubscribe link and legal info
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import type { SupportedLanguage } from '@/lib/firestore/conversions';

interface EmailFooterProps {
  language: SupportedLanguage;
  recipientEmail: string;
  unsubscribeToken?: string;
  showUnsubscribe?: boolean;
}

export function EmailFooter({
  language,
  recipientEmail,
  unsubscribeToken,
  showUnsubscribe = true,
}: EmailFooterProps) {
  const content = footerContent[language];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.ora-wellbeing.com';
  const unsubscribeUrl = unsubscribeToken
    ? `${baseUrl}/unsubscribe?token=${unsubscribeToken}`
    : `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;

  return (
    <Section style={footerStyle}>
      <Hr style={hrStyle} />

      {/* Company info */}
      <Text style={companyStyle}>Ora Wellbeing</Text>

      {/* Links */}
      <Text style={linksStyle}>
        <Link href={`${baseUrl}/help`} style={linkStyle}>
          {content.help}
        </Link>
        {' | '}
        <Link href={`${baseUrl}/privacy`} style={linkStyle}>
          {content.privacy}
        </Link>
        {' | '}
        <Link href={`${baseUrl}/terms`} style={linkStyle}>
          {content.terms}
        </Link>
      </Text>

      {/* Unsubscribe */}
      {showUnsubscribe && (
        <Text style={unsubscribeStyle}>
          {content.emailSentTo} {recipientEmail}
          <br />
          <Link href={unsubscribeUrl} style={unsubscribeLinkStyle}>
            {content.unsubscribe}
          </Link>
        </Text>
      )}

      {/* Copyright */}
      <Text style={copyrightStyle}>
        {content.copyright.replace('{year}', new Date().getFullYear().toString())}
      </Text>
    </Section>
  );
}

// ============================================================================
// Content
// ============================================================================

interface FooterContent {
  help: string;
  privacy: string;
  terms: string;
  emailSentTo: string;
  unsubscribe: string;
  copyright: string;
}

const footerContent: Record<SupportedLanguage, FooterContent> = {
  fr: {
    help: 'Aide',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    emailSentTo: 'Cet email a été envoyé à',
    unsubscribe: 'Se désabonner',
    copyright: '© {year} Ora Wellbeing. Tous droits réservés.',
  },
  en: {
    help: 'Help',
    privacy: 'Privacy',
    terms: 'Terms',
    emailSentTo: 'This email was sent to',
    unsubscribe: 'Unsubscribe',
    copyright: '© {year} Ora Wellbeing. All rights reserved.',
  },
  es: {
    help: 'Ayuda',
    privacy: 'Privacidad',
    terms: 'Términos',
    emailSentTo: 'Este correo fue enviado a',
    unsubscribe: 'Cancelar suscripción',
    copyright: '© {year} Ora Wellbeing. Todos los derechos reservados.',
  },
};

// ============================================================================
// Styles
// ============================================================================

const footerStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  textAlign: 'center',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '0 0 24px 0',
};

const companyStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const linksStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 16px 0',
};

const linkStyle: React.CSSProperties = {
  color: '#6b7280',
  textDecoration: 'underline',
};

const unsubscribeStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  margin: '0 0 12px 0',
  lineHeight: '1.5',
};

const unsubscribeLinkStyle: React.CSSProperties = {
  color: '#9ca3af',
  textDecoration: 'underline',
};

const copyrightStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  margin: '0',
};
