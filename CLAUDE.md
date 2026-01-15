# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OraWebApp is a Next.js admin portal for the **Ora wellbeing platform** (yoga, meditation, wellness). It provides administrative interfaces for managing users, programs, lessons, content, onboarding flows, and analytics with Firebase Authentication and Firestore backend.

**Target audience**: Administrators and teachers managing content for the Ora mobile app (Android).

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: React 18 + Tailwind CSS + shadcn/ui (Radix UI primitives)
- **Authentication**: Firebase Auth (Email/Password + Google Sign-In)
- **Database**: Cloud Firestore
- **Storage**: Firebase Cloud Storage (media files)
- **Backend**: Firebase Admin SDK (server-side via Next.js Route Handlers)
- **Authorization**: Role-Based Access Control (RBAC) with Firebase custom claims
- **Forms**: React Hook Form + Zod validation
- **Drag & Drop**: @dnd-kit (lesson reordering)
- **Charts**: Recharts
- **Testing**: Vitest (unit) + Playwright (E2E)

## Commands

```bash
# Development
pnpm dev              # Start dev server at localhost:3000
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type checking

# Testing
pnpm test             # Run Vitest unit tests
pnpm test:e2e         # Run Playwright E2E tests

# Firebase Admin Scripts (require .env.local with FIREBASE_SERVICE_ACCOUNT_JSON)
pnpm set-role <email> <role>     # Set user role: admin | teacher | viewer
pnpm list-admins                  # List all users with custom roles
pnpm remove-role <email>          # Remove user's custom role

# Seeding/Migration Scripts
pnpm seed-onboarding              # Seed onboarding flow data
pnpm add-info-screens             # Add information screens
pnpm import-personalization       # Import personalization config

# Firebase CLI
firebase deploy --only firestore:rules    # Deploy Firestore rules
firebase deploy --only storage:rules      # Deploy Storage rules
```

## Architecture

### Data Flow
```
Client Components → fetchWithAuth() → API Routes → Firebase Admin SDK → Firestore
                          ↓
              Includes Firebase ID token
```

### Key Files
- [lib/api/fetch-with-auth.ts](lib/api/fetch-with-auth.ts) - Client-side authenticated fetch wrapper (ALWAYS use this)
- [lib/api/auth-middleware.ts](lib/api/auth-middleware.ts) - Server-side request authentication
- [lib/firebase/admin.ts](lib/firebase/admin.ts) - Firebase Admin SDK singleton
- [lib/firebase/client.ts](lib/firebase/client.ts) - Firebase Client SDK
- [lib/auth/auth-context.tsx](lib/auth/auth-context.tsx) - React auth provider
- [lib/rbac.ts](lib/rbac.ts) - Role permissions definitions
- [lib/audit/logger.ts](lib/audit/logger.ts) - Audit logging utility
- [lib/i18n/display-text.ts](lib/i18n/display-text.ts) - Multilingual text helpers
- [types/lesson.ts](types/lesson.ts) - Lesson types with Firestore ↔ Frontend mappers

### RBAC Roles
| Role | Capabilities |
|------|-------------|
| admin | Full access: users, content, programs, commands, stats, audit logs |
| teacher | Own content/programs, upload media, basic stats |
| viewer | Read-only content/programs access |

