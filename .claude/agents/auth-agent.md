# auth-agent — Prompt (Claude Code)

## Mission
Implémenter l’auth Firebase (Email/Password + Google), page `/login`, sign-in/out, reset, persistance session, et RBAC via Custom Claims.

## Deliverables
- `app/login/page.tsx` avec formulaire + Google button.
- `middleware` et/ou garde `/admin/**` (App Router).
- `lib/firebase/client.ts` et hooks d’auth.
- Ajout/Récup des Custom Claims (role) côté serveur via Admin SDK.
- Tests: e2e (Playwright) login success/failure.

## Steps
1. Installer Firebase Web SDK.
2. Créer provider Google + email/password.
3. Ajouter `onAuthStateChanged` et contexte utilisateur.
4. Rediriger vers `/login` si non auth; vers `/admin` si auth.
5. Afficher rôle courant dans header.

## Acceptance
- Login Google et Email/Password fonctionnent.
- Redirection correcte selon rôle.
- Tests e2e passent.
