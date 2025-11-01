# Media Library Refactor - Technical Implementation Details

## Overview

This document provides in-depth technical details about the Media Library refactor implementation, including design decisions, data flow, and code architecture.

**Date**: 2025-11-02
**Author**: Claude (Sonnet 4.5)
**Working Directory**: C:\Users\chris\source\repos\OraWebApp

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│                                                                  │
│  ┌────────────────┐         ┌──────────────────────────┐       │
│  │  Media List    │────────▶│  MediaPreviewDialog      │       │
│  │  Component     │         │  - ORIGINAL file         │       │
│  │  - Shows only  │         │  - HIGH rendition        │       │
│  │    ORIGINAL    │         │  - MEDIUM rendition      │       │
│  │    files       │         │  - LOW rendition         │       │
│  └────────────────┘         └──────────────────────────┘       │
│         │                              │                        │
└─────────┼──────────────────────────────┼────────────────────────┘
          │ GET /api/media               │ DELETE /api/media/[id]
          ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer (Next.js)                       │
│                                                                  │
│  ┌────────────────┐         ┌──────────────────────────┐       │
│  │  GET /api/media│         │  DELETE /api/media/[id]  │       │
│  │  route.ts      │         │  route.ts                │       │
│  └────────────────┘         └──────────────────────────┘       │
│         │                              │                        │
└─────────┼──────────────────────────────┼────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Utility Layer (storage-utils.ts)              │
│                                                                  │
│  ┌────────────────────────────┐  ┌──────────────────────────┐  │
│  │  convertToMediaFile()      │  │  getAllRelatedFilePaths()│  │
│  │  - Filters renditions      │  │  - Finds all files       │  │
│  │  - Fetches alternatives    │  │  - Returns array         │  │
│  └────────────────────────────┘  └──────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────┐  ┌──────────────────────────┐  │
│  │  shouldIncludeInMediaList()│  │  getAlternativeVersions()│  │
│  │  - Original files only     │  │  - HIGH/MEDIUM/LOW       │  │
│  └────────────────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Firebase Backend                          │
│                                                                  │
│  ┌───────────────┐          ┌──────────────────────────┐       │
│  │   Firestore   │          │    Firebase Storage      │       │
│  │   (lessons)   │          │    (media files)         │       │
│  │   - metadata  │          │    - original/           │       │
│  │   - renditions│          │    - high/               │       │
│  │   - variants  │          │    - medium/             │       │
│  └───────────────┘          │    - low/                │       │
│                             └──────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Fetching Media List (GET /api/media)

```
Step 1: Client requests media list
   ↓
Step 2: API calls listStorageFiles() → Firebase Storage
   ↓
Step 3: For each file in Storage:
   ├─▶ shouldIncludeInMediaList(filePath)
   │   ├─▶ Check if path contains /high/, /medium/, /low/
   │   ├─▶ Check if filename starts with high., medium., low.
   │   └─▶ Return true only for /original/ or standalone files
   │
   └─▶ convertToMediaFile(metadata)
       ├─▶ Generate signed URL
       ├─▶ Check if orphaned
       ├─▶ Find lessons using this file
       ├─▶ If original + video/audio:
       │   ├─▶ Extract lesson ID from path
       │   ├─▶ Fetch lesson document from Firestore
       │   └─▶ Call getAlternativeVersions()
       │       ├─▶ Get HIGH rendition (path + URL + size)
       │       ├─▶ Get MEDIUM rendition (path + URL + size)
       │       └─▶ Get LOW rendition (path + URL + size)
       └─▶ Return MediaFile object
   ↓
Step 4: Filter, sort, paginate results
   ↓
Step 5: Return to client
```

**Key Decision**: Check for original files by looking for `/original/` in path. This is more reliable than checking for `/high/` because:
- Original files are explicitly stored in `/original/` directory
- Avoids false positives from filenames containing "high"
- Matches Firestore schema convention

