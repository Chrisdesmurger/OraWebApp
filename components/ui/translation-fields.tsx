'use client';

/**
 * TranslationFields Component - Phase 2 UI
 *
 * Full-featured multilingual input with language tabs (FR/EN/ES)
 * Replaces temporary MultilingualInput/MultilingualTextarea components
 *
 * Features:
 * - Language tabs for FR/EN/ES navigation
 * - Translation status indicators (complete/incomplete)
 * - Validation (FR required, EN/ES optional)
 * - Support for both Input and Textarea
 */

import * as React from 'react';
import { Input, InputProps } from './input';
import { Textarea, TextareaProps } from './textarea';
import { Label } from './label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface MultilingualText {
  fr: string;
  en?: string;
  es?: string;
}

type Language = 'fr' | 'en' | 'es';

interface TranslationStatus {
  fr: boolean;
  en: boolean;
  es: boolean;
}

interface TranslationFieldsBaseProps {
  label: string;
  value: string | MultilingualText | undefined;
  onChange: (value: MultilingualText) => void;
  disabled?: boolean;
  required?: boolean;
  description?: string;
  placeholder?: {
    fr?: string;
    en?: string;
    es?: string;
  };
}

interface TranslationInputProps extends TranslationFieldsBaseProps {
  type?: 'input';
  maxLength?: number;
}

interface TranslationTextareaProps extends TranslationFieldsBaseProps {
  type: 'textarea';
  rows?: number;
  maxLength?: number;
}

type TranslationFieldsProps = TranslationInputProps | TranslationTextareaProps;

const LANGUAGE_LABELS: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
};

const LANGUAGE_FLAGS: Record<Language, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
};

/**
 * Calculate translation status for each language
 */
function getTranslationStatus(value: MultilingualText): TranslationStatus {
  return {
    fr: !!value.fr && value.fr.trim().length > 0,
    en: !!value.en && value.en.trim().length > 0,
    es: !!value.es && value.es.trim().length > 0,
  };
}

/**
 * Get completion percentage (0-100)
 */
function getCompletionPercentage(status: TranslationStatus): number {
  const completed = [status.fr, status.en, status.es].filter(Boolean).length;
  return Math.round((completed / 3) * 100);
}

/**
 * TranslationFields - Multilingual input/textarea with language tabs
 *
 * @example
 * // For single-line text
 * <TranslationFields
 *   label="Title"
 *   value={program.title}
 *   onChange={(value) => form.setValue('title', value)}
 *   required
 *   placeholder={{ fr: 'e.g., 7 Jours de Méditation', en: 'e.g., 7 Days of Meditation' }}
 * />
 *
 * @example
 * // For multi-line text
 * <TranslationFields
 *   type="textarea"
 *   label="Description"
 *   value={program.description}
 *   onChange={(value) => form.setValue('description', value)}
 *   rows={4}
 * />
 */
export function TranslationFields(props: TranslationFieldsProps) {
  const {
    label,
    value,
    onChange,
    disabled = false,
    required = false,
    description,
    placeholder = {},
    type = 'input',
  } = props;

  // Convert string to MultilingualText if needed (backward compatibility)
  const multilingualValue: MultilingualText = React.useMemo(() => {
    if (typeof value === 'string') {
      return { fr: value };
    }
    return value || { fr: '', en: '', es: '' };
  }, [value]);

  const [activeTab, setActiveTab] = React.useState<Language>('fr');
  const status = getTranslationStatus(multilingualValue);
  const completionPercentage = getCompletionPercentage(status);

  // Debug logging
  React.useEffect(() => {
    console.log('[TranslationFields]', label, '- Value:', multilingualValue, '- ActiveTab:', activeTab);
  }, [label, multilingualValue, activeTab]);

  const handleChange = (language: Language, text: string) => {
    onChange({
      ...multilingualValue,
      [language]: text,
    });
  };

  const renderStatusBadge = (lang: Language) => {
    const isComplete = status[lang];
    const isRequired = lang === 'fr' && required;

    if (isComplete) {
      return (
        <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      );
    }

    if (isRequired) {
      return (
        <Badge variant="outline" className="ml-2 text-red-600 border-red-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Required
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="ml-2 text-gray-400 border-gray-400">
        Optional
      </Badge>
    );
  };

  const renderInput = (lang: Language) => {
    const commonProps = {
      value: multilingualValue[lang] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleChange(lang, e.target.value),
      disabled,
      placeholder: placeholder[lang] || '',
    };

    if (type === 'textarea') {
      const textareaProps = props as TranslationTextareaProps;
      return (
        <Textarea
          {...commonProps}
          rows={textareaProps.rows || 4}
          maxLength={textareaProps.maxLength}
        />
      );
    }

    const inputProps = props as TranslationInputProps;
    return (
      <Input
        {...commonProps}
        maxLength={inputProps.maxLength}
      />
    );
  };

  return (
    <div className="space-y-2">
      {/* Label and overall status */}
      <div className="flex items-center justify-between">
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
          {completionPercentage}% translated
        </Badge>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {/* Language tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Language)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fr" className="relative">
            <span className="mr-1">{LANGUAGE_FLAGS.fr}</span>
            {LANGUAGE_LABELS.fr}
            {status.fr && (
              <CheckCircle2 className="h-3 w-3 ml-1 text-green-600 absolute top-1 right-1" />
            )}
          </TabsTrigger>
          <TabsTrigger value="en" className="relative">
            <span className="mr-1">{LANGUAGE_FLAGS.en}</span>
            {LANGUAGE_LABELS.en}
            {status.en && (
              <CheckCircle2 className="h-3 w-3 ml-1 text-green-600 absolute top-1 right-1" />
            )}
          </TabsTrigger>
          <TabsTrigger value="es" className="relative">
            <span className="mr-1">{LANGUAGE_FLAGS.es}</span>
            {LANGUAGE_LABELS.es}
            {status.es && (
              <CheckCircle2 className="h-3 w-3 ml-1 text-green-600 absolute top-1 right-1" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fr" className="space-y-2 mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">French (Primary)</span>
            {renderStatusBadge('fr')}
          </div>
          {renderInput('fr')}
          {required && !status.fr && (
            <p className="text-xs text-red-500">French translation is required</p>
          )}
        </TabsContent>

        <TabsContent value="en" className="space-y-2 mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">English</span>
            {renderStatusBadge('en')}
          </div>
          {renderInput('en')}
          {!status.en && (
            <p className="text-xs text-muted-foreground">
              Optional - Leave empty to use French as fallback
            </p>
          )}
        </TabsContent>

        <TabsContent value="es" className="space-y-2 mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Spanish</span>
            {renderStatusBadge('es')}
          </div>
          {renderInput('es')}
          {!status.es && (
            <p className="text-xs text-muted-foreground">
              Optional - Leave empty to use French as fallback
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Character count for active tab (if applicable) */}
      {type === 'input' && (props as TranslationInputProps).maxLength && (
        <div className="text-xs text-muted-foreground text-right">
          {(multilingualValue[activeTab] || '').length} / {(props as TranslationInputProps).maxLength}
        </div>
      )}
      {type === 'textarea' && (props as TranslationTextareaProps).maxLength && (
        <div className="text-xs text-muted-foreground text-right">
          {(multilingualValue[activeTab] || '').length} / {(props as TranslationTextareaProps).maxLength}
        </div>
      )}
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
