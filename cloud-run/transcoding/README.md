# Ora Transcoding Service (Cloud Run)

Cloud Run service that handles video/audio transcoding for the Ora platform.
Replaces the Firebase Cloud Function `transcodeOnFinalize` as part of the Firebase to Supabase migration.

## How It Works

1. A Supabase Edge Function (`transcode-webhook`) sends a POST to `/transcode`
2. The service downloads the original file from Supabase Storage
3. FFmpeg transcodes the media into multiple quality levels
4. Renditions are uploaded back to Supabase Storage
5. The lesson row in PostgreSQL is updated with metadata and status

## Transcoding Profiles

### Video

| Quality | Resolution | Default Bitrate | Yoga/Pilates | Meditation |
|---------|-----------|----------------|--------------|------------|
| high    | 1920x1080 | 5000k          | 6000k        | 4000k      |
| medium  | 1280x720  | 2500k          | 3000k        | 2000k      |
| low     | 640x360   | 1000k          | 1200k (854x480) | 800k   |

### Audio

| Quality | Bitrate |
|---------|---------|
| high    | 320k    |
| medium  | 192k    |
| low     | 96k     |

Aspect ratio handling: 16:9 output with auto crop/letterbox.

## Build

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Build Docker image
docker build -t ora-transcoding .
```

## Deploy to Cloud Run

```bash
gcloud run deploy ora-transcoding \
  --source . \
  --region europe-west1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 540 \
  --concurrency 1 \
  --set-env-vars "SUPABASE_URL=https://your-project.supabase.co,TRANSCODE_SECRET=your-secret" \
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest"
```

Key deployment flags:
- `--memory 2Gi` -- FFmpeg needs sufficient memory for video processing
- `--cpu 2` -- Two CPUs for parallel encoding
- `--timeout 540` -- 9 minutes max per request (long videos)
- `--concurrency 1` -- One transcode job per instance (CPU-bound)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (e.g., `https://xyz.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (bypasses RLS) |
| `TRANSCODE_SECRET` | Yes | Shared secret for request authentication (Bearer token) |
| `PORT` | No | HTTP port (default: `8080`) |

## Test Locally

### With Docker

```bash
# Create a .env file (do NOT commit this)
cat > .env <<EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TRANSCODE_SECRET=test-secret-123
EOF

# Build and run
npm run docker:build
npm run docker:run
```

### Without Docker

```bash
# Requires FFmpeg installed locally
# macOS: brew install ffmpeg
# Ubuntu: sudo apt-get install ffmpeg
# Windows: choco install ffmpeg

npm install
npm run build

# Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export TRANSCODE_SECRET=test-secret-123

npm start
```

### Test Request

```bash
# Health check
curl http://localhost:8080/health

# Transcode request
curl -X POST http://localhost:8080/transcode \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-secret-123" \
  -d '{
    "lessonId": "abc-123",
    "storagePath": "lessons/abc-123/original/video.mp4",
    "bucket": "media",
    "lessonType": "video",
    "lessonCategory": "yoga"
  }'
```

## API Reference

### `GET /health`

Health check endpoint. Returns `200 OK` with service status.

### `POST /transcode`

Starts a transcoding job. This is a synchronous endpoint -- the response is returned when transcoding completes.

**Headers:**
- `Authorization: Bearer <TRANSCODE_SECRET>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "lessonId": "string (required) - UUID of the lesson",
  "storagePath": "string (required) - Path in Supabase Storage bucket",
  "bucket": "string (required) - Storage bucket name",
  "lessonType": "\"video\" | \"audio\" (required)",
  "lessonCategory": "string (optional) - yoga, meditation, pilates, etc."
}
```

**Response (success):**
```json
{
  "success": true,
  "lessonId": "abc-123",
  "lessonType": "video",
  "duration_sec": 305,
  "renditions": ["high", "medium", "low"]
}
```

**Response (error):**
```json
{
  "error": "Error message",
  "lessonId": "abc-123"
}
```

## Architecture

```
Supabase Edge Function         Cloud Run Service           Supabase
(transcode-webhook)           (ora-transcoding)
       |                            |                         |
       |--- POST /transcode ------->|                         |
       |                            |--- download original -->|
       |                            |<-- file data -----------|
       |                            |                         |
       |                            | [FFmpeg transcode]      |
       |                            |                         |
       |                            |--- upload renditions -->|
       |                            |--- UPDATE lessons ----->|
       |                            |                         |
       |<-- 200 OK (result) --------|                         |
```