---

### 2. Deleting Media File (DELETE /api/media/[id])

```
Step 1: Client sends DELETE request with file path
   ↓
Step 2: Authenticate user (require admin role)
   ↓
Step 3: Validate file path (must start with "media/")
   ↓
Step 4: Call getAllRelatedFilePaths(firestore, filePath)
   ├─▶ Extract lesson ID from path using regex
   ├─▶ If no lesson ID → return [originalFilePath]
   ├─▶ Fetch lesson document from Firestore
   ├─▶ If lesson not found → return [originalFilePath]
   ├─▶ Extract paths from lesson.renditions.*
   ├─▶ Extract paths from lesson.audio_variants.*
   └─▶ Return array: [original, high, medium, low, audio_high, audio_medium, audio_low]
   ↓
Step 5: For each path in array:
   ├─▶ deleteSingleFile(path)
   ├─▶ If success → add to deletedPaths[]
   └─▶ If error → add to errors[]
   ↓
Step 6: Log audit event with all deleted paths
   ↓
Step 7: Return response to client
   {
     message: "Successfully deleted X file(s)",
     deletedPaths: [...],
     errors: [...]  // if any
   }
```

**Key Decision**: Use a loop with error collection instead of Promise.all because:
- Allows partial success (some files deleted, some failed)
- Better error reporting (which specific files failed)
- More resilient to network issues
- Audit log can record both successes and failures

---

## File Path Patterns

### Directory Structure

```
media/
├── lessons/
│   ├── {lessonId}/
│   │   ├── original/
│   │   │   ├── video.mp4          ← SHOWN in list
│   │   │   └── audio.mp3          ← SHOWN in list
│   │   ├── high/
│   │   │   ├── video.mp4          ← HIDDEN in list, shown in dialog
│   │   │   └── audio.mp3          ← HIDDEN in list, shown in dialog
│   │   ├── medium/
│   │   │   ├── video.mp4          ← HIDDEN in list, shown in dialog
│   │   │   └── audio.mp3          ← HIDDEN in list, shown in dialog
│   │   └── low/
│   │       ├── video.mp4          ← HIDDEN in list, shown in dialog
│   │       └── audio.mp3          ← HIDDEN in list, shown in dialog
│   └── ...
├── thumbnails/
│   └── thumbnail.jpg               ← SHOWN in list (standalone)
└── ...
```

### Regex Patterns

**Extract Lesson ID**:
```javascript
const match = filePath.match(/media\/lessons\/([^\/]+)/);
// Example: "media/lessons/lesson123/original/video.mp4"
// Returns: ["media/lessons/lesson123", "lesson123"]
// Captured group [1]: "lesson123"
```

**Detect Quality Directory**:
```javascript
const pathLower = filePath.toLowerCase();
if (pathLower.includes('/high/') ||
    pathLower.includes('/medium/') ||
    pathLower.includes('/low/')) {
  // This is a rendition → EXCLUDE from list
}
```

**Detect Quality Filename**:
```javascript
const fileName = filePath.split('/').pop() || '';
const fileNameLower = fileName.toLowerCase();

if (fileNameLower.startsWith('high.') ||
    fileNameLower.startsWith('medium.') ||
    fileNameLower.startsWith('low.') ||
    fileNameLower.match(/(high|medium|low)\.(mp4|mp3|webm|ogg|m4a)/i)) {
  // Filename indicates quality → EXCLUDE from list
}
```

---

## Firestore Data Model

### Lesson Document Structure

