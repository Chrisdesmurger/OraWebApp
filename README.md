# 🧘 Ora Admin Web Interface

Modern web admin dashboard for the Ora platform (yoga, meditation, well-being) enabling administrators and teachers to manage users, content, programs, and statistics.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Storage enabled
- Firebase service account JSON

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure Firebase credentials in .env
# Add your Firebase service account JSON to FIREBASE_SERVICE_ACCOUNT_JSON

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to `/login`.

## 📋 Features

### ✅ Authentication & Authorization
- Firebase Authentication (Email/Password + Google OAuth)
- Role-based access control (RBAC): `admin`, `teacher`, `viewer`
- Custom claims via Firebase Admin SDK
- Protected routes with middleware
- Session persistence

### ✅ User Management (Admin Only)
- View all users with search and filtering
- Create, update, and delete users
- Assign roles (admin/teacher/viewer)
- Track user activity and login history
- Bulk operations (delete fake users)

### ✅ Program Management
- **Full CRUD** operations for structured learning programs
- **Category-based organization**: Meditation, Yoga, Mindfulness, Wellness
- **Difficulty levels**: Beginner, Intermediate, Advanced
- **Status management**: Draft, Published, Archived
- **Lesson integration**: Add, reorder, and manage lessons in programs
- **Rich metadata**: Tags, cover images, duration tracking
- **Smart filtering**: Filter by category, status, search by title/description
- **RBAC enforcement**: Teachers manage their own, Admins manage all
- **Validation**: Triple-layer validation (Client, API, Firestore rules)

### ✅ Content & Lesson Management
- CRUD operations for lessons and media content
- Upload media files (images, videos, audio)
- Drag & drop file uploads with progress tracking
- Content status (draft/published)
- Tags and categorization

### ✅ Admin Commands
- Seed fake users for testing
- Purge fake users
- Seed sample content (programs/lessons)
- Wipe demo data
- Command execution logs and history

### ✅ Analytics Dashboard
- KPI cards: Total Users, Active Users, Programs, Lessons, Media
- User growth charts (Recharts)
- Activity charts (sessions, completions)
- Content distribution charts
- 60-second caching for performance

### ✅ Security
- Server-side authentication with Firebase Admin SDK
- HTTP-only cookies for token storage
- RBAC enforcement on API routes and pages
- Firestore security rules
- Storage security rules

## 🏗️ Architecture

### Tech Stack

| Area | Technology |
|------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| UI Components | Radix UI + lucide-react |
| Authentication | Firebase Auth |
| Database | Firestore |
| Storage | Firebase Cloud Storage |
| Backend | Next.js Route Handlers + Firebase Admin SDK |
| Charts | Recharts |
| Testing | Vitest + Playwright |
| Deployment | Vercel / Firebase Hosting |

### Project Structure

```
ora-admin/
├── app/
│   ├── login/page.tsx              # Login page
│   ├── admin/
│   │   ├── layout.tsx              # Admin layout with sidebar
│   │   ├── page.tsx                # Dashboard
│   │   ├── users/page.tsx          # User management
│   │   ├── content/page.tsx        # Content library
│   │   ├── programs/page.tsx       # Programs management
│   │   ├── commands/page.tsx       # Admin commands
│   │   └── stats/page.tsx          # Statistics
│   └── api/
│       ├── auth/set-token/route.ts # Set auth cookie
│       ├── users/route.ts          # User CRUD
│       ├── programs/route.ts       # Program CRUD
│       ├── lessons/route.ts        # Lesson CRUD
│       ├── commands/route.ts       # Execute commands
│       ├── stats/route.ts          # Analytics data
│       └── upload/route.ts         # File uploads
├── lib/
│   ├── firebase/
│   │   ├── admin.ts                # Firebase Admin SDK
│   │   └── client.ts               # Firebase Client SDK
│   ├── auth/
│   │   ├── auth-context.tsx        # Auth context provider
│   │   └── require-role.ts         # Server-side auth guards
│   ├── api/
│   │   └── auth-middleware.ts      # API authentication
│   ├── rbac.ts                     # Role permissions
│   ├── storage.ts                  # Cloud Storage utilities
│   └── utils.ts                    # Utility functions
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── admin/
│   │   ├── admin-sidebar.tsx       # Navigation sidebar
│   │   └── admin-header.tsx        # Header with user menu
│   ├── upload/
│   │   └── file-dropzone.tsx       # File upload component
│   ├── charts/                     # Recharts components
│   ├── dashboard/                  # Dashboard components
│   └── kpi-card.tsx                # KPI card component
├── scripts/
│   ├── set-user-role.ts            # Set user custom claims (RBAC)
│   ├── list-admin-users.ts         # List users with roles
│   ├── remove-user-role.ts         # Remove user roles
│   ├── seed-fake-users.ts          # Seed test users
│   ├── purge-fake-users.ts         # Remove test users
│   ├── seed-sample-content.ts      # Seed content
│   └── wipe-demo-data.ts           # Wipe all demo data
├── tests/
│   ├── unit/                       # Unit tests (Vitest)
│   └── e2e/                        # E2E tests (Playwright)
├── firestore.rules                 # Firestore security rules
├── storage.rules                   # Storage security rules
└── firestore.indexes.json          # Firestore indexes
```

