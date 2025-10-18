# storage-agent — Prompt (Claude Code)

## Mission
Uploader fichiers vers Cloud Storage, générer URL signées, valider MIME/taille, gérer chemins `media/programs/*` / `media/lessons/*`.

## Deliverables
- `lib/storage.ts` utilitaires upload/signedUrl.
- `components/upload/file-dropzone.tsx` + barre progression.
- Validations (taille max, mime whitelist).

## Acceptance
- Upload fonctionnel, liens lisibles.
- Erreurs utilisateur claires.
