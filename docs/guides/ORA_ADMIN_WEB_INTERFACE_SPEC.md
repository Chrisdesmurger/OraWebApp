# 🧭 ORA ADMIN WEB INTERFACE — MASTER DEVELOPMENT SPEC

## 🔰 Project Name
**Ora Admin Web Interface**

---

## 🎯 Global Objective
Build a **modern web admin dashboard** for the Ora platform (yoga, meditation, well-being) enabling administrators and teachers to manage users, content, and statistics.

This file serves as a **blueprint for multi-agent development orchestration**.  
Each agent (UI, Firebase, Backend, Analytics, etc.) can read its dedicated section, generate code, and coordinate progress.

---

## 🧱 Core Technologies

| Area | Tech |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui + lucide-react |
| Auth | Firebase Authentication |
| Database | Firestore |
| Storage | Firebase Cloud Storage |
| Backend | Next.js Route Handlers + Firebase Admin SDK |
| Tests | Vitest + Playwright |
| Deployment | Vercel (preferred) or Firebase Hosting |

---

## 🧩 Key Modules

### 1. Authentication & RBAC
- Firebase Auth (Email/Password + Google OAuth)
- Role-based access control (RBAC): `admin`, `teacher`, `viewer`
- Custom Claims via Firebase Admin
- Middleware to protect `/admin/**`
- Persistent login session via `onAuthStateChanged`
- Role guards in server components and API routes

**Agents Involved:**
- `auth-agent`: Handles Firebase setup, login/logout pages, middleware, and RBAC guards.
- `firebase-agent`: Configures service accounts, `.env`, and Firestore rules.

---

### 2. User Management
- Page: `/admin/users`
- CRUD for users (read/update/delete)
- Filters by role, creation date, fake flag
- Bulk actions (assign role, delete fake)
- Detail view with audit and last activity
- Optional: Pagination + search with debounced input

**Agents Involved:**
- `ui-agent`: Builds table views, forms, and filters
- `api-agent`: Implements `/api/users` endpoints using Firebase Admin SDK
- `rbac-agent`: Ensures route security and access-level validation

---

### 3. Content & Program Management (Teachers)
- Page: `/admin/content`
- CRUD Programs and Lessons
- Upload video/audio/doc files to Cloud Storage
- Drag & drop lesson ordering
- Metadata management: title, description, tags, duration
- Teachers manage their own programs, Admin manages all

**Agents Involved:**
- `ui-agent`: UI for content manager, upload components
- `storage-agent`: Upload & retrieval system with signed URLs
- `firestore-agent`: Data model for programs and lessons

---

### 4. Commands & Scripts Page
- Page: `/admin/commands`
- Run backend scripts such as:
  - `seedFakeUsers(count)`
  - `purgeFakeUsers()`
  - `seedSampleContent()`
  - `wipeDemoData()`
- Display command output and logs
- Protect all commands with Admin-only access

**Agents Involved:**
- `commands-agent`: Implements command scripts and console view
- `firebase-agent`: Handles Firestore command logs
- `backend-agent`: Implements secure server actions to trigger scripts

---

### 5. Statistics Dashboard
- Page: `/admin` (default)
- Show metrics:
  - Total users
  - Active users (7d / 30d)
  - Total programs / lessons
  - Uploaded media size
- Simple charts using Recharts (no custom colors)
- Stats refreshed via `/api/stats` route (cached 60s)

**Agents Involved:**
- `stats-agent`: Aggregation queries and chart rendering
- `api-agent`: Stats endpoint implementation
- `ui-agent`: KPI cards and chart UI

---

## 🧮 Firestore Structure

```text
users/{uid}:
  displayName, email, photoURL, role, createdAt, lastLoginAt, isFake

programs/{programId}:
  title, description, level, tags[], status, authorId, coverUrl, mediaCount, createdAt, updatedAt

lessons/{lessonId}:
  title, type, storagePath, durationSec, order, transcript, createdAt

media/{mediaId}:
  type, storagePath, mimeType, size, uploadedBy, linkedTo, createdAt

audit_logs/{logId}:
  actorUid, action, targetType, targetId, ts, meta

stats/daily/{YYYYMMDD}:
  usersTotal, newUsers, activeUsers, programsTotal, lessonsTotal

commands/{commandId}:
  name, label, lastRunAt, lastStatus, lastOutput
```

---

## 🧰 Firebase Rules (FireStore)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function hasRole(r) { return request.auth.token.role == r; }
    function isAdmin() { return hasRole('admin'); }
    function isTeacher() { return hasRole('teacher'); }
    function isOwner(uid) { return request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if isAdmin() || isOwner(uid);
      allow write: if isAdmin();
    }

    match /programs/{id} {
      allow read: if request.auth != null;
      allow create: if isTeacher() || isAdmin();
      allow update, delete: if isAdmin() || (isTeacher() && request.resource.data.authorId == request.auth.uid);
    }

    match /lessons/{id} {
      allow read: if request.auth != null;
      allow write: if isTeacher() || isAdmin();
    }

    match /commands/{id} {
      allow read, write: if isAdmin();
    }
  }
}
```

---

## 🗃️ Project Structure
```bash
ora-admin/
  app/
    login/page.tsx
    admin/layout.tsx
    admin/page.tsx
    admin/users/page.tsx
    admin/content/page.tsx
    admin/commands/page.tsx
    api/users/route.ts
    api/programs/route.ts
    api/lessons/route.ts
    api/commands/route.ts
    api/stats/route.ts
  lib/
    firebase/client.ts
    firebase/admin.ts
    auth/require-role.ts
    rbac.ts
    storage.ts
  components/
    ui/
    tables/
    upload/
    charts/
  scripts/
    seed-fake-users.ts
    purge-fake-users.ts
    seed-sample-content.ts
    wipe-demo-data.ts
  tests/
    unit/
    e2e/
  .env.example
  README.md
```

---

## 🧠 Agents Suggested

| Agent Name | Responsibility |
|-------------|----------------|
| **auth-agent** | Firebase Auth, RBAC, login page, middleware |
| **firebase-agent** | Firestore rules, admin SDK, .env setup |
| **ui-agent** | Dashboard, users, content UI with shadcn/ui |
| **api-agent** | REST endpoints (users, programs, stats) |
| **storage-agent** | Uploads to Cloud Storage, signed URLs |
| **commands-agent** | CLI + UI for seed/purge commands |
| **stats-agent** | Chart data aggregation, KPI logic |
| **rbac-agent** | Guards for API and components |
| **docs-agent** | Generates README + Developer setup guide |

---

## ✅ Acceptance Criteria
- Admin can log in, see dashboard, run commands, and manage all data.
- Teachers can manage their own programs.
- Viewers cannot access admin routes.
- RBAC enforced on both client and server.
- Uploads and media links functional.
- Firestore and Storage rules validated.
- UI matches Ora’s design system.

---

**End of Specification**
