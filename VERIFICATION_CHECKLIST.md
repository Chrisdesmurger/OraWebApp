# Media Library Refactor - Verification Checklist

## Quick Test Guide

### Prerequisites
- Admin account with access to OraWebApp
- At least one lesson with multiple quality renditions in Firestore
- Access to browser developer tools for debugging

---

## Test 1: Media List View (ORIGINAL Files Only)

### Steps:
1. Navigate to `/admin/media` in the web app
2. Wait for media files to load
3. Inspect the file list

### Expected Results:
- ✅ Only files in `/original/` directories are shown
- ✅ No files with `/high/`, `/medium/`, or `/low/` in path
- ✅ No filenames like `high.mp4`, `medium.mp3`, `low.mp4`
- ✅ Each lesson appears only ONCE (not 3-4 times)
- ✅ File names are displayed correctly
- ✅ Lesson titles are shown when available

### Console Logs to Check:
```
[convertToMediaFile] Skipping rendition: media/lessons/xxx/high/video.mp4
[convertToMediaFile] Skipping rendition: media/lessons/xxx/medium/video.mp4
[convertToMediaFile] Skipping rendition: media/lessons/xxx/low/video.mp4
```

---

## Test 2: Preview Dialog (ORIGINAL + Renditions)

### Steps:
1. Click on any video or audio file in the media list
2. Wait for preview dialog to open
3. Scroll to "Available Quality Versions" section

### Expected Results:
- ✅ ORIGINAL quality is shown at the top
- ✅ ORIGINAL has primary blue border
- ✅ ORIGINAL shows "Current" badge
- ✅ HIGH quality is listed below ORIGINAL
- ✅ MEDIUM quality is listed
- ✅ LOW quality is listed
- ✅ Each rendition shows correct file size
- ✅ Each rendition has "Play" and "Download" buttons

### Visual Layout:
```
┌─────────────────────────────────────────────────┐
│ Available Quality Versions                      │
├─────────────────────────────────────────────────┤
│ [ORIGINAL] 477.0 MB [Current]      [Download]   │ ← Blue border
├─────────────────────────────────────────────────┤
│ [HIGH] 143.1 MB           [Play] [Download]     │
├─────────────────────────────────────────────────┤
│ [MEDIUM] 47.7 MB          [Play] [Download]     │
├─────────────────────────────────────────────────┤
│ [LOW] 19.1 MB             [Play] [Download]     │
└─────────────────────────────────────────────────┘
```

---

## Test 3: Play Alternative Quality

### Steps:
1. Open preview dialog for a video file
2. Click "Play" button on MEDIUM quality
3. Observe video player

### Expected Results:
- ✅ Video player switches to MEDIUM quality URL
- ✅ Video plays from the new quality version
- ✅ No errors in console
- ✅ Can switch between qualities multiple times

---

## Test 4: Download Alternative Quality

### Steps:
1. Open preview dialog
2. Click "Download" on LOW quality
3. Check downloaded file

### Expected Results:
- ✅ File downloads successfully
- ✅ File size matches LOW quality size
- ✅ File plays correctly (lower quality than original)

---

## Test 5: Cascade Delete (Single File)

### Steps:
1. Note down a file path (e.g., `media/lessons/lesson123/original/video.mp4`)
2. Check Firebase Storage for ALL related files:
   - `media/lessons/lesson123/original/video.mp4`
   - `media/lessons/lesson123/high/video.mp4`
   - `media/lessons/lesson123/medium/video.mp4`
   - `media/lessons/lesson123/low/video.mp4`
3. Click "Delete" in preview dialog
4. Confirm deletion
5. Check Firebase Storage again

### Expected Results:
- ✅ All 4 files are deleted from Firebase Storage
- ✅ Console shows: `Successfully deleted 4 file(s)`
- ✅ API response includes `deletedPaths` array with all 4 paths
- ✅ Audit log records all deletions
- ✅ File disappears from media list

### Console Logs to Check:
```
[DELETE /api/media/[id]] Deleting file and all renditions: media/lessons/xxx/original/video.mp4
[getAllRelatedFilePaths] Found 4 files to delete for: media/lessons/xxx/original/video.mp4
[DELETE /api/media/[id]] Deleting 4 files: [array of paths]
[deleteSingleFile] ✅ Deleted: media/lessons/xxx/original/video.mp4
[deleteSingleFile] ✅ Deleted: media/lessons/xxx/high/video.mp4
[deleteSingleFile] ✅ Deleted: media/lessons/xxx/medium/video.mp4
[deleteSingleFile] ✅ Deleted: media/lessons/xxx/low/video.mp4
[DELETE /api/media/[id]] Successfully deleted 4 files
```

---

## Test 6: Cascade Delete with Missing Renditions

### Steps:
1. Upload a standalone file (no lesson association)
2. Delete the file
3. Check API response

### Expected Results:
- ✅ Only 1 file deleted (the standalone file)
- ✅ No errors about missing renditions
- ✅ API response: `deletedPaths` contains only 1 path
- ✅ Console shows: `Successfully deleted 1 file(s)`

---

## Test 7: Partial Delete Failure

### Scenario: Some renditions exist, others don't

### Steps:
1. Manually delete ONE rendition file from Firebase Storage (e.g., medium.mp4)
2. Delete the original file via UI
3. Check API response

### Expected Results:
- ✅ Original, high, and low are deleted successfully
- ✅ Medium deletion fails with error
- ✅ API response includes both `deletedPaths` (3 files) and `errors` (1 error)
- ✅ Error message indicates medium.mp4 could not be deleted
- ✅ Audit log records both successes and failures

