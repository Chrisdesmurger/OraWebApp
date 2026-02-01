/**
 * Email Button Component
 *
 * Reusable CTA button for emails
 */

import { Button } from '@react-email/components';
import * as React from 'react';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export function EmailButton({
  href,
  children,
  variant = 'primary',
  fullWidth = false,
}: EmailButtonProps) {
  const style = {
    ...baseStyle,
    ...variantStyles[variant],
    ...(fullWidth ? { display: 'block', width: '100%', textAlign: 'center' as const } : {}),
  };

  return (
    <Button href={href} style={style}>
      {children}
    </Button>
  );
}

// ============================================================================
// Styles
// ============================================================================

const baseStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 28px',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center',
};

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: '#f97316', // Ora orange
    color: '#ffffff',
  },
  secondary: {
    backgroundColor: '#1f2937',
    color: '#ffffff',
  },
  outline: {
    backgroundColor: 'transparent',
    color: '#f97316',
    border: '2px solid #f97316',
  },
};
