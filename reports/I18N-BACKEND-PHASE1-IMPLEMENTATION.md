# i18n Backend Phase 1 Implementation Report

**Issue**: #68 - Backend Internationalization (FR/EN/ES)
**Branch**: `feat/issue-68-i18n-backend-phase1`
**Date**: 2025-12-20
**Status**: Partial Implementation

## Summary

This PR implements Phase 1 of the backend internationalization support for OraWebApp. The goal is to enable the Android app (Ora) to display content in French, English, and Spanish by adding multilingual fields to the backend schema.

## Completed Work

### 1. Validators Updated (lib/validators/)

#### lesson.ts
- Added `multilingualTextSchema` and `multilingualTextOptionalSchema`
- Added i18n schemas for yoga chapters with `nameFr/En/Es` and instructions with `textFr/En/Es`
- Added i18n schemas for massage body zones with `nameFr/En/Es`, `pressureLevelFr/En/Es`, and instructions
- Added i18n schemas for meditation phases with `nameFr/En/Es`, `ambientSoundNameFr/En/Es`, `breathingInstructionFr/En/Es`
- Added `createLessonSchemaI18n` and `updateLessonSchemaI18n` with full i18n support
- Added backward-compatible schemas (`createLessonSchemaCompat`, `updateLessonSchemaCompat`)

#### program.ts
- Added `multilingualTextSchema` and `multilingualTextOptionalSchema`
- Added i18n schema for program objectives with `textFr/En/Es`
- Added `createProgramSchemaI18n` and `updateProgramSchemaI18n`
- Added backward-compatible schemas
- Added validation helper functions

### 2. Types Updated (types/)

#### lesson.ts
- Updated `LessonDocument` (Firestore) with i18n fields (`title_fr`, `title_en`, `title_es`, etc.)
- Updated `Lesson` (client-side) to use `MultilingualText` for text fields
- Added `LessonLegacy` interface for backward compatibility
- Added `CreateLessonRequest` and `UpdateLessonRequest` accepting both string and MultilingualText
- Added validation functions with i18n coverage reporting
- Added `mapLessonFromFirestore` and `mapLessonToFirestore` with i18n handling
- Added helper functions: `getFrenchText`, `getLocalizedText`

#### onboarding.ts
- Added Spanish (`Es`) fields to all multilingual types:
  - `ProfileFieldOption`: `labelEs`
  - `ProfileField`: `labelEs`, `placeholderFr/En/Es`
  - `QuestionTypeConfig`: `placeholderFr/En/Es`
  - `AnswerOption`: `labelEs`, `descriptionFr/En/Es`
  - `OnboardingQuestion`: `titleEs`, `subtitleEs`, `hintFr/En/Es`
  - `InformationScreen`: `titleEs`, `subtitleEs`, `contentEs`, `bulletPointsEs`, `ctaTextEs`
  - Request types: `CreateInformationScreenRequest`, `UpdateInformationScreenRequest`
- Added `BulletPoint` interface for structured multilingual bullet points
- Added `OnboardingLanguage` type and `TranslationCoverage` interface
- Added validation helper functions: `getQuestionTranslationCoverage`, `getInformationScreenTranslationCoverage`
- Added `getLocalizedOnboardingText` helper function
- Updated `UserOnboardingResponse.metadata.locale` to include `'es'`

### 3. Firestore Conversions (lib/firestore/conversions.ts) - NEW FILE

- Created `MultilingualText` interface with `fr` (required), `en` (optional), `es` (optional)
- Added case conversion utilities: `camelToSnake`, `snakeToCamel`, `deepCamelToSnake`, `deepSnakeToCamel`
- Added multilingual expansion/collapse: `expandToMultilingual`, `collapseFromMultilingual`
- Added type-specific conversions for yoga chapters, massage body zones, meditation phases
- Added program objective conversion functions
- Added validation and migration helpers

### 4. i18n Helper Utilities (lib/i18n/display-text.ts) - NEW FILE

