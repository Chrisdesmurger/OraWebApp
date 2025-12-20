/**
 * Multilingual Input Component
 *
 * Temporary component that allows editing French text (required)
 * while maintaining compatibility with the new MultilingualText type.
 *
 * TODO (Phase 2): Replace with full TranslationFields component that supports FR/EN/ES tabs
 */

import * as React from 'react';
import { Input, InputProps } from './input';
import { Textarea, TextareaProps } from './textarea';

export interface MultilingualText {
  fr: string;
  en?: string;
  es?: string;
}

interface MultilingualInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value: string | MultilingualText | undefined;
  onChange: (value: MultilingualText) => void;
}

interface MultilingualTextareaProps extends Omit<TextareaProps, 'value' | 'onChange'> {
  value: string | MultilingualText | undefined;
  onChange: (value: MultilingualText) => void;
}

/**
 * MultilingualInput - for single-line text
 *
 * Currently only edits French (fr) field.
 * Phase 2 will add language tabs for EN/ES.
 */
export function MultilingualInput({
  value,
  onChange,
  ...props
}: MultilingualInputProps) {
  // Convert string to MultilingualText if needed (backward compatibility)
  const multilingualValue: MultilingualText = typeof value === 'string'
    ? { fr: value }
    : value || { fr: '' };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...multilingualValue,
      fr: e.target.value,
    });
  };

  return (
    <div className="space-y-2">
      <Input
        {...props}
        value={multilingualValue.fr || ''}
        onChange={handleChange}
      />
      {/* TODO Phase 2: Add language selector and tabs for EN/ES */}
    </div>
  );
}

/**
 * MultilingualTextarea - for multi-line text
 *
 * Currently only edits French (fr) field.
 * Phase 2 will add language tabs for EN/ES.
 */
export function MultilingualTextarea({
  value,
  onChange,
  ...props
}: MultilingualTextareaProps) {
  // Convert string to MultilingualText if needed (backward compatibility)
  const multilingualValue: MultilingualText = typeof value === 'string'
    ? { fr: value }
    : value || { fr: '' };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      ...multilingualValue,
      fr: e.target.value,
    });
  };

  return (
    <div className="space-y-2">
      <Textarea
        {...props}
        value={multilingualValue.fr || ''}
        onChange={handleChange}
      />
      {/* TODO Phase 2: Add language selector and tabs for EN/ES */}
    </div>
  );
}

/**
 * Helper to get display text from MultilingualText
 * Falls back to French if other languages not available
 */
export function getMultilingualDisplayText(
  text: string | MultilingualText | null | undefined,
  language: 'fr' | 'en' | 'es' = 'fr'
): string {
  if (!text) return '';
  if (typeof text === 'string') return text;

  // Try requested language, fall back to French, fall back to empty
  return text[language] || text.fr || '';
}