```typescript
interface Lesson {
  id: string;
  title: string;
  description?: string;
  storage_path_original: string;  // Path to original file
  thumbnail_url?: string;
  duration_seconds?: number;

  // Video renditions
  renditions?: {
    high?: {
      path: string;        // "media/lessons/{id}/high/video.mp4"
      size_bytes: number;  // 150000000
      bitrate?: number;    // 5000000 (5 Mbps)
      resolution?: string; // "1920x1080"
    };
    medium?: {
      path: string;
      size_bytes: number;
      bitrate?: number;    // 2500000 (2.5 Mbps)
      resolution?: string; // "1280x720"
    };
    low?: {
      path: string;
      size_bytes: number;
      bitrate?: number;    // 1000000 (1 Mbps)
      resolution?: string; // "854x480"
    };
  };

  // Audio variants (for audio-only content or audio tracks)
  audio_variants?: {
    high?: {
      path: string;
      size_bytes: number;
      bitrate?: number;    // 320 kbps
    };
    medium?: {
      path: string;
      size_bytes: number;
      bitrate?: number;    // 128 kbps
    };
    low?: {
      path: string;
      size_bytes: number;
      bitrate?: number;    // 64 kbps
    };
  };

  created_at: string;     // ISO 8601 timestamp
  updated_at: string;
  created_by: string;     // User UID
}
```

### MediaFile Type (Client-side)

```typescript
interface MediaFile {
  id: string;                      // File path (same as storage_path_original)
  name: string;                    // Filename only (e.g., "video.mp4")
  lessonTitle?: string;            // Lesson title for display
  type: 'image' | 'video' | 'audio';
  size: number;                    // Bytes (ORIGINAL file size)
  url: string;                     // Signed URL for ORIGINAL file
  contentType: string;             // MIME type
  uploadedAt: string;              // ISO 8601
  uploadedBy?: string;             // User ID
  usedInLessons: LessonReference[];
  isOrphaned: boolean;

  // Alternative quality versions
  alternativeVersions?: AlternativeVersion[];
}

interface AlternativeVersion {
  quality: 'high' | 'medium' | 'low';
  path: string;
  url: string;                     // Signed URL (expires in 60 min)
  size: number;                    // Bytes
  sizeFormatted: string;           // "143.1 MB"
}
```

---

## Signed URL Generation

### Security Considerations

**Expiration Time**: 60 minutes
```typescript
const url = await getSignedUrl(filePath, 60);
```

**Why 60 minutes?**
- Long enough for user to watch a video or download a file
- Short enough to prevent URL sharing / unauthorized access
- If URL expires, user can refresh the page to get new URLs

**URL Format**:
```
https://storage.googleapis.com/ora-wellbeing.firebasestorage.app/
  media/lessons/lesson123/original/video.mp4
  ?GoogleAccessId=...
  &Expires=1698874800
  &Signature=...
```

### Caching Strategy

1. **Signed URLs are NOT cached** (expire after 60 min)
2. **File metadata IS cached** (in component state)
3. **On dialog open**: Re-fetch signed URLs for all renditions
4. **On video switch**: Use already-fetched URL (no new request)

---

## Error Handling

### Cascade Delete Error Scenarios

#### Scenario 1: Some Files Don't Exist
```typescript
// Example: medium.mp4 was manually deleted
allPaths = [
  "media/lessons/xxx/original/video.mp4",  // ✅ exists
  "media/lessons/xxx/high/video.mp4",      // ✅ exists
  "media/lessons/xxx/medium/video.mp4",    // ❌ doesn't exist
  "media/lessons/xxx/low/video.mp4",       // ✅ exists
]

// Result:
{
  message: "Successfully deleted 3 file(s)",
  deletedPaths: [
    "media/lessons/xxx/original/video.mp4",
    "media/lessons/xxx/high/video.mp4",
    "media/lessons/xxx/low/video.mp4"
  ],
  errors: [
    {
      path: "media/lessons/xxx/medium/video.mp4",
      error: "No such object: media/lessons/xxx/medium/video.mp4"
    }
  ]
}
```

