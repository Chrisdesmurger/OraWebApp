/**
 * /api/translate
 *
 * Auto-translation API using Google Cloud Translation API
 *
 * Translates text from French (source) to English and Spanish
 * Used by TranslationFields component for one-click auto-translation
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth-middleware';

// Google Cloud Translation API endpoint
const GOOGLE_TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2';

// Get API key from environment
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

export interface TranslateRequest {
  text: string;
  sourceLang?: string;  // Default: 'fr'
  targetLangs?: string[];  // Default: ['en', 'es']
}

export interface TranslateResponse {
  translations: {
    en?: string;
    es?: string;
  };
  error?: string;
}

/**
 * POST /api/translate
 *
 * Translates text from French to English and Spanish
 *
 * @body {
 *   text: string;  // Source text in French
 *   sourceLang?: 'fr';
 *   targetLangs?: ['en', 'es'];
 * }
 *
 * @returns {
 *   translations: { en: string; es: string };
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication via auth-middleware (works with both Firebase and Supabase tokens)
    await authenticateRequest(request);

    // Parse request body
    const body: TranslateRequest = await request.json();
    const { text, sourceLang = 'fr', targetLangs = ['en', 'es'] } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check API key
    if (!GOOGLE_TRANSLATE_API_KEY) {
      console.error('GOOGLE_TRANSLATE_API_KEY not configured');
      return NextResponse.json(
        { error: 'Translation service not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Translate to each target language
    const translations: Record<string, string> = {};

    for (const targetLang of targetLangs) {
      try {
        const response = await fetch(`${GOOGLE_TRANSLATE_API}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: targetLang,
            format: 'text',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Google Translate API error for ${targetLang}:`, errorData);
          throw new Error(`Translation failed for ${targetLang}: ${response.statusText}`);
        }

        const data = await response.json();
        const translatedText = data.data?.translations?.[0]?.translatedText;

        if (!translatedText) {
          throw new Error(`No translation returned for ${targetLang}`);
        }

        translations[targetLang] = translatedText;
      } catch (error) {
        console.error(`Translation error for ${targetLang}:`, error);
        translations[targetLang] = `[Translation failed]`;
      }
    }

    return NextResponse.json({
      translations,
    });

  } catch (error: unknown) {
    console.error('/api/translate error:', error);
    const message = error instanceof Error ? error.message : 'Translation failed';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
