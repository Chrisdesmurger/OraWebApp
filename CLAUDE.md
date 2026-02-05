# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OraWebApp is a Next.js admin portal for the **Ora wellbeing platform** (yoga, meditation, wellness). It provides administrative interfaces for managing users, programs, lessons, content, onboarding flows, and analytics with Supabase (PostgreSQL + Auth + Storage) backend.

**Target audience**: Administrators and teachers managing content for the Ora mobile app (Android + iOS).

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: React 18 + Tailwind CSS + shadcn/ui (Radix UI primitives)
- **Authentication**: Supabase Auth (Email/Password + Google OAuth + Magic Link)
- **Database**: PostgreSQL via Supabase
- **Storage**: Supabase Storage (media files)
- **Backend**: Supabase Client (server-side via Next.js Route Handlers)
- **Authorization**: Role-Based Access Control (RBAC) via `role` column in `users` table
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
```

## Architecture

### Data Flow
```
Client Components → fetchWithAuth() → API Routes → Supabase Service Client → PostgreSQL
                                                                            → Supabase Storage
                                                                            → Supabase Auth
Auth cookies are sent automatically (no manual token injection needed)
```

### Key Files
- [lib/api/fetch-with-auth.ts](lib/api/fetch-with-auth.ts) - Client-side authenticated fetch wrapper (ALWAYS use this)
- [lib/api/auth-middleware.ts](lib/api/auth-middleware.ts) - Server-side request authentication
- [lib/supabase/client.ts](lib/supabase/client.ts) - Supabase Browser Client (auth, storage helpers)
- [lib/supabase/server.ts](lib/supabase/server.ts) - Supabase Server Client (cookie-based + service role)
- [lib/supabase/middleware.ts](lib/supabase/middleware.ts) - Session refresh middleware
- [lib/auth/auth-context.tsx](lib/auth/auth-context.tsx) - React auth provider
- [lib/rbac.ts](lib/rbac.ts) - Role permissions definitions
- [lib/audit/logger.ts](lib/audit/logger.ts) - Audit logging utility
- [lib/storage.ts](lib/storage.ts) - Storage upload/download/delete helpers
- [lib/i18n/display-text.ts](lib/i18n/display-text.ts) - Multilingual text helpers
- [types/lesson.ts](types/lesson.ts) - Lesson types with DB ↔ Frontend mappers

### RBAC Roles
| Role | Capabilities |
|------|-------------|
| admin | Full access: users, content, programs, commands, stats, audit logs |
| teacher | Own content/programs, upload media, basic stats |
| viewer | Read-only content/programs access |

Roles are stored in the `role` column of the `users` PostgreSQL table (ENUM: admin, teacher, viewer, user).

### Main Features
1. **Authentication** - Supabase Auth (email/password, Google OAuth, magic link)
2. **Lesson CRUD + Media Upload** - Video/audio upload with transcoding
3. **Program Management** - Full CRUD, lesson ordering, categories
4. **Media Player** - Video/audio preview in admin
5. **Analytics Dashboard** - User growth, activity charts
6. **User Management** - Create/delete users, role management
7. **Program Cover Images** - Supabase Storage upload
8. **Audit Logging** - Change history, diff viewer
9. **Content Scheduling** - Auto-publish/archive dates
10. **Media Library** - Media management interface
11. **Onboarding Management** - Questionnaire editor, 9 layouts
12. **i18n Support** - FR/EN/ES multilingual, auto-translate

## CRITICAL: Database Field Naming Convention

**PostgreSQL uses snake_case**, frontend uses **camelCase**. All API routes MUST map between them.

### PostgreSQL Tables
```typescript
// users table
{ id, email, first_name, last_name, photo_url, plan_tier, role, created_at, updated_at }

// programs table
{ id, title, description, author_id, duration_days, cover_image_url, status, created_at, updated_at }

// lessons table (with i18n)
{ id, title_fr, title_en, title_es, description_fr, program_id, duration_sec, status, created_at, updated_at }