- Created `getDisplayText` function with language fallback chain
- Created `getSearchableText` for searching across all languages
- Created `getTranslationStatus` for checking translation coverage
- Added `createMultilingualText` and `normalizeToMultilingual` utilities

### 5. Migration Script (scripts/migrate-i18n.ts) - NEW FILE

- Script to migrate existing content to i18n format
- Supports lessons, programs, and onboarding configs
- Copies French content to `_fr` fields
- Leaves `_en` and `_es` as null for manual translation
- Supports dry-run mode for testing
- Batch processing with configurable batch size

### 6. UI Updates (Partial)

Updated these files to handle `MultilingualText` type:
- `app/admin/content/[id]/page.tsx` - Lesson details page
- `app/admin/content/_components/EditLessonDialog.tsx` - Edit lesson form
- `app/admin/content/_components/LessonTable.tsx` - Lesson list table
- `app/admin/content/page.tsx` - Content management page

Added i18n status indicators showing FR/EN/ES translation coverage.

## Known Issues / Incomplete Work

### Build Errors
The current implementation has TypeScript errors in several files because the `Lesson.title` type changed from `string` to `MultilingualText`. Files that need updating:

1. `app/admin/programs/_components/CreateProgramDialog.tsx`
2. `app/admin/programs/_components/EditProgramDialog.tsx`
3. `app/admin/programs/_components/ProgramTable.tsx`
4. `app/admin/programs/page.tsx`
5. Other components that reference `lesson.title` or `program.title` directly

### Recommended Approach
To complete the implementation, we have two options:

**Option A: Update all UI components** (Recommended for full i18n)
- Update all components to use `getDisplayText()` helper
- Add i18n status indicators to all tables/forms
- Estimated: ~20 files to update

**Option B: Keep Lesson.title as union type**
- Change `title: MultilingualText` to `title: MultilingualText | string`
- Less breaking changes but inconsistent API
- Not recommended

## Files Modified

```
lib/validators/lesson.ts        +293 lines
lib/validators/program.ts       +242 lines
types/lesson.ts                 +480 lines (major rewrite)
types/onboarding.ts             +259 lines (Spanish support)
lib/firestore/conversions.ts    NEW (conversion utilities)
lib/i18n/display-text.ts        NEW (display helpers)
scripts/migrate-i18n.ts         NEW (migration script)
app/admin/content/[id]/page.tsx         (i18n display)
app/admin/content/_components/EditLessonDialog.tsx  (i18n form)
app/admin/content/_components/LessonTable.tsx       (i18n status)
app/admin/content/page.tsx                          (i18n search)
```

## Testing Checklist

- [ ] Run migration script in dry-run mode
- [ ] Verify Firestore schema accepts i18n fields
- [ ] Test lesson creation with French-only content
- [ ] Test lesson update with EN/ES translations
- [ ] Verify Android app can read multilingual content
- [ ] Test search across all languages
- [ ] Verify translation status indicators

## Next Steps

1. **Fix remaining build errors** - Update programs UI components
2. **Create TranslationFields component** - Reusable language tabs component
3. **Add translation editor page** - Dedicated page for bulk translations
4. **Write unit tests** - Test validators and conversion functions
5. **Deploy migration script** - Run on production Firestore
6. **Update Android app** - Modify LessonDocument/LessonMapper to read i18n fields

## Breaking Changes

- `Lesson.title` is now `MultilingualText` instead of `string`
- `Lesson.description` is now `MultilingualText | null` instead of `string | null`
- Components must use `getDisplayText()` or access `lesson.title.fr` directly
- Firestore documents now use `title_fr` instead of `title` (migration required)

## Migration Notes

Before deploying:
1. Run `npx ts-node scripts/migrate-i18n.ts --dry-run` to preview changes
2. Run `npx ts-node scripts/migrate-i18n.ts` to apply migration
3. Monitor for any documents that fail to migrate
4. Update Android app to read new i18n fields

---

Generated by Claude Code
Issue: #68