#### Scenario 2: Network Failure Mid-Delete
```typescript
// 2 files deleted successfully, then network fails

{
  message: "Successfully deleted 2 file(s)",
  deletedPaths: [
    "media/lessons/xxx/original/video.mp4",
    "media/lessons/xxx/high/video.mp4"
  ],
  errors: [
    {
      path: "media/lessons/xxx/medium/video.mp4",
      error: "Network request failed"
    },
    {
      path: "media/lessons/xxx/low/video.mp4",
      error: "Network request failed"
    }
  ]
}
```

**Client Handling**: Show success message with warning about partial deletion

---

## Performance Optimizations

### 1. Firestore Query Optimization

**Before** (inefficient):
```typescript
// ❌ BAD: One query per file
for (const file of files) {
  const lessonDoc = await firestore.collection('lessons')
    .where('storage_path_original', '==', file.path)
    .get();
}
// Cost: N queries (N = number of files)
```

**After** (efficient):
```typescript
// ✅ GOOD: One query for all lessons
const lessonsSnapshot = await firestore.collection('lessons').get();
const lessonsMap = new Map();
lessonsSnapshot.docs.forEach(doc => {
  const data = doc.data();
  lessonsMap.set(data.storage_path_original, doc);
});

// Then lookup in-memory
for (const file of files) {
  const lessonDoc = lessonsMap.get(file.path);
}
// Cost: 1 query + O(1) lookups
```

### 2. Signed URL Generation Optimization

**Lazy Loading**: Only generate signed URLs when needed
```typescript
// ✅ GOOD: Generate URL only when dialog opens
React.useEffect(() => {
  if (file && open) {
    fetchAlternativeVersions(file);
  }
}, [file, open]);
```

**Parallel Fetching**: Generate all URLs in parallel
```typescript
// ✅ GOOD: Fetch all URLs at once
const urls = await Promise.all([
  getSignedUrl(high.path, 60),
  getSignedUrl(medium.path, 60),
  getSignedUrl(low.path, 60),
]);
```

### 3. Component Re-render Optimization

**Memoization**:
```typescript
const memoizedFiles = React.useMemo(() => {
  return files.filter(shouldIncludeInMediaList);
}, [files]);
```

**Virtualized List** (future optimization):
```typescript
import { FixedSizeList } from 'react-window';

// Render only visible items
<FixedSizeList
  height={600}
  itemCount={files.length}
  itemSize={80}
>
  {({ index, style }) => (
    <MediaFileRow file={files[index]} style={style} />
  )}
</FixedSizeList>
```

---

## Testing Strategy

### Unit Tests

**storage-utils.ts**:
```typescript
describe('shouldIncludeInMediaList', () => {
  it('should include original files', () => {
    expect(shouldIncludeInMediaList('media/lessons/123/original/video.mp4')).toBe(true);
  });

  it('should exclude high quality renditions', () => {
    expect(shouldIncludeInMediaList('media/lessons/123/high/video.mp4')).toBe(false);
  });

  it('should exclude medium quality renditions', () => {
    expect(shouldIncludeInMediaList('media/lessons/123/medium/video.mp4')).toBe(false);
  });

  it('should exclude low quality renditions', () => {
    expect(shouldIncludeInMediaList('media/lessons/123/low/video.mp4')).toBe(false);
  });

  it('should exclude files named high.mp4', () => {
    expect(shouldIncludeInMediaList('media/lessons/123/high.mp4')).toBe(false);
  });

  it('should include standalone files', () => {
    expect(shouldIncludeInMediaList('media/thumbnails/thumb.jpg')).toBe(true);
  });
});

describe('getAllRelatedFilePaths', () => {
  it('should return all rendition paths', async () => {
    const paths = await getAllRelatedFilePaths(firestore, 'media/lessons/123/original/video.mp4');
    expect(paths).toHaveLength(4);
    expect(paths).toContain('media/lessons/123/original/video.mp4');
    expect(paths).toContain('media/lessons/123/high/video.mp4');
    expect(paths).toContain('media/lessons/123/medium/video.mp4');
    expect(paths).toContain('media/lessons/123/low/video.mp4');
  });

  it('should return only original for standalone files', async () => {
    const paths = await getAllRelatedFilePaths(firestore, 'media/standalone.jpg');
    expect(paths).toHaveLength(1);
    expect(paths).toContain('media/standalone.jpg');
  });

  it('should handle missing lesson gracefully', async () => {
    const paths = await getAllRelatedFilePaths(firestore, 'media/lessons/nonexistent/original/video.mp4');
    expect(paths).toHaveLength(1);
    expect(paths).toContain('media/lessons/nonexistent/original/video.mp4');
  });
});
```

