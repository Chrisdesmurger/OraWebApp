# 🧘 Ora Admin Web Interface

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11.0-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

Modern, production-ready admin dashboard for the **Ora wellbeing platform** (yoga, meditation, mindfulness). Built with Next.js 15, Firebase, and TypeScript.

## ✨ Features

- 🔐 **Complete Authentication** - Firebase Auth (Email/Password + Google OAuth)
- 👥 **User Management** - CRUD operations with role-based access control
- 📚 **Content Management** - Programs, lessons, and media uploads
- 📊 **Analytics Dashboard** - Real-time stats with beautiful charts
- 🎨 **Modern UI** - Tailwind CSS + shadcn/ui components
- 🔒 **Security First** - Firestore rules, RBAC, JWT verification
- 📱 **Responsive** - Works beautifully on mobile and desktop
- ♿ **Accessible** - WCAG AA compliant
- 🧪 **Tested** - Unit tests (Vitest) + E2E tests (Playwright)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Chrisdesmurger/OraWebApp.git
cd OraWebApp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Firebase credentials

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app!

📖 **Complete setup guide**: [QUICK_START.md](QUICK_START.md)

## 📸 Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x400/F18D5C/FFFFFF?text=Dashboard+with+KPI+Cards)

### User Management
![Users](https://via.placeholder.com/800x400/F5C9A9/000000?text=User+Management+Table)

### Analytics
![Analytics](https://via.placeholder.com/800x400/F5EFE6/000000?text=Analytics+Charts)

## 🏗️ Architecture

```
OraWebApp/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes (REST endpoints)
│   └── login/             # Authentication pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── admin/            # Admin-specific components
│   ├── charts/           # Recharts visualization
│   └── upload/           # File upload components
├── lib/                   # Core libraries
│   ├── firebase/         # Firebase setup (Admin + Client)
│   ├── auth/             # Authentication utilities
│   └── api/              # API middleware
├── tests/                # Test suites
│   ├── unit/            # Vitest unit tests
│   └── e2e/             # Playwright E2E tests
├── firestore.rules       # Firestore security rules
├── storage.rules         # Cloud Storage security rules
└── docs/                 # Documentation
```

## 🎯 Roles & Permissions

| Role | Dashboard | Users | Content | Programs | Commands | Stats |
|------|-----------|-------|---------|----------|----------|-------|
| **Admin** | ✅ | ✅ | ✅ (all) | ✅ (all) | ✅ | ✅ (advanced) |
| **Teacher** | ✅ | ❌ | ✅ (own) | ✅ (own) | ❌ | ✅ (basic) |
| **Viewer** | ❌ | ❌ | ✅ (view) | ✅ (view) | ❌ | ❌ |

## 🔥 Firebase Setup

1. Create a Firebase project
2. Enable Authentication (Email + Google)
3. Enable Firestore Database
4. Enable Cloud Storage
5. Get service account JSON
6. Deploy security rules

📖 **Complete Firebase setup**: [docs/SETUP_FIREBASE.md](docs/SETUP_FIREBASE.md)

## 📦 Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5.7 (strict) |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui |
| **UI Components** | Radix UI primitives |
| **Icons** | lucide-react |
| **Auth** | Firebase Authentication |
| **Database** | Firestore |
| **Storage** | Firebase Cloud Storage |
| **Backend** | Next.js Route Handlers + Firebase Admin SDK |
| **Charts** | Recharts 2.13 |
| **Forms** | React Hook Form + Zod |
| **Testing** | Vitest + Playwright |
| **Deployment** | Vercel / Firebase Hosting |

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel
```

📖 **Complete deployment guide**: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

## 📚 Documentation

- [README.md](README.md) - Complete project documentation
- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [docs/SETUP_FIREBASE.md](docs/SETUP_FIREBASE.md) - Firebase configuration
- [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) - Deployment guide
- [docs/ADMIN_COMMANDS.md](docs/ADMIN_COMMANDS.md) - Admin commands
- [PROJECT_COMPLETION_REPORT.md](PROJECT_COMPLETION_REPORT.md) - Technical report

## 🎨 Design System

- **Primary Color**: Orange coral `#F18D5C`
- **Secondary**: Peach `#F5C9A9`
- **Background**: Warm beige `#F5EFE6`
- **Typography**: Inter (Google Fonts)
- **Accessibility**: WCAG AA compliant
- **Responsive**: Mobile-first approach

## 📊 Project Stats

- **Files Created**: 101
- **Lines of Code**: 19,671
- **Components**: 30+
- **API Endpoints**: 8
- **Test Suites**: 3
- **Documentation Pages**: 6

## 🤖 AI-Assisted Development

This project uses **GitHub + Claude Code** for AI-assisted development:

- **📋 Spec Generation**: AI generates technical specs from feature requests
- **🧪 Test Analysis**: AI diagnoses test failures and suggests fixes
- **🔒 Security Audits**: Automated CodeQL + dependency scanning
- **📝 Release Automation**: Auto-generated changelog from commits

**Quick Start**:
1. Create a feature request → AI generates spec
2. Implement following the spec
3. Open PR → CI runs automatically
4. If tests fail → AI suggests fixes
5. Merge → Auto-release notes

📖 **Complete workflow guide**: [docs/GITHUB_WORKFLOW_SETUP.md](../docs/GITHUB_WORKFLOW_SETUP.md)

## 🤝 Contributing

Contributions are welcome! **We use an AI-assisted workflow** for faster, higher-quality development.

**Please read**:
- [🚀 Contributing Guide](CONTRIBUTING.md) - Full workflow documentation
- [📋 GitHub Setup Summary](../docs/GITHUB_SETUP_SUMMARY.md) - Quick reference

**Quick workflow**:
1. Create issue using templates (🚀 Feature / 🐛 Bug / 📋 Spec)
2. Wait for AI-generated spec (for features)
3. Get assigned
4. Create branch (`feat/feature-name` or `fix/bug-name`)
5. Implement with tests
6. Open PR (fill template)
7. CI validates automatically
8. Review + merge

**Conventional Commits** required:
```bash
feat(scope): Add new feature
fix(scope): Fix bug
docs(scope): Update documentation
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Charts powered by [Recharts](https://recharts.org/)
- Backend by [Firebase](https://firebase.google.com/)

## 📧 Contact

**SmartKiwiTech** - [@Chrisdesmurger](https://github.com/Chrisdesmurger)

Project Link: [https://github.com/Chrisdesmurger/OraWebApp](https://github.com/Chrisdesmurger/OraWebApp)

---

<div align="center">

**Built with ❤️ using Claude Code (Multi-Agent Orchestration)**

⭐ Star this repository if you find it helpful!

</div>
