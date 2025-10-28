# 🚀 Quick Reference - Agents Claude Code

Guide rapide pour utiliser les agents avec l'outil `Task` dans Claude Code.

## ✅ Tous les Agents Configurés (11 agents)

Chaque agent dispose maintenant de métadonnées frontmatter et peut être invoqué via l'outil `Task`.

### 🔍 Quality & Review

| Agent | Utiliser quand | Temps estimé |
|-------|---------------|--------------|
| **code-reviewer** | Review PR/feature avant merge | 5-15 min |
| **type-safety** | Éliminer `any`, typage strict | 3-10 min |
| **security-auditor** | Audit OWASP, auth, injections | 10-20 min |
| **performance-auditor** | Optimiser performance, bundle | 10-20 min |

### ✅ Validation

| Agent | Utiliser quand | Temps estimé |
|-------|---------------|--------------|
| **firestore-validator** | Vérifier conventions snake_case/camelCase | 3-5 min |
| **api-contract-validator** | Valider endpoints REST, codes HTTP | 5-10 min |
| **test-generator** | Générer tests unitaires/E2E | 15-30 min |

### 🛠️ Development

| Agent | Utiliser quand | Temps estimé |
|-------|---------------|--------------|
| **full-stack-dev** | Développer feature complète (API + UI) | 1-3 heures |
| **error-handler** | Améliorer gestion erreurs globale | 10-20 min |
| **doc-generator** | Générer JSDoc, README, OpenAPI | 15-30 min |
| **refactor-safety** | Refactoring complexe avec analyse impact | 20-40 min |

---

## 📖 Comment Utiliser un Agent

### Syntaxe de Base

```typescript
Task({
  subagent_type: "nom-de-l-agent",
  description: "Description courte (3-5 mots)",
  prompt: "Instructions détaillées pour l'agent..."
})
```

### Exemples Pratiques

#### 1. Code Review d'une Feature

```typescript
Task({
  subagent_type: "code-reviewer",
  description: "Review Analytics Dashboard",
  prompt: `
