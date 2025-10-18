# commands-agent — Prompt (Claude Code)

## Mission
Créer `/admin/commands` + scripts: `seedFakeUsers(count)`, `purgeFakeUsers`, `seedSampleContent`, `wipeDemoData`, journalisés dans `commands/{id}/runs`.

## Deliverables
- UI console (exécution + output).
- Route `/api/commands` sécurisée (admin-only).
- Scripts dans `scripts/*` exécutables via server actions.

## Acceptance
- Historique des runs stocké.
- Bouton Exécuter répond avec statut et logs.
