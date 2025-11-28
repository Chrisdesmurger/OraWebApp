# Contributing to Ora Admin Web Interface

Thank you for your interest in contributing to Ora Admin Web Interface! 🎉

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/OraWebApp.git
   cd OraWebApp
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Add your Firebase test project credentials
   ```
5. **Start development server**:
   ```bash
   npm run dev
   ```

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Use strict mode, avoid `any` types
- **Formatting**: Prettier (2 spaces, single quotes)
- **Naming**:
  - Components: PascalCase (`UserTable.tsx`)
  - Functions: camelCase (`getUserData`)
  - Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **File organization**:
  - One component per file
  - Co-locate tests with components
  - Use index.ts for barrel exports

### Component Guidelines

```typescript
// ✅ Good
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{user.displayName}</h3>
      <Button onClick={() => onEdit(user)} disabled={loading}>
        Edit
      </Button>
    </div>
  );
}
```

### API Routes

- Use `authenticateRequest` middleware for all protected routes
- Validate input with Zod schemas
- Return proper HTTP status codes
- Handle errors gracefully

```typescript
// ✅ Good
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    // Validate with Zod...

    return apiSuccess({ data }, 201);
  } catch (error: any) {
    return apiError(error.message, 500);
  }
}
```

### Testing

- **Unit tests**: Test business logic and utilities
- **E2E tests**: Test user flows and integrations
- **Coverage**: Aim for >80% coverage on critical paths

```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Watch mode
npm test -- --watch
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add user export functionality
fix: Resolve authentication loop issue
docs: Update Firebase setup guide
style: Format code with Prettier
refactor: Simplify RBAC logic
test: Add tests for user management
chore: Update dependencies
```

## 🔍 Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clean, documented code
   - Add tests for new features
   - Update documentation

3. **Test thoroughly**:
   ```bash
   npm test
   npm run test:e2e
   npm run type-check
   npm run lint
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: Add amazing feature"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**:
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changed and why
   - Add screenshots for UI changes

## 🐛 Bug Reports

Use the [GitHub Issues](https://github.com/Chrisdesmurger/OraWebApp/issues) page.

**Include**:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment (OS, browser, Node version)
- Error messages or console logs

## 💡 Feature Requests

We love new ideas!

**Include**:
- Clear description of the feature
- Use case / problem it solves
- Proposed solution (optional)
- Mockups or examples (optional)

## 📚 Areas to Contribute

### High Priority

- [ ] Add more unit tests
- [ ] Improve E2E test coverage
- [ ] Add internationalization (i18n)
- [ ] Implement content versioning
- [ ] Add email notifications
- [ ] Create user activity timeline

### Good First Issues

Look for issues labeled `good-first-issue`:
- UI improvements
- Documentation updates
- Bug fixes
- Code cleanup

### Advanced

- Custom analytics dashboard
- Video player integration
- Advanced RBAC with custom permissions
- Real-time collaboration features
- Performance optimizations

## 🎨 Design Contributions

- Follow the Ora color scheme (orange/peach/warm tones)
- Use existing shadcn/ui components
- Ensure WCAG AA accessibility
- Design mobile-first

## 📖 Documentation Contributions

- Fix typos and improve clarity
- Add code examples
- Translate documentation
- Create tutorials or guides

## ❓ Questions?

- Check existing [Issues](https://github.com/Chrisdesmurger/OraWebApp/issues)
- Read the [README](README.md) and [docs](docs/)
- Ask in [Discussions](https://github.com/Chrisdesmurger/OraWebApp/discussions)

## 🙏 Thank You!

Every contribution, no matter how small, is valuable. Thank you for helping make Ora Admin better!

---

**Code of Conduct**: Be respectful, inclusive, and professional. We're all here to build something great together! 🚀
