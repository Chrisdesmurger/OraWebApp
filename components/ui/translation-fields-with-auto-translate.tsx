/**
 * TranslationFields with Auto-Translate Button
 *
 * Enhanced version of TranslationFields with one-click auto-translation
 * using Google Translate API
 *
 * Usage: Import this instead of translation-fields.tsx
 */

'use client';

import * as React from 'react';
import { Input, InputProps } from './input';
import { Textarea, TextareaProps } from './textarea';
import { Label } from './label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { Button } from './button';
import { CheckCircle2, AlertCircle, Languages, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
  showAutoTranslate?: boolean;  // NEW: Show auto-translate button
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
 * Auto-translate using Google Translate API
 */
async function autoTranslate(text: string): Promise<{ en: string; es: string } | null> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLang: 'fr',
        targetLangs: ['en', 'es'],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Translation failed');
    }

    const data = await response.json();
    return data.translations;
  } catch (error) {
    console.error('Auto-translate error:', error);
    throw error;
  }
}

/**
 * TranslationFields - Multilingual input/textarea with auto-translate
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
    showAutoTranslate = true,  // NEW: Default enabled
  } = props;

  const { toast } = useToast();
  const [isTranslating, setIsTranslating] = React.useState(false);

  // Convert string to MultilingualText if needed
  const multilingualValue: MultilingualText = React.useMemo(() => {
    if (typeof value === 'string') {
      return { fr: value };
    }
    return value || { fr: '', en: '', es: '' };
  }, [value]);

  const [activeTab, setActiveTab] = React.useState<Language>('fr');
  const status = getTranslationStatus(multilingualValue);
  const completionPercentage = getCompletionPercentage(status);

  const handleChange = (language: Language, text: string) => {
    onChange({
      ...multilingualValue,
      [language]: text,
    });
  };

  // NEW: Auto-translate handler
  const handleAutoTranslate = async () => {
    if (!multilingualValue.fr || multilingualValue.fr.trim().length === 0) {
      toast({
        title: "French text required",
        description: "Please enter French text first to enable auto-translation.",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);

    try {
      const translations = await autoTranslate(multilingualValue.fr);

      if (translations) {
        onChange({
          ...multilingualValue,
          en: translations.en,
          es: translations.es,
        });

        toast({
          title: "✅ Translation successful!",
          description: "English and Spanish translations have been generated.",
        });

        // Switch to English tab to show result
        setActiveTab('en');
      }
    } catch (error: any) {
      toast({
        title: "❌ Translation failed",
        description: error.message || "Please try again or translate manually.",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
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
      {/* Label, auto-translate button, and overall status */}
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        <div className="flex items-center gap-2">
          {/* NEW: Auto-translate button */}
          {showAutoTranslate && status.fr && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoTranslate}
              disabled={disabled || isTranslating}
              className="h-7"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Languages className="h-3 w-3 mr-1" />
                  Auto-Translate
                </>
              )}
            </Button>
          )}

          <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
            {completionPercentage}% translated
          </Badge>
        </div>
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
              Optional - Click "Auto-Translate" or leave empty to use French as fallback
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
              Optional - Click "Auto-Translate" or leave empty to use French as fallback
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
 */
export function getMultilingualDisplayText(
  text: string | MultilingualText | null | undefined,
  language: 'fr' | 'en' | 'es' = 'fr'
): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[language] || text.fr || '';
}

// Export with alternate name for clarity
export { TranslationFields as TranslationFieldsWithAutoTranslate };
