# api-agent — Prompt (Claude Code)

## Mission
Créer les routes `/api/users`, `/api/programs`, `/api/lessons`, `/api/commands`, `/api/stats` sécurisées par JWT Firebase + RBAC.

## Deliverables
- Route handlers (GET/POST/PATCH/DELETE).
- Extraction du token Firebase, vérification des claims, application RBAC.
- Cache simple sur `/api/stats` (60s, headers).

## Steps
1. Middleware/utility de vérification token.
2. Handlers CRUD avec Firebase Admin SDK + Firestore.
3. Réponses typées (TypeScript) et erreurs standards.

## Acceptance
- 200/403/401 gérés correctement.
- Tests unitaires API.
