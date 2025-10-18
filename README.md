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

### ✅ Content & Program Management
- CRUD operations for programs and lessons
- Upload media files (images, videos, audio)
- Drag & drop file uploads with progress tracking
- Teachers manage their own content, Admins manage all
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
The first user must be promoted to admin manually:

```bash
# Using Firebase CLI
firebase auth:export users.json
firebase functions:shell
# Then run: admin.auth().setCustomUserClaims('USER_UID', { role: 'admin' })
```

Or create an admin via the app's signup and use Firebase Console to set custom claims.

## 📊 API Endpoints

### Authentication
- `POST /api/auth/set-token` - Set auth cookie

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PATCH /api/users` - Update user
- `DELETE /api/users?uid=xxx` - Delete user

### Programs (Admin + Teacher)
- `GET /api/programs` - List programs
- `POST /api/programs` - Create program
- `PATCH /api/programs` - Update program
- `DELETE /api/programs?id=xxx` - Delete program

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

## 📚 Documentation

- [Firebase Setup Guide](docs/SETUP_FIREBASE.md)
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