## 🔐 Roles & Permissions

### Admin
- Full access to all features
- User management (create, edit, delete, assign roles)
- Content management (view, create, edit, delete all)
- Commands (seed, purge, wipe data)
- Advanced statistics

### Teacher
- Dashboard access
- Content management (view all, create, edit own)
- Program management (view all, create, edit own)
- Basic statistics

### Viewer
- No admin access
- Redirected to unauthorized page

## 🔥 Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password + Google)
4. Enable Firestore Database
5. Enable Cloud Storage

### 2. Get Service Account
1. Project Settings → Service Accounts
2. Generate new private key (downloads JSON)
3. Copy entire JSON as single-line string to `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env`

### 3. Deploy Security Rules
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Deploy rules
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

### 4. Set Custom Claims

**IMPORTANT:** Firebase custom claims **cannot** be set via the Firebase Console UI. You must use the Firebase Admin SDK.

We provide ready-to-use scripts for this:

```bash
# First, ensure FIREBASE_SERVICE_ACCOUNT_JSON is set in .env.local

# Set a user as admin
npx tsx scripts/set-user-role.ts admin@ora.com admin

# List all users with custom roles
npx tsx scripts/list-admin-users.ts

# Remove a user's role
npx tsx scripts/remove-user-role.ts user@ora.com
```

**Note:** Scripts auto-load `.env.local` using dotenv. `npx tsx` auto-installs on first use!

**Alternative: Use the Admin API** (after first admin is created):
```bash
curl -X POST http://localhost:3000/api/admin/set-role \
  -H "Authorization: Bearer YOUR_ADMIN_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uid":"USER_UID","role":"admin"}'
```

📖 **Full guide:** [docs/CUSTOM_CLAIMS_SETUP.md](docs/CUSTOM_CLAIMS_SETUP.md)

## 📊 API Endpoints

### Authentication
- `POST /api/auth/set-token` - Set auth cookie

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PATCH /api/users` - Update user
- `DELETE /api/users?uid=xxx` - Delete user

### Programs (Admin + Teacher)
- `GET /api/programs` - List programs (with filtering and search)
  - Query params: `category`, `status`, `search`
  - Returns: Array of programs with camelCase fields
- `GET /api/programs/[id]` - Get single program with lesson details
  - Returns: Program object + populated lesson details
- `POST /api/programs` - Create program
  - Body: `{ title, description, category, difficulty, durationDays, tags?, lessons? }`
  - Validation: Zod schema + Firestore rules
- `PATCH /api/programs/[id]` - Update program (partial updates)
  - Body: Any subset of program fields
  - Author verification for teachers
- `DELETE /api/programs/[id]` - Delete program
  - Admin: Can delete all
  - Teacher: Can delete own only
- `POST /api/programs/[id]/lessons` - Update lesson order
  - Body: `{ lessons: string[] }` (array of lesson IDs)
  - Validates all lesson IDs exist in Firestore

### Lessons (Admin + Teacher)
- `GET /api/lessons?programId=xxx` - List lessons
- `POST /api/lessons` - Create lesson
- `PATCH /api/lessons` - Update lesson
- `DELETE /api/lessons?id=xxx` - Delete lesson

### Commands (Admin only)
- `GET /api/commands` - List commands
- `POST /api/commands` - Execute command

### Stats (Admin + Teacher)
- `GET /api/stats` - Get dashboard statistics (cached 60s)

### Upload (Admin + Teacher)
- `POST /api/upload` - Upload file to Cloud Storage

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
# Set test credentials in .env
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=password123

# Run tests
npm run test:e2e
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# FIREBASE_SERVICE_ACCOUNT_JSON
# NEXT_PUBLIC_FIREBASE_*
```