### Main Features (by PR/Issue)
1. **Authentication & Firestore** (PR #1-2) - fetchWithAuth, snake_case mapping
2. **Lesson CRUD + Media Upload** (PR #3-5) - Video/audio upload, transcoding
3. **Program Management** (PR #7) - Full CRUD, lesson ordering, categories
4. **Media Player** (#12) - Video/audio preview in admin
5. **Analytics Dashboard** (#14) - User growth, activity charts
6. **User Management** (#15) - Create/delete users
7. **Program Cover Images** (#16) - Firebase Storage upload
8. **Audit Logging** (#21) - Change history, diff viewer
9. **Content Scheduling** (#22) - Auto-publish/archive dates
10. **Media Library** (#25) - Media management interface
11. **Onboarding Management** (#48-57) - Questionnaire editor, 9 layouts
12. **i18n Support** (#68-72) - FR/EN/ES multilingual, auto-translate

## CRITICAL: Firestore Field Naming Convention

**Firestore uses snake_case**, frontend uses **camelCase**. All API routes MUST map between them.

### Firestore Collections
```typescript
// users collection
{ email, first_name, last_name, photo_url, plan_tier, role, created_at, updated_at }

// programs collection
{ title, description, author_id, duration_days, cover_image_url, status, created_at, updated_at }

// lessons collection (with i18n)
{ title_fr, title_en, title_es, description_fr, program_id, duration_sec, status, created_at, updated_at }

// audit_logs collection
{ action, resource_type, resource_id, actor_id, actor_email, changes, ip_address, user_agent, created_at }

// onboarding_configs collection
{ questions: [], information_screens: [], published, created_at, updated_at }
```

### API Mapping Pattern
```typescript
// ✅ CORRECT - Map snake_case to camelCase in API response
const users = snapshot.docs.map((doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    firstName: data.first_name,    // Map field names
    lastName: data.last_name,
    createdAt: data.created_at,
  };
});

// ❌ WRONG - Never spread Firestore data directly
return { id: doc.id, ...doc.data() };  // Keeps snake_case!
```

### Firestore Queries
```typescript
// ✅ Use snake_case in queries
firestore.collection('users').orderBy('created_at', 'desc')

// ❌ This will fail - field doesn't exist
firestore.collection('users').orderBy('createdAt', 'desc')
```

## i18n (Multilingual Support)

The app supports **French (fr), English (en), Spanish (es)** with French as primary/fallback language.

### Firestore i18n Pattern
Text fields use language suffixes:
```typescript
// Firestore document (snake_case with language suffix)
{
  title_fr: "Méditation du matin",
  title_en: "Morning Meditation",
  title_es: "Meditación matutina",
}
```

### Frontend i18n Pattern
```typescript
import type { MultilingualText } from '@/types/lesson';
import { getDisplayText, getSearchableText } from '@/lib/i18n/display-text';

// Get display text (falls back: preferred → fr → en → es)
getDisplayText(title, 'en')  // Returns English or falls back

// Get all text for search
getSearchableText(title)  // Combines all languages
```

### Auto-Translate Feature
Uses Google Cloud Translation API (`/api/translate`):
- Translates FR → EN + ES in single API call
- Requires `GOOGLE_TRANSLATE_API_KEY` in .env.local
- UI: 🌐 button next to FR fields

### Mapping Functions
- `mapLessonFromFirestore()` - Firestore → Frontend (with i18n)
- `mapLessonToFirestore()` - Frontend → Firestore (with i18n)
- `mapLessonFromFirestoreLegacy()` - For backward compatibility (French only)

## Authentication

### Client-Side: ALWAYS use fetchWithAuth
```typescript
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';

// ✅ CORRECT - Automatically includes Firebase ID token
const response = await fetchWithAuth('/api/users');

// ❌ WRONG - Will return 401 Unauthorized
const response = await fetch('/api/users');
```

### Server-Side: API Route Pattern
```typescript
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    // ... your logic
    return apiSuccess({ data });
  } catch (error: any) {
    return apiError(error.message, 401);
  }
}
```

### Audit Logging
All CRUD operations should be logged:
```typescript
import { logCreate, logUpdate, logDelete } from '@/lib/audit/logger';

// After creating a resource
await logCreate(request, 'program', program.id, programData);

// After updating (with before/after diff)
await logUpdate(request, 'program', id, beforeState, afterState);

// After deleting
await logDelete(request, 'lesson', id, deletedData);
```

## Onboarding System

The onboarding questionnaire system supports:
- **Question Types**: single_choice, multiple_choice, slider, circular_picker, text_input, profile_group
- **9 Layout Types**: cards, image_cards, grid, list, swipe, scale, emoji, circular_picker, info_screen
- **Information Screens**: Welcome screens with features, bullet points, CTAs
- **Recommendation Rules**: Dynamic content recommendations based on answers

Key files:
- [app/admin/onboarding/](app/admin/onboarding/) - Admin UI for managing onboarding
- `onboarding_configs` collection in Firestore

## Environment Variables

Required in `.env.local`:
```bash
# Firebase Client SDK (public - NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin SDK (secret - server-side only)
FIREBASE_SERVICE_ACCOUNT_JSON='{...}'  # Full service account JSON as single line

# Optional: Auto-translate feature
GOOGLE_TRANSLATE_API_KEY=...
```

## Troubleshooting

### "Missing or invalid authorization header"
Use `fetchWithAuth` instead of `fetch` for API calls.

### API returns empty array
1. Check Firestore field names are snake_case in queries
2. Check Firebase Console > Firestore > Indexes for missing indexes
3. Verify service account has Firestore read/write access

### Firebase Admin "already initialized" error
Already handled in `lib/firebase/admin.ts` with singleton pattern.

### Browser shows old code
```bash
rm -rf .next && pnpm dev  # Clear cache and restart
# Then Ctrl+Shift+R in browser
```

### Upload fails with 308 status
Firebase Storage resumable uploads return 308 (Resume Incomplete) for successful chunks - this is normal, not an error.

## UI Components

- shadcn/ui components in [components/ui/](components/ui/)
- Drag-and-drop with @dnd-kit for lesson reordering
- Charts with Recharts
- Icons with lucide-react
- Design system: Orange coral (#F18D5C), Peach (#F5C9A9), Warm beige (#F5EFE6)

## API Endpoints Summary

| Endpoint | Methods | Access | Description |
|----------|---------|--------|-------------|
| `/api/users` | GET, POST, PATCH, DELETE | admin | User management |
| `/api/programs` | GET, POST | admin, teacher | Program CRUD |
| `/api/programs/[id]` | GET, PATCH, DELETE | admin, teacher | Single program |
| `/api/programs/[id]/lessons` | POST | admin, teacher | Update lesson order |
| `/api/lessons` | GET, POST | admin, teacher | Lesson CRUD |
| `/api/lessons/[id]` | PATCH, DELETE | admin, teacher | Single lesson |
| `/api/stats` | GET | admin, teacher | Dashboard stats |
| `/api/analytics/*` | GET | admin, teacher | Charts data |
| `/api/audit-logs` | GET | admin | Audit log viewer |
| `/api/commands` | GET, POST | admin | Admin commands |
| `/api/upload` | POST | admin, teacher | File upload |
| `/api/translate` | POST | admin, teacher | Auto-translate |
| `/api/onboarding/*` | GET, POST, PUT | admin | Onboarding management |
| `/api/scheduled-content` | GET | admin, teacher | Scheduled content calendar |