### Integration Tests

**API Routes**:
```typescript
describe('DELETE /api/media/[id]', () => {
  it('should delete all renditions', async () => {
    const response = await fetch('/api/media/media%2Flessons%2F123%2Foriginal%2Fvideo.mp4', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    expect(data.deletedPaths).toHaveLength(4);
    expect(data.errors).toHaveLength(0);
  });

  it('should require admin role', async () => {
    const response = await fetch('/api/media/...', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${viewerToken}` },
    });

    expect(response.status).toBe(403);
  });
});
```

### E2E Tests (Playwright/Cypress)

```typescript
test('should show only original files in list', async ({ page }) => {
  await page.goto('/admin/media');

  const fileRows = await page.locator('[data-testid="media-file-row"]').all();

  for (const row of fileRows) {
    const path = await row.getAttribute('data-file-path');
    expect(path).not.toContain('/high/');
    expect(path).not.toContain('/medium/');
    expect(path).not.toContain('/low/');
  }
});

test('should delete all renditions', async ({ page }) => {
  await page.goto('/admin/media');

  // Click first file
  await page.locator('[data-testid="media-file-row"]').first().click();

  // Click delete
  await page.locator('[data-testid="delete-button"]').click();

  // Confirm
  await page.locator('[data-testid="confirm-delete"]').click();

  // Check success message
  await expect(page.locator('text=Successfully deleted 4 file(s)')).toBeVisible();
});
```

---

## Migration Guide

### Existing Data Migration

If you have existing files in non-standard locations:

```typescript
// Script to migrate existing files to /original/ structure
async function migrateExistingFiles() {
  const storage = getStorage();
  const firestore = getFirestore();

  // Get all lessons
  const lessonsSnapshot = await firestore.collection('lessons').get();

  for (const lessonDoc of lessonsSnapshot.docs) {
    const lesson = lessonDoc.data();
    const oldPath = lesson.storage_path_original;

    // Check if already in /original/
    if (oldPath.includes('/original/')) {
      continue; // Already migrated
    }

    // Move to /original/ directory
    const lessonId = lessonDoc.id;
    const fileName = oldPath.split('/').pop();
    const newPath = `media/lessons/${lessonId}/original/${fileName}`;

    // Copy file
    await storage.bucket().file(oldPath).copy(newPath);

    // Update Firestore
    await lessonDoc.ref.update({
      storage_path_original: newPath,
    });

    console.log(`Migrated: ${oldPath} → ${newPath}`);
  }
}
```

---

## Future Enhancements

### 1. Automatic Rendition Generation

**Cloud Function** to automatically create renditions on upload:
```typescript
import * as functions from 'firebase-functions';
import * as ffmpeg from 'fluent-ffmpeg';

