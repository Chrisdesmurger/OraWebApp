# Media Library Refactor - Summary Report

## Overview

Successfully refactored the Media Library to show only ORIGINAL uploaded files in the list view, with all renditions (high, medium, low) accessible via the preview dialog. Implemented cascade delete functionality to remove all related files when deleting a media item.

**Date**: 2025-11-02
**Working Directory**: C:\Users\chris\source\repos\OraWebApp

---

## Changes Made

### 1. ✅ Updated `shouldIncludeInMediaList()` in storage-utils.ts

**File**: `C:\Users\chris\source\repos\OraWebApp\lib\firebase\storage-utils.ts`

**Change**: Modified filter logic to ONLY show original files

```typescript
function shouldIncludeInMediaList(filePath: string): boolean {
  // ONLY include original files
  // Original files are stored in: media/lessons/{id}/original/

  // Exclude all renditions (high, medium, low)
  const pathLower = filePath.toLowerCase();

  if (pathLower.includes('/high/') ||
      pathLower.includes('/medium/') ||
      pathLower.includes('/low/')) {
    return false;
  }

  // Exclude filename patterns
  const fileName = filePath.split('/').pop() || '';
  const fileNameLower = fileName.toLowerCase();

  if (fileNameLower.startsWith('high.') ||
      fileNameLower.startsWith('medium.') ||
      fileNameLower.startsWith('low.') ||
      fileNameLower.match(/(high|medium|low)\.(mp4|mp3|webm|ogg|m4a)/i)) {
    return false;
  }

  // ONLY include files in /original/ directory OR standalone files
  if (pathLower.includes('/original/') || !pathLower.match(/\/(high|medium|low)\//)) {
    return true;
  }

  return false;
}
```

**Result**:
- ✅ Excludes files in `/high/`, `/medium/`, `/low/` directories
- ✅ Excludes filenames like `high.mp4`, `medium.mp3`, `low.mp4`
- ✅ Only includes files in `/original/` directory or standalone files

---

### 2. ✅ Updated `getAlternativeVersions()` to Include HIGH Quality

**File**: `C:\Users\chris\source\repos\OraWebApp\lib\firebase\storage-utils.ts`

