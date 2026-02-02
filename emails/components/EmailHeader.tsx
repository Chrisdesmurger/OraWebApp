/**
 * Email Header Component
 *
 * Branded header with Ora logo
 */

import { Img, Section, Text } from '@react-email/components';
import * as React from 'react';
import type { SupportedLanguage } from '@/lib/firestore/conversions';

interface EmailHeaderProps {
  language: SupportedLanguage;
}

export function EmailHeader({ language }: EmailHeaderProps) {
  return (
    <Section style={headerStyle}>
      {/* Logo placeholder - replace with actual logo URL */}
      <Text style={logoTextStyle}>Ora</Text>
      <Text style={taglineStyle}>{taglines[language]}</Text>
    </Section>
  );
}

// ============================================================================
// Content
// ============================================================================

const taglines: Record<SupportedLanguage, string> = {
  fr: 'Votre bien-être au quotidien',
  en: 'Your daily wellness',
  es: 'Tu bienestar diario',
};

// ============================================================================
// Styles
// ============================================================================

const headerStyle: React.CSSProperties = {
  backgroundColor: '#f97316', // Ora orange
  padding: '24px',
  textAlign: 'center',
};

const logoTextStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 4px 0',
  letterSpacing: '2px',
};

const taglineStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '14px',
  fontWeight: '400',
  margin: '0',
};