export const generateRenditions = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;

  // Only process files in /original/ directory
  if (!filePath.includes('/original/')) return;

  // Extract lesson ID
  const lessonId = extractLessonIdFromPath(filePath);

  // Generate high quality (1080p, 5 Mbps)
  await generateRendition(filePath, lessonId, 'high', {
    resolution: '1920x1080',
    bitrate: '5000k',
  });

  // Generate medium quality (720p, 2.5 Mbps)
  await generateRendition(filePath, lessonId, 'medium', {
    resolution: '1280x720',
    bitrate: '2500k',
  });

  // Generate low quality (480p, 1 Mbps)
  await generateRendition(filePath, lessonId, 'low', {
    resolution: '854x480',
    bitrate: '1000k',
  });
});
```

### 2. Smart Quality Selection

**Client-side** automatic quality selection based on network speed:
```typescript
function selectOptimalQuality(networkSpeed: number): 'high' | 'medium' | 'low' {
  if (networkSpeed > 10_000_000) return 'high';      // > 10 Mbps
  if (networkSpeed > 3_000_000) return 'medium';     // > 3 Mbps
  return 'low';
}

// Measure network speed
const connection = (navigator as any).connection;
if (connection) {
  const downlinkSpeed = connection.downlink * 1_000_000; // Mbps to bps
  const quality = selectOptimalQuality(downlinkSpeed);
  setCurrentUrl(file.alternativeVersions.find(v => v.quality === quality)?.url || file.url);
}
```

### 3. Thumbnail Generation

**Cloud Function** to generate video thumbnails:
```typescript
export const generateThumbnail = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;

  if (!filePath.endsWith('.mp4')) return;

  // Extract frame at 1 second
  await ffmpeg(filePath)
    .screenshots({
      timestamps: ['00:00:01'],
      filename: 'thumbnail.jpg',
      folder: getThumbnailPath(filePath),
    });
});
```

---

## Troubleshooting

### Issue: "No renditions shown in preview dialog"

**Cause**: Lesson document doesn't have `renditions` or `audio_variants` fields

**Solution**: Check Firestore document structure:
```typescript
const lessonDoc = await firestore.collection('lessons').doc(lessonId).get();
console.log('Lesson data:', lessonDoc.data());
```

### Issue: "All files deleted, but some still in Storage"

**Cause**: Firestore document not updated or paths don't match

**Solution**: Verify paths in Firestore match actual Storage paths:
```typescript
const storagePaths = await listAllFilePaths();
const firestorePaths = await getReferencedFilePaths();
const orphaned = storagePaths.filter(p => !firestorePaths.has(p));
console.log('Orphaned files:', orphaned);
```

### Issue: "Signed URLs expire too quickly"

**Cause**: 60-minute expiration is too short for long videos

**Solution**: Increase expiration time or implement URL refresh:
```typescript
// Refresh URL before it expires
React.useEffect(() => {
  const refreshInterval = setInterval(async () => {
    const newUrl = await getSignedUrl(file.id, 60);
    setCurrentUrl(newUrl);
  }, 50 * 60 * 1000); // Refresh every 50 minutes

  return () => clearInterval(refreshInterval);
}, [file]);
```

---

## Security Considerations

### 1. Access Control

**Current**: Admin role required for DELETE operations
```typescript
if (!requireRole(user, ['admin'])) {
  return apiError('Insufficient permissions', 403);
}
```

**Future**: Add role-based read permissions
```typescript
if (!requireRole(user, ['admin', 'teacher', 'viewer'])) {
  return apiError('Insufficient permissions', 403);
}
```

### 2. Path Traversal Protection

**Validation**: Ensure path starts with `media/`
```typescript
if (!filePath.startsWith('media/')) {
  return apiError('Invalid file path', 400);
}
```

**Additional Protection**: Disallow `..` in path
```typescript
if (filePath.includes('..')) {
  return apiError('Invalid file path', 400);
}
```

### 3. Rate Limiting

**Recommendation**: Implement rate limiting for delete operations
```typescript
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'minute',
});

export async function DELETE(request: NextRequest) {
  const remaining = await limiter.removeTokens(1);
  if (remaining < 0) {
    return apiError('Rate limit exceeded', 429);
  }

  // ... rest of handler
}
```

---

**Last Updated**: 2025-11-02
**Version**: 1.0.0
**Status**: Production-ready
