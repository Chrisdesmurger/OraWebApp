/**
 * Onboarding Firestore mappers
 *
 * Goal:
 * - Store onboarding configs in Firestore using snake_case keys to match Android models.
 * - Keep compatibility with legacy camelCase fields used by older web admin iterations.
 */

import { deepCamelToSnake, deepSnakeToCamel } from '@/lib/firestore/conversions';

export type AnyRecord = Record<string, unknown>;

export interface MapResult<T> {
  value: T;
  warnings: string[];
}

/**
 * Convert a Firestore onboarding config document to the admin portal shape (camelCase)
 * while accepting both snake_case and legacy camelCase in Firestore.
 */
export function mapOnboardingConfigFromFirestore<T>(docData: AnyRecord): MapResult<T> {
  const warnings: string[] = [];

  // 1) Prefer snake_case conversion, but also keep original fields.
  const camel = deepSnakeToCamel<AnyRecord>(docData);

  // 2) Merge: snake->camel result + legacy values.
  const merged: AnyRecord = {
    ...camel,
    ...docData,
  };

  // 3) Normalize information screens: prefer snake_case field name.
  if (merged.informationScreens === undefined && merged.information_screens !== undefined) {
    merged.informationScreens = merged.information_screens;
  }

  // 4) Normalize question translation fields. Android expects snake_case:
  // title_fr/title_en/title_es etc.
  // Admin UI currently uses titleFr/titleEn/titleEs. Ensure these are present.
  if (Array.isArray(merged.questions)) {
    merged.questions = (merged.questions as AnyRecord[]).map((q) => {
      const qc = deepSnakeToCamel<AnyRecord>(q);

      // Merge again to keep any legacy camelCase that might already be there.
      const qMerged: AnyRecord = { ...qc, ...q };

      // Default titleFr to title if missing
      if (!qMerged.titleFr && qMerged.title) {
        qMerged.titleFr = qMerged.title;
      }
      if (!qMerged.subtitleFr && qMerged.subtitle) {
        qMerged.subtitleFr = qMerged.subtitle;
      }

      // Options
      if (Array.isArray(qMerged.options)) {
        qMerged.options = (qMerged.options as AnyRecord[]).map((opt) => {
          const oc = deepSnakeToCamel<AnyRecord>(opt);
          const oMerged: AnyRecord = { ...oc, ...opt };
          if (!oMerged.labelFr && oMerged.label) {
            oMerged.labelFr = oMerged.label;
          }
          return oMerged;
        });
      }

      return qMerged;
    });
  }

  return { value: merged as T, warnings };
}

/**
 * Convert an admin portal onboarding config payload (camelCase) into Firestore snake_case.
 *
 * We also keep camelCase fields for backward compatibility, but the Android app
 * will read the snake_case ones.
 */
export function mapOnboardingConfigToFirestore(payload: AnyRecord): MapResult<AnyRecord> {
  const warnings: string[] = [];

  // Ensure required translations fallback
  const normalized: AnyRecord = { ...payload };

  // Normalize questions/options and make sure base fields mirror FR
  if (Array.isArray(normalized.questions)) {
    normalized.questions = (normalized.questions as AnyRecord[]).map((q) => {
      const qn: AnyRecord = { ...q };

      // Mirror FR into legacy base fields
      const titleFr = (qn.titleFr as string | undefined) ?? (qn.title as string | undefined) ?? '';
      qn.title = (qn.title as string | undefined) ?? titleFr;
      qn.titleFr = titleFr;

      const subtitleFr = (qn.subtitleFr as string | undefined) ?? (qn.subtitle as string | undefined);
      if (subtitleFr !== undefined) {
        qn.subtitle = (qn.subtitle as string | undefined) ?? subtitleFr;
        qn.subtitleFr = subtitleFr;
      }

      // Hint (optional)
      const hintFr = (qn.hintFr as string | undefined) ?? (qn.hint as string | undefined);
      if (hintFr !== undefined) {
        qn.hint = (qn.hint as string | undefined) ?? hintFr;
        qn.hintFr = hintFr;
      }

      // type.placeholder (optional)
      if (qn.type && typeof qn.type === 'object') {
        const type = qn.type as AnyRecord;
        const placeholderFr = (type.placeholderFr as string | undefined) ?? (type.placeholder as string | undefined);
        if (placeholderFr !== undefined) {
          type.placeholder = (type.placeholder as string | undefined) ?? placeholderFr;
          type.placeholderFr = placeholderFr;
        }
        qn.type = type;
      }

      // options
      if (Array.isArray(qn.options)) {
        qn.options = (qn.options as AnyRecord[]).map((opt) => {
          const on: AnyRecord = { ...opt };
          const labelFr = (on.labelFr as string | undefined) ?? (on.label as string | undefined) ?? '';
          on.label = (on.label as string | undefined) ?? labelFr;
          on.labelFr = labelFr;
          return on;
        });
      }

      return qn;
    });
  }

  // Convert to snake_case (deep)
  const snake = deepCamelToSnake<AnyRecord>(normalized);

  // Keep both formats:
  return {
    value: {
      ...normalized,
      ...snake,
    },
    warnings,
  };
}