### Firebase Hosting
```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

## 📖 Programs Feature

### Overview
Programs are structured learning paths that combine multiple lessons into a cohesive experience. Each program has:
- **Category**: meditation, yoga, mindfulness, wellness
- **Difficulty**: beginner, intermediate, advanced
- **Duration**: 1-365 days
- **Lessons**: Ordered list of lesson IDs
- **Metadata**: Title, description, tags, cover image, author
- **Status**: draft (editing), published (live), archived (hidden)

### Data Model

**Firestore Collection**: `programs`

**Schema** (snake_case in Firestore, camelCase in frontend):
```typescript
{
  title: string;              // 3-100 characters
  description: string;        // 10-1000 characters
  category: Category;         // enum
  difficulty: Difficulty;     // enum
  duration_days: number;      // 1-365
  lessons: string[];          // Array of lesson IDs
  cover_image_url: string | null;
  status: ProgramStatus;      // draft | published | archived
  author_id: string;          // Firebase Auth UID
  tags: string[];             // Max 10 tags
  created_at: string;         // ISO timestamp
  updated_at: string;         // ISO timestamp
}
```

### UI Components

1. **ProgramTable** ([programs/_components/ProgramTable.tsx](app/admin/programs/_components/ProgramTable.tsx))
   - Category-specific icons (Brain, User, Sparkles, Heart)
   - Color-coded badges for categories
   - Actions: View, Edit, Delete, Publish/Unpublish, Manage Lessons

2. **CreateProgramDialog** ([programs/_components/CreateProgramDialog.tsx](app/admin/programs/_components/CreateProgramDialog.tsx))
   - React Hook Form with Zod validation
   - Tag management with press-Enter-to-add
   - Toast notifications for success/error

3. **EditProgramDialog** ([programs/_components/EditProgramDialog.tsx](app/admin/programs/_components/EditProgramDialog.tsx))
   - Pre-filled form with existing program data
   - Partial update support
   - Status management

4. **LessonPickerDialog** ([programs/_components/LessonPickerDialog.tsx](app/admin/programs/_components/LessonPickerDialog.tsx))
   - Multi-select lessons with search
   - Checkbox list in scrollable area

5. **DraggableLessonList** ([programs/_components/DraggableLessonList.tsx](app/admin/programs/_components/DraggableLessonList.tsx))
   - Drag-and-drop reordering with @dnd-kit
   - Visual feedback during drag

### Validation

**Triple-layer validation:**

1. **Client-side** (React Hook Form + Zod)
   - Immediate feedback on form fields
   - Type-safe validation with `createProgramSchema`

2. **API-side** (Zod in route handlers)
   - Validates all incoming requests
   - Returns 400 with detailed errors

3. **Firestore Rules** (firestore.rules)
   - Final validation before write
   - Ensures data integrity even with direct SDK access
   - `validateProgramData()` function enforces schema

### Permissions

| Action | Admin | Teacher | Viewer |
|--------|-------|---------|--------|
| List all programs | ✅ | ✅ | ❌ |
| View published programs | ✅ | ✅ | ❌ |
| View draft programs | ✅ | Own only | ❌ |
| Create program | ✅ | ✅ | ❌ |
| Edit any program | ✅ | Own only | ❌ |
| Delete any program | ✅ | Own only | ❌ |
| Publish/Archive | ✅ | Own only | ❌ |

### Migration

Migrated 10 test programs from old format (camelCase) to new format (snake_case):
- Script: [scripts/migrate-programs.ts](scripts/migrate-programs.ts)
- Adjustments: [scripts/adjust-programs.ts](scripts/adjust-programs.ts)
- Verification: [scripts/list-programs.ts](scripts/list-programs.ts)

### Field Name Convention

**IMPORTANT:** The admin portal uses **snake_case** for Firestore backend fields and **camelCase** for frontend TypeScript models.

- **Firestore**: `duration_days`, `cover_image_url`, `author_id`
- **Frontend**: `durationDays`, `coverImageUrl`, `authorId`
- **Mappers**: `mapProgramFromFirestore()`, `mapProgramToFirestore()` handle conversion

This differs from the Android app which uses **camelCase** in Firestore. Be aware when querying/writing data.

## 📚 Documentation

- [Firebase Setup Guide](docs/SETUP_FIREBASE.md)
- [Custom Claims Setup](docs/CUSTOM_CLAIMS_SETUP.md) - **RBAC role assignment**
- [Android Compatibility Guide](ANDROID_COMPATIBILITY_GUIDE.md) - **Firebase dual-app setup**
- [Admin Commands](docs/ADMIN_COMMANDS.md)
- [Analytics Components](docs/ANALYTICS_COMPONENTS_SUMMARY.md)
- [Deployment Guide](docs/DEPLOY_VERCEL.md)

## 🎨 Design System

- **Primary Color**: Orange coral (#F18D5C)
- **Secondary**: Peach (#F5C9A9)
- **Background**: Warm beige (#F5EFE6)
- **Accessibility**: WCAG AA compliant
- **Icons**: lucide-react
- **Components**: shadcn/ui (Radix UI primitives)

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines first.

## 📧 Support

For issues and questions, please open a GitHub issue.

---

Built with ❤️ by SmartKiwiTech
