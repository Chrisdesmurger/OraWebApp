/**
 * Base Email Layout Component
 *
 * Provides consistent Ora branding across all emails:
 * - Branded header with logo
 * - Responsive design
 * - Footer with unsubscribe link
 * - i18n support
 */

import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from '@react-email/components';
import * as React from 'react';
import { EmailHeader } from './EmailHeader';
import { EmailFooter } from './EmailFooter';
import type { SupportedLanguage } from '@/lib/firestore/conversions';

interface EmailLayoutProps {
  previewText: string;
  language: SupportedLanguage;
  recipientEmail: string;
  unsubscribeToken?: string;
  showUnsubscribe?: boolean;
  children: React.ReactNode;
}

export function EmailLayout({
  previewText,
  language,
  recipientEmail,
  unsubscribeToken,
  showUnsubscribe = true,
  children,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <EmailHeader language={language} />
          <Section style={contentStyle}>{children}</Section>
          <EmailFooter
            language={language}
            recipientEmail={recipientEmail}
            unsubscribeToken={unsubscribeToken}
            showUnsubscribe={showUnsubscribe}
          />
        </Container>
      </Body>
    </Html>
  );
}

// ============================================================================
// Styles
// ============================================================================

const mainStyle: React.CSSProperties = {
  backgroundColor: '#f8f5f2', // Warm yoga/wellness tone
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '20px 0',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
};

const contentStyle: React.CSSProperties = {
  padding: '32px 24px',
};