### Expected API Response:
```json
{
  "message": "Successfully deleted 3 file(s)",
  "deletedPaths": [
    "media/lessons/xxx/original/video.mp4",
    "media/lessons/xxx/high/video.mp4",
    "media/lessons/xxx/low/video.mp4"
  ],
  "errors": [
    {
      "path": "media/lessons/xxx/medium/video.mp4",
      "error": "No such object: ..."
    }
  ]
}
```

---

## Test 8: Edge Case - Orphaned Files

### Steps:
1. Find an orphaned file (not referenced in any lesson)
2. Open preview dialog
3. Check "Available Quality Versions" section

### Expected Results:
- ✅ ORIGINAL is shown
- ✅ No renditions listed (orphaned files don't have renditions)
- ✅ "Orphaned File" warning is displayed
- ✅ Can delete successfully

---

## Test 9: Edge Case - File Without Renditions

### Steps:
1. Upload a file directly to `/original/` without creating renditions
2. View in media list
3. Open preview dialog

### Expected Results:
- ✅ File appears in media list
- ✅ Preview opens successfully
- ✅ "Available Quality Versions" section is NOT shown (no renditions)
- ✅ Can delete successfully
- ✅ Only 1 file deleted

---

## Test 10: Performance Test

### Steps:
1. Navigate to media library with 50+ files
2. Measure page load time
3. Scroll through list
4. Open several preview dialogs

### Expected Results:
- ✅ List loads within 3 seconds
- ✅ Smooth scrolling (no lag)
- ✅ Preview dialogs open quickly
- ✅ Alternative versions load within 1 second
- ✅ No memory leaks (check DevTools Memory tab)

---

## Test 11: Firestore Query Validation

### Steps:
1. Open browser DevTools → Network tab
2. Navigate to media library
3. Filter network by "firestore" or check console logs

### Expected Results:
- ✅ Only ONE query to `lessons` collection per page load
- ✅ No redundant queries for each file
- ✅ Efficient use of Firestore reads

---

## Test 12: Audit Log Verification

### Steps:
1. Delete a file with renditions
2. Check audit logs (Firestore `audit_logs` collection or logs UI)
3. Verify logged information

### Expected Results:
- ✅ Log entry exists for deletion
- ✅ `resourceType` = "lesson"
- ✅ `actorId` = current user UID
- ✅ `resource.originalPath` = original file path
- ✅ `resource.deletedPaths` = array of all deleted files
- ✅ `resource.deletedCount` = number of files deleted
- ✅ Timestamp is correct

---

## Regression Tests

### Test A: Existing Functionality - Upload
- ✅ File upload still works
- ✅ Uploaded files appear in list immediately
- ✅ No errors during upload

### Test B: Existing Functionality - Search/Filter
- ✅ Search by filename works
- ✅ Filter by type (video/audio/image) works
- ✅ Filter by lesson works
- ✅ Filter by orphaned status works

### Test C: Existing Functionality - Pagination
- ✅ Pagination controls work
- ✅ Next/Previous page works
- ✅ Correct number of files per page

---

## Browser Compatibility

Test in the following browsers:

### Chrome/Edge (Chromium)
- ✅ All tests pass
- ✅ No console errors
- ✅ UI renders correctly

### Firefox
- ✅ All tests pass
- ✅ No console errors
- ✅ UI renders correctly

### Safari
- ✅ All tests pass
- ✅ No console errors
- ✅ UI renders correctly

---

## Error Scenarios

### Scenario 1: Network Failure During Delete
- ✅ Graceful error handling
- ✅ User sees error message
- ✅ Partial deletions are reported correctly

### Scenario 2: Invalid File Path
- ✅ API returns 400 error
- ✅ Error message explains the issue
- ✅ No files are deleted

### Scenario 3: Insufficient Permissions
- ✅ API returns 403 error
- ✅ Error message says "Insufficient permissions"
- ✅ No files are deleted

### Scenario 4: Firestore Document Not Found
- ✅ Only original file is deleted
- ✅ Console logs warning about missing lesson
- ✅ No errors thrown

---

## Sign-Off Checklist

### Developer
- [ ] All code changes reviewed
- [ ] Console logs are production-appropriate
- [ ] Error handling is comprehensive
- [ ] TypeScript types are correct
- [ ] No hardcoded values

### QA
- [ ] All 12 main tests pass
- [ ] All edge cases tested
- [ ] All error scenarios tested
- [ ] Browser compatibility verified
- [ ] Performance is acceptable

### Product Owner
- [ ] UX is intuitive
- [ ] Matches design requirements
- [ ] No regressions in existing features
- [ ] Documentation is complete

---

## Known Issues / Limitations

1. **Rendition detection**: Assumes files are in `/original/`, `/high/`, `/medium/`, `/low/` directories
2. **Lesson ID extraction**: Uses regex pattern `media/lessons/{lessonId}/...`
3. **File size accuracy**: Depends on Firestore `size_bytes` field being populated
4. **Signed URL expiration**: URLs expire after 60 minutes (requires refresh)

---

## Rollback Plan

If critical issues are found:

1. Revert `storage-utils.ts` to previous version
2. Revert `route.ts` to single-file deletion
3. Revert `MediaPreviewDialog.tsx` to show only HIGH quality
4. Deploy immediately
5. Files will show high/medium/low in list again (safe fallback)

---

**Test Date**: _____________

**Tester**: _____________

**Results**: ✅ PASS / ❌ FAIL

**Notes**:
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________