// audit_logs table
{ id, action, resource_type, resource_id, actor_id, actor_email, changes, ip_address, user_agent, created_at }

// onboarding_configs table
{ id, questions (JSONB), information_screens (JSONB), status, created_at, updated_at }
```

### API Mapping Pattern
```typescript
// ✅ CORRECT - Map snake_case to camelCase in API response
const { data: rows } = await supabase.from('users').select('*').order('created_at', { ascending: false });
const users = rows?.map(row => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  createdAt: row.created_at,
}));

// ✅ Supabase returns data directly as arrays (no .docs.map())
const { data, error } = await supabase.from('programs').select('*').eq('status', 'published');
```

### Supabase Query Patterns
```typescript
import { createSupabaseServiceClient } from '@/lib/supabase/server';

const supabase = createSupabaseServiceClient();

// List with filters
const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });

// Get single
const { data, error } = await supabase.from('programs').select('*').eq('id', id).single();

// Create
const { data: created, error } = await supabase.from('programs').insert(data).select().single();

// Update
const { error } = await supabase.from('programs').update(data).eq('id', id);

// Delete
const { error } = await supabase.from('programs').delete().eq('id', id);

// Count
const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
```

## i18n (Multilingual Support)

The app supports **French (fr), English (en), Spanish (es)** with French as primary/fallback language.

### Database i18n Pattern
Text fields use language suffixes in snake_case:
```typescript
// PostgreSQL row (snake_case with language suffix)
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

### Mapping Functions
- `mapLessonFromFirestore()` - DB row → Frontend (with i18n) - works with both Firestore and PostgreSQL snake_case
- `mapLessonToFirestore()` - Frontend → DB row (with i18n)

## Authentication

### Client-Side: ALWAYS use fetchWithAuth
```typescript
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';

// ✅ CORRECT - Supabase cookies are sent automatically
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

    const supabase = createSupabaseServiceClient();
    // ... your Supabase queries
    return apiSuccess({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return apiError(message, 401);
  }
}
```

### Audit Logging
All CRUD operations should be logged:
```typescript
import { logCreate, logUpdate, logDelete } from '@/lib/audit/logger';

// After creating a resource
logCreate({ resourceType: 'program', resourceId: id, actorId: user.uid, actorEmail: user.email || '', resource: data, request });

// After updating (with before/after diff)
logUpdate({ resourceType: 'program', resourceId: id, actorId: user.uid, actorEmail: user.email || '', before: oldData, after: newData, request });
```

## Supabase Storage

Three buckets:
- `media-lessons` - Video/audio/thumbnails for lessons
- `media-programs` - Cover images for programs
- `media-users` - User avatars

Storage paths follow: `{lessonId}/original/{filename}`, `{lessonId}/video/high.mp4`, etc.

Use `lib/storage.ts` helpers: `uploadFile()`, `getSignedUrl()`, `deleteFile()`, `deleteLessonMedia()`.

## SQL Schema

Schema files in `supabase/migrations/`:
- `00001_initial_schema.sql` - 17 tables with ENUM types
- `00002_indexes.sql` - 35+ indexes
- `00003_rls_policies.sql` - RLS policies + triggers
- `00004_storage_buckets.sql` - Storage buckets + policies
- `00005_fix_enums.sql` - Additional ENUM values

## Environment Variables

Required in `.env.local`:
```bash
# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase Admin (secret - server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional: Auto-translate feature
GOOGLE_TRANSLATE_API_KEY=...

# Optional: Email
RESEND_API_KEY=...
```

## Troubleshooting

### "Missing or invalid authentication"
Use `fetchWithAuth` instead of `fetch` for API calls. Supabase cookies are sent automatically.

### API returns empty array
1. Check PostgreSQL column names are snake_case in queries
2. Check RLS policies allow the query
3. Verify Supabase connection is configured

### Browser shows old code
```bash
rm -rf .next && pnpm dev  # Clear cache and restart
# Then Ctrl+Shift+R in browser
```

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
