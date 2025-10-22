# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OraWebApp is a Next.js admin portal for managing the Ora wellbeing platform. It provides administrative interfaces for managing users, programs, lessons, content, and analytics with Firebase Authentication and Firestore backend.

## Tech Stack

- **Framework**: Next.js 15.5.6 (App Router)
- **Language**: TypeScript
- **UI**: React with Tailwind CSS + shadcn/ui components
- **Authentication**: Firebase Auth (Email/Password + Google Sign-In)
- **Database**: Cloud Firestore
- **Backend**: Firebase Admin SDK (server-side)
- **Authorization**: Role-Based Access Control (RBAC) with custom claims
- **Package Manager**: pnpm

## Architecture

### Frontend (Client-side)
- **App Router** structure with layouts and route groups
- **Client Components** (`'use client'`) for interactive UI
- **Server Components** for static content
- **Authentication Context** (`lib/auth/auth-context.tsx`) provides user state globally
- **Custom Hooks** for data fetching with authentication

### Backend (Server-side)
- **API Routes** in `app/api/` using Next.js Route Handlers
- **Firebase Admin SDK** for server-side operations
- **Middleware** (`lib/api/auth-middleware.ts`) for request authentication
- **RBAC** (`lib/rbac.ts`) for permission management

## CRITICAL: Firestore Field Naming Convention

**⚠️ IMPORTANT**: Firestore uses **snake_case** field names, but the frontend expects **camelCase**.

### Firestore Schema (snake_case)
```typescript
// users collection
{
  email: string
  first_name: string      // NOT firstName
  last_name: string       // NOT lastName
  photo_url: string       // NOT photoURL
  plan_tier: string       // NOT planTier
  role: string
  created_at: number      // NOT createdAt (timestamp)
  updated_at: number      // NOT updatedAt
  last_login_at: number   // NOT lastLoginAt
}

// programs collection
{
  title: string
  description: string
  author_id: string       // NOT authorId
  created_at: number      // NOT createdAt
  updated_at: number      // NOT updatedAt
  // ... check Console for exact field names
}

// lessons/content collection
{
  title: string
  program_id: string      // NOT programId
  created_at: number      // NOT createdAt
  // ... check Console for exact field names
}
```

### API Mapping Pattern

**All API routes MUST map snake_case (Firestore) to camelCase (Frontend)**:

```typescript
// ✅ CORRECT - Map fields in API response
const users = snapshot.docs.map((doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    email: data.email,
    firstName: data.first_name,        // Map snake_case to camelCase
    lastName: data.last_name,
    photoURL: data.photo_url,
    planTier: data.plan_tier,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
});

// ❌ WRONG - Don't spread Firestore data directly
return {
  id: doc.id,
  ...doc.data(), // This keeps snake_case!
};
```

### Firestore Queries

**Use snake_case in Firestore queries**:

```typescript
// ✅ CORRECT
firestore.collection('users').orderBy('created_at', 'desc')

// ❌ WRONG
firestore.collection('users').orderBy('createdAt', 'desc') // Field doesn't exist!
```

## Authentication & Authorization

### Client-Side Authentication

**ALWAYS use `fetchWithAuth` for authenticated API calls**:

```typescript
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';

// ✅ CORRECT - Automatically includes Firebase ID token
const response = await fetchWithAuth('/api/users');

// ❌ WRONG - Missing authentication
const response = await fetch('/api/users'); // Will return 401!
```

### Server-Side Authentication

All API routes are protected with `authenticateRequest`:

```typescript
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Authenticate and get user from Firebase token
    const user = await authenticateRequest(request);

    // Check permissions
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

### Role-Based Access Control (RBAC)

Roles are stored as **custom claims** in Firebase Auth:

- **admin**: Full access to all features
- **teacher**: Can manage own programs and lessons
- **viewer**: Read-only access

**Permissions** are defined in `lib/rbac.ts`:

```typescript
import { hasPermission } from '@/lib/rbac';