Review la feature Analytics Dashboard (Issue #14).

Files à reviewer:
- app/api/analytics/**/*.ts
- app/admin/stats/page.tsx
- components/charts/*.tsx

Vérifier:
- Conventions Firestore (snake_case)
- RBAC sur tous les endpoints
- Pas de type 'any'
- Gestion d'erreurs correcte

Créer CODE_REVIEW_ANALYTICS.md et poster sur Issue #14.
  `
})
```

#### 2. Security Audit

```typescript
Task({
  subagent_type: "security-auditor",
  description: "Audit program cover upload",
  prompt: `
Audit de sécurité pour la feature Program Cover Upload (Issue #16).

Files:
- app/api/programs/[id]/cover/route.ts
- app/admin/programs/_components/ProgramCoverUpload.tsx
- lib/api/fetch-with-auth.ts

Vérifier:
- Upload file validation (type, size)
- RBAC correct (teacher owns program)
- Pas d'injection path traversal
- Storage permissions Firebase

Créer SECURITY_AUDIT_COVER_UPLOAD.md et poster sur Issue #16.
  `
})
```

#### 3. Generate Tests

```typescript
Task({
  subagent_type: "test-generator",
  description: "Tests for user management",
  prompt: `
Générer tests pour User Management (Issue #15).

Files à tester:
- app/api/users/route.ts (GET, POST, DELETE)
- app/admin/users/_components/CreateUserDialog.tsx
- app/admin/users/_components/DeleteUserDialog.tsx

Types de tests:
- Unit tests pour API routes
- Integration tests (Firestore mock)
- Component tests (React Testing Library)

Target: >80% coverage

Créer les fichiers dans __tests__/ et générer TEST_COVERAGE_USERS.md
  `
})
```

#### 4. Full-Stack Feature Development

```typescript
Task({
  subagent_type: "full-stack-dev",
  description: "Develop lesson comments feature",
  prompt: `
Développer feature: Lesson Comments (Issue #35)

Requirements:
- API POST /api/lessons/[id]/comments (auth required)
- API GET /api/lessons/[id]/comments (public)
- Component LessonComments.tsx
- Type definitions (Comment interface)
- RBAC: teachers can delete any, users can delete own
- Tests unitaires

Suivre conventions CLAUDE.md (Firestore snake_case, RBAC, etc.)

Créer branch feature/lesson-comments-issue-35
  `
})
```

#### 5. Performance Audit

```typescript
Task({
  subagent_type: "performance-auditor",
  description: "Audit dashboard performance",
  prompt: `
Audit performance du dashboard Analytics.

Vérifier:
- Re-renders inutiles (useMemo, useCallback)
- Requêtes Firestore (limit, pagination)
- Bundle size (dynamic imports)
- Images (Next.js Image)
- Web Vitals (LCP, CLS, FID)

Mesurer avec Chrome DevTools + Lighthouse.

Créer PERFORMANCE_AUDIT_ANALYTICS.md avec recommandations.
  `
})
```

#### 6. Firestore Validation

```typescript
Task({
  subagent_type: "firestore-validator",
  description: "Validate program API conventions",
  prompt: `
Valider conventions Firestore pour Programs API.

Files:
- app/api/programs/route.ts
- app/api/programs/[id]/route.ts
- app/api/programs/[id]/lessons/route.ts
- types/program.ts

Vérifier:
- Firestore queries use snake_case (duration_days, cover_image_url)
- API responses use camelCase (durationDays, coverImageUrl)
- Mappers utilisés (mapProgramFromFirestore, mapProgramToFirestore)
- Pas de spread direct doc.data()

Rapport: FIRESTORE_VALIDATION_PROGRAMS.md
  `
})
```

---

## 🎯 Workflow Complet d'une Feature

### Étape 1: Développement
```typescript
Task({
  subagent_type: "full-stack-dev",
  prompt: "Développer feature X..."
})
```

### Étape 2: Code Review
```typescript
Task({
  subagent_type: "code-reviewer",
  prompt: "Review feature X (Issue #N)..."
})
```

### Étape 3: Security Audit
```typescript
Task({
  subagent_type: "security-auditor",
  prompt: "Audit sécurité feature X..."
})
```

### Étape 4: Tests
```typescript
Task({
  subagent_type: "test-generator",
  prompt: "Générer tests pour feature X..."
})
```

### Étape 5: Performance
```typescript
Task({
  subagent_type: "performance-auditor",
  prompt: "Audit performance feature X..."
})
```

### Étape 6: Documentation
```typescript
Task({
  subagent_type: "doc-generator",
  prompt: "Générer doc feature X..."
})
```

---

## ⚙️ Configuration des Agents

Tous les agents ont:
- ✅ **Frontmatter YAML** (name, description, tools, model)
- ✅ **Context7 MCP** pour accès documentation
- ✅ **Outils**: Read, Write, Glob, Grep, Bash
- ✅ **GitHub Integration** (gh CLI pour poster commentaires)
- ✅ **Model**: inherit (utilise modèle par défaut)

### Structure Frontmatter

```yaml
---
name: agent-name
description: "Description courte"
tools: Read, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
model: inherit
---
```

---

## 📊 Scores & Rapports

### Scores Standards

- **95-100**: Excellent, production-ready ✅
- **85-94**: Good, corrections mineures 🟢
- **70-84**: Acceptable, améliorations nécessaires 🟡
- **60-69**: Needs work ⚠️
- **<60**: Refactor majeur requis 🔴

### Sévérité des Issues

- **🔴 CRITICAL**: Bugs, security, data loss
- **⚠️ HIGH**: Performance, bad practices
- **💡 MEDIUM**: Code quality, docs manquantes
- **✨ LOW**: Suggestions, nice-to-haves

---

## 🔗 GitHub Integration

Tous les agents doivent:

1. **Créer un fichier rapport**
   ```
   [AGENT_TYPE]_[FEATURE_NAME].md
   ```

2. **Poster sur GitHub Issue/PR**
   ```bash
   gh issue comment [NUMBER] --body "..."
   ```

3. **Format standard**
   - Score (0-100)
   - Strengths (✅)
   - Issues Found (🔴 ⚠️ 💡)
   - Action Items (checkboxes)
   - Status (⚠️ / ✅)

---

## 📚 Resources

- **Agents Détaillés**: `.claude/agents/*.md`
- **README Complet**: `.claude/agents/README.md`
- **Conventions Projet**: `CLAUDE.md`
- **GitHub CLI**: `https://cli.github.com/`

---

**Last Updated**: 2025-10-28
**Status**: ✅ All 11 agents configured and ready

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