**Change**: Added HIGH quality to the alternatives list (since we're now showing original, not high)

```typescript
async function getAlternativeVersions(
  lessonData: any,
  isVideo: boolean
): Promise<AlternativeVersion[]> {
  const versions: AlternativeVersion[] = [];
  const variantsKey = isVideo ? 'renditions' : 'audio_variants';
  const variants = lessonData[variantsKey];

  if (!variants) {
    return versions;
  }

  // Add HIGH quality version
  if (variants.high?.path) {
    try {
      const url = await getSignedUrl(variants.high.path, 60);
      versions.push({
        quality: 'high',
        path: variants.high.path,
        url,
        size: variants.high.size_bytes || 0,
        sizeFormatted: formatBytes(variants.high.size_bytes || 0),
      });
    } catch (error) {
      console.warn('[getAlternativeVersions] Failed to get URL for high quality:', error);
    }
  }

  // Add MEDIUM quality version
  if (variants.medium?.path) {
    // ... (same pattern)
  }

  // Add LOW quality version
  if (variants.low?.path) {
    // ... (same pattern)
  }

  return versions;
}
```

**Result**:
- ✅ Returns all three quality levels: HIGH, MEDIUM, LOW
- ✅ Generates signed URLs for each rendition
- ✅ Includes file size information

---

### 3. ✅ Updated `convertToMediaFile()` to Detect Original Files

**File**: `C:\Users\chris\source\repos\OraWebApp\lib\firebase\storage-utils.ts`

**Change**: Modified logic to detect original files and fetch ALL renditions

```typescript
if (lessonId && (mediaType === 'video' || mediaType === 'audio')) {
  // Check if this is an original file
  const isOriginal = filePath.includes('/original/');

  if (isOriginal) {
    try {
      // Fetch lesson data to get ALL renditions (high, medium, low)
      const lessonDoc = await firestore.collection('lessons').doc(lessonId).get();
      if (lessonDoc.exists) {
        const lessonData = lessonDoc.data();
        alternativeVersions = await getAlternativeVersions(
          lessonData,
          mediaType === 'video'
        );
      }
    } catch (error) {
      console.warn('[convertToMediaFile] Failed to fetch alternative versions:', error);
    }
  }
}
```

**Result**:
- ✅ Detects original files by checking for `/original/` in path
- ✅ Fetches lesson document to get rendition metadata
- ✅ Populates `alternativeVersions` array with all quality levels

---

### 4. ✅ Created `getAllRelatedFilePaths()` Helper Function

**File**: `C:\Users\chris\source\repos\OraWebApp\lib\firebase\storage-utils.ts`

**Change**: New exported function to find all files related to a media file

```typescript
/**
 * Get all file paths related to a media file (original + all renditions)
 *
 * @param firestore - Firestore instance
 * @param originalFilePath - Path to the original file
 * @returns Array of all related file paths to delete
 */
export async function getAllRelatedFilePaths(
  firestore: FirebaseFirestore.Firestore,
  originalFilePath: string
): Promise<string[]> {
  const paths: string[] = [originalFilePath];

  try {
    // Extract lesson ID from path
    const lessonId = extractLessonIdFromPath(originalFilePath);

    if (!lessonId) {
      // Not a lesson file, return just the original
      return paths;
    }

    // Fetch lesson document
    const lessonDoc = await firestore.collection('lessons').doc(lessonId).get();

    if (!lessonDoc.exists) {
      return paths;
    }

    const lessonData = lessonDoc.data();

    // Add video renditions
    if (lessonData?.renditions) {
      if (lessonData.renditions.high?.path) paths.push(lessonData.renditions.high.path);
      if (lessonData.renditions.medium?.path) paths.push(lessonData.renditions.medium.path);
      if (lessonData.renditions.low?.path) paths.push(lessonData.renditions.low.path);
    }

    // Add audio variants
    if (lessonData?.audio_variants) {
      if (lessonData.audio_variants.high?.path) paths.push(lessonData.audio_variants.high.path);
      if (lessonData.audio_variants.medium?.path) paths.push(lessonData.audio_variants.medium.path);
      if (lessonData.audio_variants.low?.path) paths.push(lessonData.audio_variants.low.path);
    }

    console.log('[getAllRelatedFilePaths] Found', paths.length, 'files to delete for:', originalFilePath);

    return paths;
  } catch (error: any) {
    console.error('[getAllRelatedFilePaths] Error:', error);
    // Return at least the original file
    return paths;
  }
}
```

**Result**:
- ✅ Exported as public function from storage-utils.ts
- ✅ Finds all video renditions (high, medium, low)
- ✅ Finds all audio variants (high, medium, low)
- ✅ Returns at least the original file if anything fails
- ✅ Logs the number of files found for debugging

---

### 5. ✅ Updated DELETE `/api/media/[id]/route.ts`

**File**: `C:\Users\chris\source\repos\OraWebApp\app\api\media\[id]\route.ts`

**Change**: Modified to cascade delete ALL related files

```typescript
import { deleteSingleFile, getAllRelatedFilePaths } from '@/lib/firebase/storage-utils';
import { getFirestore } from '@/lib/firebase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ... authentication & validation ...

    const firestore = getFirestore();

    // Get ALL related file paths (original + renditions)
    const allPaths = await getAllRelatedFilePaths(firestore, filePath);

    console.log('[DELETE /api/media/[id]] Deleting', allPaths.length, 'files:', allPaths);

    // Delete all files
    const deletedPaths: string[] = [];
    const errors: Array<{ path: string; error: string }> = [];

    for (const path of allPaths) {
      try {
        await deleteSingleFile(path);
        deletedPaths.push(path);
      } catch (error: any) {
        console.error('[DELETE /api/media/[id]] Failed to delete:', path, error);
        errors.push({ path, error: error.message });
      }
    }

    console.log('[DELETE /api/media/[id]] Successfully deleted', deletedPaths.length, 'files');

    // Log audit event with all deleted paths
    await logDelete({
      resourceType: 'lesson',
      resourceId: filePath,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: {
        originalPath: filePath,
        deletedPaths,
        deletedAt: new Date().toISOString(),
        deletedCount: deletedPaths.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      request,
    });

    return apiSuccess({
      message: `Successfully deleted ${deletedPaths.length} file(s)`,
      deletedPaths,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('DELETE /api/media/[id] error:', error);
    return apiError(error.message || 'Failed to delete media file', 500);
  }
}
```

**Result**:
- ✅ Fetches all related file paths using `getAllRelatedFilePaths()`
- ✅ Deletes all files in a loop
- ✅ Collects both successful deletions and errors
- ✅ Returns detailed response with deleted paths and any errors
- ✅ Logs comprehensive audit trail with all deleted files

---

### 6. ✅ Updated MediaPreviewDialog.tsx

**File**: `C:\Users\chris\source\repos\OraWebApp\components\media\MediaPreviewDialog.tsx`

**Change**: Updated rendering to show ORIGINAL quality + renditions

```tsx
{/* Alternative Quality Versions */}
{file.alternativeVersions && file.alternativeVersions.length > 0 && (
  <div className="space-y-2">
    <h4 className="font-medium text-sm">Available Quality Versions</h4>

    {/* ORIGINAL quality (current file being viewed) */}
    <div className="flex items-center justify-between p-3 bg-muted rounded border-2 border-primary">
      <div className="flex items-center gap-2">
        <Badge variant="default">ORIGINAL</Badge>
        <span className="text-sm font-medium">{formatBytes(file.size)}</span>
        <Badge variant="outline" className="text-xs">Current</Badge>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" asChild>
          <a href={file.url} download>
            <Download className="h-4 w-4 mr-1" />
            Download
          </a>
        </Button>
      </div>
    </div>

    {/* HIGH/MEDIUM/LOW renditions */}
    {file.alternativeVersions.map((version) => (
      <div
        key={version.quality}
        className="flex items-center justify-between p-3 bg-muted rounded"
      >
        <div className="flex items-center gap-3">
          <Badge variant={version.quality === 'high' ? 'default' : 'secondary'}>
            {version.quality.toUpperCase()}
          </Badge>
          <span className="text-sm">{version.sizeFormatted}</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentUrl(version.url)}
          >
            <Play className="h-4 w-4 mr-1" />
            Play
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={version.url} download>
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </Button>
        </div>
      </div>
    ))}
  </div>
)}
```

**Result**:
- ✅ Shows ORIGINAL quality with primary border highlighting
- ✅ Shows all renditions (HIGH, MEDIUM, LOW) below original
- ✅ Each rendition has Play and Download buttons
- ✅ Playing a rendition switches the video player to that quality
- ✅ Visual distinction between ORIGINAL and renditions

---

### 7. ✅ Verified types/media.ts

**File**: `C:\Users\chris\source\repos\OraWebApp\types\media.ts`

**Status**: No changes needed - already correct

```typescript
export interface AlternativeVersion {
  quality: 'high' | 'medium' | 'low';
  path: string;
  url: string;
  size: number;
  sizeFormatted: string;
}
```

**Result**:
- ✅ AlternativeVersion type already includes 'high' | 'medium' | 'low'
- ✅ No type changes required

---

## Firestore Lesson Structure

The implementation assumes the following Firestore document structure:

```typescript
{
  storage_path_original: "media/lessons/{id}/original/video.mp4",
  renditions: {
    high: {
      path: "media/lessons/{id}/high/video.mp4",
      size_bytes: 150000000
    },
    medium: {
      path: "media/lessons/{id}/medium/video.mp4",
      size_bytes: 50000000
    },
    low: {
      path: "media/lessons/{id}/low/video.mp4",
      size_bytes: 20000000
    }
  },
  audio_variants: {
    high: { path: "...", size_bytes: ... },
    medium: { path: "...", size_bytes: ... },
    low: { path: "...", size_bytes: ... }
  }
}
```

---

## Testing Checklist

### ✅ Media List View
- [ ] Only ORIGINAL files appear in the media library list
- [ ] HIGH, MEDIUM, LOW renditions are NOT shown in list
- [ ] File names are displayed correctly
- [ ] Lesson titles are shown when available

### ✅ Preview Dialog
- [ ] ORIGINAL quality is shown with primary border
- [ ] ORIGINAL is marked as "Current"
- [ ] All renditions (HIGH, MEDIUM, LOW) are listed below
- [ ] Each rendition shows correct file size
- [ ] Play button switches video to selected quality
- [ ] Download buttons work for all quality levels

### ✅ Cascade Delete
- [ ] Deleting ORIGINAL file also deletes ALL renditions
- [ ] API returns count of deleted files
- [ ] Audit log records all deleted file paths
- [ ] Error handling for partially failed deletions
- [ ] Graceful handling if lesson document not found

### ✅ Edge Cases
- [ ] Standalone files (no lesson) work correctly
- [ ] Files without renditions don't error
- [ ] Missing rendition fields are handled gracefully
- [ ] Large file lists load without issues

---

## API Response Format

### GET /api/media Response

```json
{
  "files": [
    {
      "id": "media/lessons/lesson123/original/video.mp4",
      "name": "video.mp4",
      "lessonTitle": "Meditation Basics",
      "type": "video",
      "size": 500000000,
      "url": "https://storage.googleapis.com/...",
      "contentType": "video/mp4",
      "uploadedAt": "2025-11-01T10:00:00.000Z",
      "usedInLessons": [
        { "id": "lesson123", "title": "Meditation Basics" }
      ],
      "isOrphaned": false,
      "alternativeVersions": [
        {
          "quality": "high",
          "path": "media/lessons/lesson123/high/video.mp4",
          "url": "https://storage.googleapis.com/...",
          "size": 150000000,
          "sizeFormatted": "143.1 MB"
        },
        {
          "quality": "medium",
          "path": "media/lessons/lesson123/medium/video.mp4",
          "url": "https://storage.googleapis.com/...",
          "size": 50000000,
          "sizeFormatted": "47.7 MB"
        },
        {
          "quality": "low",
          "path": "media/lessons/lesson123/low/video.mp4",
          "url": "https://storage.googleapis.com/...",
          "size": 20000000,
          "sizeFormatted": "19.1 MB"
        }
      ]
    }
  ],
  "hasMore": false
}
```

### DELETE /api/media/[id] Response

```json
{
  "message": "Successfully deleted 4 file(s)",
  "deletedPaths": [
    "media/lessons/lesson123/original/video.mp4",
    "media/lessons/lesson123/high/video.mp4",
    "media/lessons/lesson123/medium/video.mp4",
    "media/lessons/lesson123/low/video.mp4"
  ],
  "errors": []
}
```

---

## Files Modified

| File | Changes | Lines Changed |
|------|---------|---------------|
| `lib/firebase/storage-utils.ts` | Updated filtering logic, added cascade delete helper | ~100 |
| `app/api/media/[id]/route.ts` | Implemented cascade delete | ~40 |
| `components/media/MediaPreviewDialog.tsx` | Updated UI to show ORIGINAL + renditions | ~20 |
| `types/media.ts` | No changes (already correct) | 0 |

**Total Lines Changed**: ~160

---

## Summary

All requirements have been successfully implemented:

1. ✅ Updated `shouldIncludeInMediaList()` to only show /original/ files
2. ✅ Updated `getAlternativeVersions()` to include HIGH quality
3. ✅ Updated `convertToMediaFile()` to detect original files
4. ✅ Created `getAllRelatedFilePaths()` helper function
5. ✅ Updated DELETE route to cascade delete all renditions
6. ✅ Updated MediaPreviewDialog to show ORIGINAL + renditions
7. ✅ Exported `getAllRelatedFilePaths` from storage-utils.ts
8. ✅ Ready for testing: only original files appear in list
9. ✅ Ready for testing: all renditions are deleted together

The Media Library now provides a clean, user-friendly interface where:
- Only ORIGINAL uploaded files appear in the main list
- Technical renditions are hidden from the list view
- All quality versions are accessible in the preview dialog
- Deleting a file removes ALL associated renditions automatically
- Comprehensive audit logging tracks all deletions

---

**Status**: ✅ COMPLETE - All requirements met and ready for testing
