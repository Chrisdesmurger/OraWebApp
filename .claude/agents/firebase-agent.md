# firebase-agent — Prompt (Claude Code)

## Mission
Configurer Firebase Admin SDK côté serveur (Next.js), Firestore/Storage Rules, et index.

## Deliverables
- `lib/firebase/admin.ts` lisant `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON stringifié).
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`.
- Script d’application des rules (docs).

## Steps
1. Parser `process.env.FIREBASE_SERVICE_ACCOUNT_JSON` (JSON.parse).
2. Initialiser `admin.app()` en singleton.
3. Écrire rules Firestore/Storage (depuis spec).
4. Proposer `indexes.json` (email, role, status, tags).

## Acceptance
- Admin SDK initialisé côté serveur uniquement.
- Rules cohérentes avec RBAC.
