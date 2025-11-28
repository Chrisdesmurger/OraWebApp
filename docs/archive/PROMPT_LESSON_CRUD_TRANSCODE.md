
# Claude Code Prompt — Add Content (Lesson) Create/Edit + Media Upload & Transcoding

## Goal
Implement **create / edit / upload** for *lessons* on the existing **/admin/content** area **without refactoring the global app**. Reuse the current stack and design system. Add only the minimal new files/components/endpoints needed.

## Constraints
- Respect RBAC (teacher can manage **own** content; admin can manage **all**).
- Keep current navigation/layout intact.
- Use existing libraries already in the repo where possible; if new deps are needed, pick modern, maintained libs.
- Strong validation (Zod) and secure server-side checks.
- Don’t break existing pages/tests.

## Data Model (Firestore)
Add/ensure a `lessons/{lessonId}` document with at least:
```
{
  title: string,
  type: 'video' | 'audio',
  programId: string,         // parent program
  order: number,             // sortable
  durationSec: number | null,
  tags: string[],
  transcript: string | null,
  // upload + processing
  status: 'draft'|'uploading'|'processing'|'ready'|'failed',
  storagePathOriginal: string | null,
  renditions: {
    high?: { path: string, width?: number, height?: number, bitrateKbps?: number },
    medium?: { path: string, width?: number, height?: number, bitrateKbps?: number },
    low?: { path: string, width?: number, height?: number, bitrateKbps?: number }
  },
  audioVariants?: {
    high?: { path: string, bitrateKbps: number },
    medium?: { path: string, bitrateKbps: number },
    low?: { path: string, bitrateKbps: number }
  },
  codec?: string | null,
  sizeBytes?: number | null,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  authorId: string,          // owner (teacher)
}
```
> You can extend with `thumbnailUrl`, `mimeType`, etc., if quickly useful.

## Supported Upload Formats
- **Video**: mp4 (H.264 + AAC) and webm (VP9 + Opus). Prefer mp4 for compatibility.
- **Audio**: m4a / mp3 / wav. Prefer m4a (AAC) and mp3.
- Client uploads the **original**; server produces **3 renditions** for video (1080p, 720p, 360p) and **3 variants** for audio (320 / 192 / 96 kbps).

## Transcoding Strategy
Use **Firebase Functions (Gen2) + ffmpeg**:
- Trigger: **Storage finalize** on `media/lessons/{lessonId}/original/**`.
- Use `ffmpeg-static` and `@ffprobe-installer/ffprobe` to probe & transcode.
- For video: produce mp4 H.264/AAC in 1080p/720p/360p; name files `.../high.mp4`, `.../medium.mp4`, `.../low.mp4`.
- For audio: produce m4a in 320/192/96 kbps; name `.../high.m4a`, `.../medium.m4a`, `.../low.m4a`.
- On success, update `lessons/{lessonId}` with `status='ready'`, `renditions/*`, `audioVariants/*`, `durationSec`, `codec`, `sizeBytes` (original). On failure, set `status='failed'` and write an error entry in `audit_logs`.

> If the project already uses GCP **Transcoder API**, you may implement via Transcoder instead of ffmpeg; keep the same Firestore schema.

## UI/UX Additions (under /admin/content)
1) **Create Lesson Drawer / Dialog** (keep page layout as-is):
   - Fields: title (required), type (video|audio, required), programId (required, select), tags[], optional transcript.
   - A **file dropzone** for original upload (accept by type). Show progress %.
   - When creating, write a lesson doc with `status='uploading'`, `authorId`, and start upload to `media/lessons/{lessonId}/original/<filename>`.
   - After upload success, set `status='processing'`. A background function will set to `ready` once renditions are done.
   - Toasts for each step; disable submit while uploading.

2) **Edit Lesson Modal**:
   - Update metadata (title, tags, transcript, order).
   - For **admin/owner** only: replace original file (restarts processing → set `status='processing'`).

3) **List & Filters**:
   - Table with cols: Title, Type, Program, Status, UpdatedAt, Actions.
   - Filters: type, status, program, text search (title).
   - Row actions: Edit, Duplicate (create same metadata in draft), Delete (soft delete or hard delete if approved by rules).

4) **Badges/Indicators**:
   - Status chips for `uploading/processing/ready/failed`.
   - For `ready`, show links/buttons to preview `high/medium/low`.

## Endpoints & Server Actions
Create the following **route handlers** (Next.js App Router) with server-only checks:
- `POST /api/lessons` → create lesson doc (RBAC: admin or teacher).
- `PATCH /api/lessons/:id` → update metadata (RBAC: admin or owner teacher).
- `DELETE /api/lessons/:id` → delete (RBAC).
- `POST /api/uploads/lessons/:id/init` → return Storage **resumable upload** URL or use Firebase Storage client SDK if already standardized.
- `GET /api/lessons` (query by program/status/search) for tables.

> Always verify Firebase JWT, extract custom claims, and enforce RBAC server-side.

## Storage Paths
- Original: `media/lessons/{lessonId}/original/<filename>`
- Video renditions: `media/lessons/{lessonId}/video/<quality>.mp4` (high|medium|low)
- Audio variants: `media/lessons/{lessonId}/audio/<quality>.m4a` (high|medium|low)
- Optional thumbnail: `media/lessons/{lessonId}/thumb.jpg`

## Security
- Firestore Rules: allow create/update/delete for **admin** or **teacher owner**.
- Storage Rules: allow write for admin/teacher; reads for authenticated.
- Validate MIME on server and client; limit size (e.g., 2 GB video max).

## Packages to Add (only if missing)
- `ffmpeg-static`, `@ffprobe-installer/ffprobe`, `fluent-ffmpeg`
- `zod`, `react-hook-form`
- (optional) `react-aria`/`cmdk` for accessibility/command UI

## Expected File Additions (illustrative)
```
app/admin/content/_components/CreateLessonDialog.tsx
app/admin/content/_components/EditLessonDialog.tsx
app/admin/content/_components/LessonTable.tsx
app/api/lessons/route.ts
app/api/lessons/[id]/route.ts
app/api/uploads/lessons/[id]/init/route.ts
functions/src/transcodeOnFinalize.ts       # Gen2 function
lib/storage.ts                              # helpers for paths & signed URLs (if needed)
lib/validators/lesson.ts
```

## Tests
- Unit: validators, RBAC, helpers.
- API: create/update/delete with role checks.
- E2E: create lesson (upload → processing → ready), edit metadata, filter table.

## Acceptance
- Teacher can create a lesson with a file, see status progress `uploading → processing → ready`.
- Admin can create/edit/delete any lesson.
- Three renditions/variants generated and stored; metadata updated.
- No changes to global layout; only new content functionality.
