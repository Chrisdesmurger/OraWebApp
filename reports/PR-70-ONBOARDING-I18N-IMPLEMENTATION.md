# PR #70: Onboarding i18n Implementation Report

## Overview

This PR implements **Phase 3** of the i18n feature: **Onboarding Multilingual Support** for the OraWebApp admin portal.

**Related Issues:**
- Issue #70: feat(i18n): Phase 3 - Onboarding Multilingual Support (FR/EN/ES)
- Issue #68: Parent i18n issue (Phases 1 & 2 completed in PR #69)
- Ora Android #39: Android app i18n (completed)

## Features Implemented

### 1. Questionnaire Editor with i18n (`app/admin/onboarding/[id]/page.tsx`)

**New Components:**
- `OptionEditor` - Expandable option editor with i18n fields
- `SortableQuestion` - Updated with TranslationFields for all text fields

**i18n Fields Added:**
- Question title (titleFr, titleEn, titleEs)
- Question subtitle (subtitleFr, subtitleEn, subtitleEs)
- Question hint (hintFr, hintEn, hintEs)
- Text input placeholder (placeholderFr, placeholderEn, placeholderEs)
- Option label (labelFr, labelEn, labelEs)
- Option description (descriptionFr, descriptionEn, descriptionEs)

**UX Improvements:**
- i18n info banner explaining the multilingual support
- Collapsible section for additional i18n fields (hint)
- Expandable translation panel for each option
- Language tabs with FR/EN/ES flags and completion status

### 2. Information Screens Editor (`app/admin/onboarding/[id]/information-screens/page.tsx`)

**Already Implemented (from unstaged changes):**
- Screen title (titleFr, titleEn, titleEs)
- Screen subtitle (subtitleFr, subtitleEn, subtitleEs)
- Screen content (contentFr, contentEn, contentEs)
- Bullet points (bulletPointsFr, bulletPointsEn, bulletPointsEs)
- CTA button text (ctaTextFr, ctaTextEn, ctaTextEs)

### 3. API Routes Updated

**`app/api/admin/onboarding/[id]/route.ts`**
- Enhanced PUT handler to accept all i18n fields
- Proper fallback handling (Fr -> base field)

**`app/api/admin/onboarding/route.ts`**
- POST handler accepts i18n fields for new configurations

**`app/api/admin/onboarding/[id]/information-screens/route.ts`**
- PUT handler with full i18n support
- Stores in both camelCase and snake_case formats

### 4. New Components

**`components/ui/collapsible.tsx`**
- Radix UI Collapsible component wrapper
- Used for expandable i18n sections

## Files Changed

### Modified Files (6)
| File | Lines Changed | Description |
|------|---------------|-------------|
| `app/admin/onboarding/[id]/page.tsx` | +450 | Full i18n support for questionnaire editor |
| `app/admin/onboarding/[id]/information-screens/page.tsx` | +233 | TranslationFields integration |
| `app/api/admin/onboarding/[id]/route.ts` | +23 | i18n field handling in PUT |
| `app/api/admin/onboarding/route.ts` | +13 | i18n field handling in POST |
| `package.json` | +1 | Added @radix-ui/react-collapsible |
| `package-lock.json` | +841 | Dependency updates |

### New Files (3)
| File | Lines | Description |
|------|-------|-------------|
| `components/ui/collapsible.tsx` | 13 | Radix Collapsible wrapper |
| `lib/onboarding/firestore-mappers.ts` | 149 | Onboarding-specific Firestore mappers |
| `app/api/admin/onboarding/[id]/information-screens/route.ts` | 217 | Information screens API |

## Technical Details

### Data Flow

```
Admin Portal (camelCase)
    |
    v
TranslationFields Component
    - value: { fr, en, es }
    - onChange: updates all fields
    |
    v
API Route (handles both formats)
    |
    v
Firestore (snake_case + camelCase)
    - title_fr, title_en, title_es
    - titleFr, titleEn, titleEs (legacy)
    |
    v
Android App
    - Reads snake_case fields
    - Uses Mappers to convert to camelCase
```

### Type Safety

All i18n fields are properly typed in `types/onboarding.ts`:
- `OnboardingQuestion`: titleFr/En/Es, subtitleFr/En/Es, hintFr/En/Es
- `AnswerOption`: labelFr/En/Es, descriptionFr/En/Es
- `QuestionTypeConfig`: placeholderFr/En/Es
- `InformationScreen`: All text fields with i18n variants

### Backward Compatibility

1. **Legacy base fields preserved**: `title`, `subtitle`, `hint`, etc.
2. **Fallback chain**: Fr translation falls back to base field if empty
3. **Both casing formats**: Stored in camelCase (legacy) and snake_case (Android)
4. **Existing content unaffected**: Empty translations default to French

## Testing Checklist

- [ ] Create new onboarding question with FR/EN/ES translations
- [ ] Edit existing question translations
- [ ] Add option with multilingual labels
- [ ] Expand option translation panel
- [ ] Save and verify Firestore data structure
- [ ] Create information screen with translations
- [ ] Verify Android app reads translated content
- [ ] Test with empty EN/ES (should fallback to FR)

## Dependencies Added

```json
{
  "@radix-ui/react-collapsible": "^1.x.x"
}
```

## Known Issues

1. **Turbopack symlink error on Windows**: The build fails with a symlink error due to Windows permissions. This is an environmental issue, not a code issue. The TypeScript compilation passes without errors.

## Screenshots

### Question Editor with i18n
- Title field with FR/EN/ES tabs
- Subtitle field with translation status
- Expandable hint section
- Option editor with translation panel

### Information Screen Editor
- Full TranslationFields integration
- Bullet points by language
- CTA button translations

## Next Steps

1. Add TranslationFields to profile_group field editor (optional)
2. Add translation coverage dashboard
3. Bulk import/export translations (CSV)
4. Auto-translate integration (optional)

---

**Author:** Claude Code (Anthropic)
**Date:** 2025-12-21
**Status:** Ready for Review
