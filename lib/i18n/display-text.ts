/**
 * i18n Display Text Utilities
 *
 * Provides helpers for working with multilingual text fields (FR/EN/ES)
 * in the OraWebApp admin portal.
 *
 * Issue #68: Backend i18n Support
 */

import type { MultilingualText } from '@/types/lesson';

/**
 * Supported languages
 */
export type SupportedLanguage = 'fr' | 'en' | 'es';

/**
 * Default display language for admin portal
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

/**
 * Get display text from a multilingual field.
 * Falls back to French -> English -> Spanish -> empty string.
 *
 * @param text - MultilingualText object, string (legacy), or null/undefined
 * @param preferredLang - Preferred language (default: 'fr')
 * @returns Display string
 */
export function getDisplayText(
  text: MultilingualText | string | null | undefined,
  preferredLang: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  if (!text) return '';
  if (typeof text === 'string') return text;

  // Try preferred language first
  switch (preferredLang) {
    case 'en':
      return text.en || text.fr || text.es || '';
    case 'es':
      return text.es || text.fr || text.en || '';
    case 'fr':
    default:
      return text.fr || text.en || text.es || '';
  }
}

/**
 * Get all text from a multilingual field, joined with spaces.
 * Useful for searching across all languages.
 *
 * @param text - MultilingualText object, string, or null/undefined
 * @returns Combined text from all languages
 */
export function getSearchableText(
  text: MultilingualText | string | null | undefined
): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return [text.fr, text.en, text.es].filter(Boolean).join(' ');
}

/**
 * Get translation status for a multilingual field
 */
export function getTranslationStatus(
  text: MultilingualText | string | null | undefined
): { fr: boolean; en: boolean; es: boolean } {
  if (!text || typeof text === 'string') {
    // Legacy string - assume French
    return { fr: !!text, en: false, es: false };
  }
  return {
    fr: !!text.fr,
    en: !!text.en,
    es: !!text.es,
  };
}

/**
 * Check if a multilingual field has complete translations
 */
export function isFullyTranslated(
  text: MultilingualText | string | null | undefined
): boolean {
  const status = getTranslationStatus(text);
  return status.fr && status.en && status.es;
}

/**
 * Create a MultilingualText object from a French string
 */
export function createMultilingualText(fr: string): MultilingualText {
  return { fr, en: undefined, es: undefined };
}

/**
 * Normalize a text value to MultilingualText format
 */
export function normalizeToMultilingual(
  text: MultilingualText | string | null | undefined
): MultilingualText {
  if (!text) return { fr: '' };
  if (typeof text === 'string') return { fr: text };
  return text;
}