if (hasPermission(user.role, 'canEditUsers')) {
  // Allow action
}
```

## Project Structure

```
OraWebApp/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Route group for authenticated pages
│   │   └── analytics/
│   ├── admin/                    # Admin pages
│   │   ├── page.tsx              # Dashboard home
│   │   ├── stats/
│   │   ├── users/
│   │   ├── programs/
│   │   ├── content/
│   │   └── commands/
│   ├── api/                      # API Routes (server-side)
│   │   ├── auth/
│   │   ├── users/
│   │   ├── programs/
│   │   ├── lessons/
│   │   ├── stats/
│   │   └── admin/
│   ├── login/
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/
│   └── kpi-card.tsx
├── lib/
│   ├── api/
│   │   ├── auth-middleware.ts    # ⭐ Request authentication
│   │   └── fetch-with-auth.ts    # ⭐ Client-side auth wrapper
│   ├── auth/
│   │   ├── auth-context.tsx      # Auth provider
│   │   └── require-role.ts       # Role guard component
│   ├── firebase/
│   │   ├── admin.ts              # ⭐ Firebase Admin SDK (server)
│   │   └── client.ts             # Firebase Client SDK
│   ├── hooks/
│   │   └── use-stats.ts          # Data fetching hooks
│   ├── rbac.ts                   # ⭐ Role-based permissions
│   └── types/
├── scripts/
│   └── test-firestore.ts         # Firestore debugging script
├── .env.local                    # ⚠️ NEVER commit! Contains secrets
├── firebase.json
├── firestore.rules
└── package.json
```

## Environment Variables

Required in `.env.local`:

```bash
# Firebase Client SDK (public)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin SDK (secret - server-side only)
FIREBASE_SERVICE_ACCOUNT_JSON='{...}'  # Full service account JSON
```

## Common Development Tasks

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Test Firestore Connection
```bash
npx tsx scripts/test-firestore.ts
```

### Check Firebase CLI
```bash
firebase --version
firebase projects:list
```

## Troubleshooting

### "Missing or invalid authorization header"

**Cause**: Client-side fetch is not including Firebase ID token

**Solution**: Use `fetchWithAuth` instead of `fetch`:

```typescript
// ❌ WRONG
const response = await fetch('/api/users');

// ✅ CORRECT
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
const response = await fetchWithAuth('/api/users');
```

### API returns empty array `{ users: [] }`

**Causes**:
1. **Wrong field names in query**: Use `created_at` not `createdAt`
2. **Missing Firestore index**: Check Firebase Console > Firestore > Indexes
3. **Wrong database**: Check if using `(default)` database in Firebase Console
4. **Service Account permissions**: Verify service account has Firestore read/write access

**Debug**:
```typescript
// Add logging to API route
console.log('[API] Found', snapshot.size, 'documents');
snapshot.docs.forEach(doc => {
  console.log('[API] Doc fields:', Object.keys(doc.data()));
});
```

### Firebase Admin "already initialized" error

**Cause**: Firebase Admin SDK initialized multiple times

**Solution**: Already fixed in `lib/firebase/admin.ts` with singleton pattern:

```typescript
if (admin.apps.length > 0) {
  return admin.apps[0];
}
```

### Browser cache issues (old code still running)

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev

# Hard refresh in browser
Ctrl + Shift + R
```

## Key Files to Understand

1. **`lib/api/auth-middleware.ts`** - Authenticates all API requests
2. **`lib/api/fetch-with-auth.ts`** - Client-side wrapper for authenticated fetch
3. **`lib/firebase/admin.ts`** - Firebase Admin SDK initialization
4. **`lib/auth/auth-context.tsx`** - Client-side auth state management
5. **`lib/rbac.ts`** - Role and permission definitions
6. **`app/api/users/route.ts`** - Example API route with field mapping

## Recent Fixes (2025-10-23)

### Authentication Integration

✅ Fixed "Missing or invalid authorization header" errors across all admin pages:
- Created `fetchWithAuth` utility
- Updated all client-side API calls in:
  - `/admin/page.tsx`
  - `/admin/stats/page.tsx`
  - `/admin/users/page.tsx`
  - `/admin/programs/page.tsx`
  - `/admin/content/page.tsx`
  - `/admin/commands/page.tsx`

### Firestore Field Name Mapping

✅ Fixed empty data arrays caused by snake_case/camelCase mismatch:
- Updated `/api/users/route.ts` to use `created_at` instead of `createdAt`
- Added field mapping from snake_case (Firestore) to camelCase (Frontend)
- All API routes now properly map Firestore data structure

### Firebase Admin SDK

✅ Fixed double initialization error:
- Added check for `admin.apps.length > 0`
- Singleton pattern ensures only one instance

## Best Practices

### API Routes

1. **Always authenticate** with `authenticateRequest`
2. **Always check permissions** with `requireRole`
3. **Map field names** from snake_case to camelCase
4. **Use try-catch** and return proper error responses
5. **Add logging** for debugging

### Client Components

1. **Use `fetchWithAuth`** for all API calls
2. **Use `useAuth`** hook for current user
3. **Check permissions** with `hasPermission` before showing UI
4. **Handle loading** and error states

### Firestore Queries

1. **Use snake_case** field names in queries
2. **Create indexes** for complex queries (Firebase Console will prompt)
3. **Limit results** with `.limit(N)` for performance
4. **Use orderBy carefully** - requires index if combined with where

## Documentation

- Next.js App Router: https://nextjs.org/docs/app
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
- Firebase Auth: https://firebase.google.com/docs/auth
- Firestore: https://firebase.google.com/docs/firestore
- shadcn/ui: https://ui.shadcn.com

## Support

For issues or questions:
1. Check this CLAUDE.md file
2. Check Firebase Console for data structure
3. Check server logs for API errors
4. Check browser console for client errors
