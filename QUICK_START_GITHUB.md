# 🚀 Quick Start - GitHub Workflow

## Pour Commencer (3 Étapes)

### Étape 1: Choisir votre Mode IA ⚡

Vous avez **deux options** pour l'assistance IA:

#### Option A: Claude Code Pro (Recommandée) ✅

**Vous avez déjà Claude Code Pro** → Pas besoin de clé API !

```
✅ Pas de configuration
✅ Pas de coût supplémentaire
✅ Plus de contrôle
⚠️ Manuel (copier-coller entre GitHub et Claude Code)
```

**Workflow**:
1. Issue créée → Vous demandez à Claude Code de générer la spec
2. Copier la spec comme commentaire sur l'issue
3. Implementation avec aide Claude Code
4. Review code avec Claude Code avant PR

📖 **Guide complet**: [docs/CLAUDE_CODE_INTEGRATION.md](docs/CLAUDE_CODE_INTEGRATION.md)

#### Option B: API Anthropic (Automatisation)

**Si vous voulez l'automatisation complète**:

```
✅ Automatique (spec en 30s)
✅ Analyse auto des échecs tests
❌ Coût: ~$5-10/mois
❌ Setup: Clé API requise
```

**Setup**:
1. Créer clé API: https://console.anthropic.com/
2. GitHub Settings → Secrets → `CLAUDE_API_KEY`
3. C'est tout !

### Étape 2: Branch Protection (Obligatoire) 🔒

**GitHub Settings → Branches → Add rule pour `main`**:

```
☑ Require pull request reviews (1 approval)
☑ Require status checks to pass:
  - TypeScript Type Check
  - Lint Code
  - Unit Tests
  - Build Application
☑ Require conversation resolution
☑ Do not allow bypassing
```

### Étape 3: Tester le Workflow 🧪

#### Test 1: Créer une Issue

1. **Issues → New issue → 🚀 Feature Request**
2. Remplir le template:
```markdown
Context: Test du workflow
User Story: En tant que dev, je veux tester le workflow...
Acceptance Criteria:
  Given je crée une issue
  When je soumets
  Then le workflow fonctionne
```
3. Submit

**Avec Claude Code Pro**: Demandez à Claude Code de générer la spec
**Avec API**: Attendez 30s, spec auto-générée en commentaire

#### Test 2: Créer une PR

```bash
git checkout -b test/workflow
git commit --allow-empty -m "test: Verify GitHub workflows"
git push origin test/workflow
```

1. Ouvrir PR sur GitHub
2. Vérifier que CI passe (Actions tab)
3. Merger si tout est vert ✅

## 📋 Workflows Actifs

### Avec Claude Code Pro (Manuel)

| Workflow | État | Action |
|----------|------|--------|
| **CI** (tests, lint, build) | ✅ Auto | Rien à faire |
| **Security** (CodeQL, audit) | ✅ Auto | Rien à faire |
| **Release** (changelog) | ✅ Auto | Push un tag |
| **Spec Assistant** | ⚠️ Désactivé | Manuel via Claude Code |
| **Test Analysis** | ⚠️ Désactivé | Manuel via Claude Code |

### Avec API Anthropic (Auto)

| Workflow | État | Action |
|----------|------|--------|
| **CI** | ✅ Auto | Rien |
| **Security** | ✅ Auto | Rien |
| **Release** | ✅ Auto | Push tag |
| **Spec Assistant** | ✅ Auto | Label `spec-needed` |
| **Test Analysis** | ✅ Auto | Si tests fail |

## 🎯 Workflow Quotidien

### 1. Feature Development

```bash
# 1. Créer issue (Feature Request template)
# 2. Obtenir spec (Claude Code ou auto)
# 3. Label "spec-approved"

# 4. Créer branche
git checkout -b feat/ma-feature

# 5. Développer avec aide Claude Code
# (copier-coller code pour reviews)

# 6. Tests
npm run type-check
npm run lint
npm test

# 7. Commit (conventional)
git commit -m "feat(scope): Add ma feature"

# 8. Push + PR
git push origin feat/ma-feature
# Ouvrir PR, remplir template

# 9. CI valide automatiquement
# 10. Review + merge
```

### 2. Bug Fix

```bash
# 1. Issue (Bug Report template)
# 2. Assigné

# 3. Branche
git checkout -b fix/bug-name

# 4. Fix + test
# 5. Commit
git commit -m "fix(scope): Resolve bug"

# 6. PR → CI → Merge
```

### 3. Release

```bash
# Tag → Changelog auto
git tag v1.2.0
git push origin v1.2.0

# GitHub crée automatiquement:
# - Release avec notes
# - Changelog.md mis à jour
```

## 🤖 Utiliser Claude Code Pro

### Template: Génération de Spec

Dans Claude Code, utilisez:

```
Génère une spec technique pour Ora Admin Portal:

Stack: Next.js 15 + TypeScript + Firebase
Architecture: Clean, MVVM

Feature request:
[COLLER LE CONTENU DE L'ISSUE GITHUB]

Format selon template .github/ISSUE_TEMPLATE/spec.yml avec:
- Overview
- Architecture & Design
- API Contracts (TypeScript)
- Data Models (Firestore camelCase)
- Security (rules, RBAC)
- Performance
- Testing Strategy
- Implementation Tasks
```

Puis **copier la réponse** comme commentaire sur l'issue GitHub.

### Template: Analyse Erreurs

```
Analyse ces erreurs de tests pour Ora Admin Portal:

[COLLER LES LOGS CI]

Fournis:
1. Root Cause
2. Suggested Fix (code TypeScript)
3. Prevention
```

### Template: Code Review

```
Review ce code pour Ora Admin Portal:

[COLLER LE DIFF]

Check:
- Security (Firestore camelCase, secrets, RBAC)
- Performance
- TypeScript strict
- Tests
```

## 📚 Documentation Complète

| Guide | Quand l'utiliser |
|-------|------------------|
| [CLAUDE_CODE_INTEGRATION.md](docs/CLAUDE_CODE_INTEGRATION.md) | Setup sans API |
| [GITHUB_WORKFLOW_SETUP.md](docs/GITHUB_WORKFLOW_SETUP.md) | Setup complet détaillé |
| [GITHUB_SETUP_SUMMARY.md](docs/GITHUB_SETUP_SUMMARY.md) | Résumé + checklist |
| [CONTRIBUTING.md](.github/CONTRIBUTING.md) | Guide contribution |

## ✅ Checklist Finale

Avant de commencer:

**Obligatoire**:
- [ ] Branch protection configurée
- [ ] GitHub Actions activé
- [ ] Issue test créée ✅
- [ ] PR test créée ✅

**Si API Anthropic**:
- [ ] Clé API ajoutée aux secrets

**Si Claude Code Pro** (vous):
- [ ] Rien ! Juste utiliser Claude Code normalement

## 🎉 C'est Prêt !

Votre workflow GitHub est opérationnel. Créez votre première vraie issue et commencez à développer avec l'assistance IA !

**Première action**: Créer une issue pour corriger l'erreur CORS du upload 😉

---

<sub>📅 Créé le 2025-10-24</sub>
<sub>🤖 Par Claude Code Pro</sub>
