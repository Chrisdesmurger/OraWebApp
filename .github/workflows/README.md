# 🤖 GitHub Workflows - AI-Assisted Development

This directory contains GitHub Actions workflows for automated CI/CD, spec generation, and AI-assisted development.

## 📋 Available Workflows

### 1. 🧪 CI - Build, Test, Lint (`ci.yml`)

**Trigger**: On every PR and push to `main`

**What it does**:
- ✅ TypeScript type checking
- ✅ ESLint linting
- ✅ Vitest unit tests
- ✅ Playwright E2E tests
- ✅ Next.js production build
- 🤖 AI test analysis on failures

**Required secrets**: None (optional: `CLAUDE_API_KEY` for AI analysis)

**Status checks required for merge**:
- TypeScript must pass
- Linting must pass
- Tests must pass
- Build must succeed

### 2. 📋 Spec Assistant (`spec-assistant.yml`)

**Trigger**: When an issue is labeled `spec-needed`

**What it does**:
1. Reads the issue (title, body, acceptance criteria)
2. Analyzes the codebase structure
3. Calls Claude API to generate a technical specification
4. Posts the spec as a comment on the issue
5. Updates label to `spec-generated`

**Required secrets**: `CLAUDE_API_KEY`

**Usage**:
```bash
# 1. Create a feature request using the template
# 2. GitHub will automatically add "spec-needed" label
# 3. Wait ~30 seconds for the workflow to run
# 4. Review the AI-generated spec in the issue comments
# 5. Refine the spec with team discussion
# 6. Change label to "spec-approved" when ready
```

**Example output**:
```markdown
## 🤖 AI-Generated Technical Specification

### Overview
[High-level summary...]

### Architecture & Design
[Component structure, data flow...]

### API Contracts
```typescript
POST /api/lessons/bulk-upload
Body: { programId: string; files: FileInfo[] }
Response: { batchId: string; uploadUrls: UploadUrl[] }
```
...
```

### 3. 🔒 Security Audit (`security.yml`)

**Trigger**: On PR, push to `main`, and weekly schedule (Mondays 9am UTC)

**What it does**:
- 📦 npm audit for vulnerable dependencies
- 🔎 CodeQL static analysis for security issues
- 🔐 Secret scanning (API keys, credentials)
- 🔥 Validate Firebase rules exist

**Required secrets**: None

**Fails if**:
- Critical/high vulnerabilities found
- Secrets detected in code
- Firebase rules missing

### 4. 🚀 Release & Changelog (`release.yml`)

**Trigger**: When a git tag is pushed (`v*.*.*`) or manually via workflow_dispatch

**What it does**:
1. Generates changelog from commits (categorized by type)
2. Creates GitHub release with release notes
3. Updates `CHANGELOG.md` in the repository
4. Commits the updated changelog

**Required secrets**: `GITHUB_TOKEN` (automatically provided)

**Usage**:
```bash
# Option 1: Push a git tag
git tag v1.2.0
git push origin v1.2.0

# Option 2: Manual trigger via GitHub UI
# Actions → Release & Changelog → Run workflow → Enter version
```

**Changelog format**:
```markdown
## What's Changed

### ✨ Features
- feat(upload): Add bulk upload (#123)
- feat(api): Add lesson filtering (#124)

### 🐛 Bug Fixes
- fix(cors): Resolve upload CORS error (#125)
- fix(auth): Fix role check (#126)

### 📚 Documentation
- docs(readme): Update setup guide (#127)
```

## 🔧 Setup Instructions

### Required Secrets

Add these secrets in GitHub Settings → Secrets and variables → Actions:

| Secret              | Required For         | How to Get                                       |
| ------------------- | -------------------- | ------------------------------------------------ |
| `CLAUDE_API_KEY`    | Spec Assistant, AI analysis | [Anthropic Console](https://console.anthropic.com/) |
| `GITHUB_TOKEN`      | All workflows        | Automatically provided by GitHub                 |
| `FIREBASE_*`        | Build workflow       | Firebase project settings (optional)             |

### Optional: Firebase Secrets for Build

```bash
# Add these if you want to run builds with real Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

**Note**: These are PUBLIC keys (safe to expose), but it's better to keep them in secrets.

### Branch Protection Rules

Configure branch protection for `main`:

1. Go to Settings → Branches → Branch protection rules
2. Add rule for `main`:
   - ✅ Require pull request reviews (1 approval)
   - ✅ Require status checks to pass:
     - `TypeScript Type Check`
     - `Lint Code`
     - `Unit Tests`
     - `Build Application`
   - ✅ Require branches to be up to date
   - ✅ Do not allow bypassing

## 🤖 AI-Assisted Features

### Spec Generation

When you create a feature request:

1. **Input**: Issue with user story, acceptance criteria
2. **AI analyzes**: Codebase structure, existing patterns
3. **AI generates**: Technical spec with architecture, API contracts, data models, tests
4. **Human reviews**: Team refines and approves the spec
5. **Development**: Developers implement following the spec

**Benefits**:
- ⚡ Faster specification process
- 🎯 Consistent spec format
- 📚 Learns from existing codebase patterns
- 🧪 Includes test strategy automatically

### Test Failure Analysis

When tests fail:

1. **CI detects**: Test failures in Vitest or Playwright
2. **AI analyzes**: Error messages, stack traces
3. **AI suggests**: Root cause, specific fixes, prevention strategies
4. **Posted as comment**: On the PR for developer to review

**Benefits**:
- 🔍 Quick diagnosis of test failures
- 💡 Actionable suggestions
- 📖 Learning opportunity for team

## 📊 Workflow Status

Check workflow status:

```bash
# Using gh CLI
gh workflow list
gh run list --workflow=ci.yml

# View logs
gh run view <run-id>
gh run view <run-id> --log
```

Or visit: `https://github.com/Chrisdesmurger/OraWebApp/actions`

## 🐛 Troubleshooting

### "CLAUDE_API_KEY not set"

**Cause**: Secret not configured
**Fix**: Add `CLAUDE_API_KEY` to repository secrets

### Spec Assistant not running

**Cause**: Issue not labeled correctly
**Fix**: Manually add `spec-needed` label to the issue

### CI failing on build

**Cause**: Missing Firebase environment variables
**Fix**: Either add Firebase secrets OR update `ci.yml` to use dummy values (already done)

### Tests timing out

**Cause**: E2E tests running too long
**Fix**: Increase timeout in `playwright.config.ts` or skip E2E on draft PRs

## 📝 Adding New Workflows

1. Create `.github/workflows/my-workflow.yml`
2. Define triggers (`on:`)
3. Define jobs and steps
4. Test with a draft PR
5. Document in this README
6. Update branch protection if needed

**Template**:
```yaml
name: My Workflow

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  my-job:
    name: My Job
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Do something
        run: echo "Hello"
```

## 🔗 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

---

**Questions?** Open a [Discussion](https://github.com/Chrisdesmurger/OraWebApp/discussions)
