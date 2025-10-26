# feat: Add video/audio player for content preview in admin portal

## Summary

Add a video/audio player component to the admin portal that allows teachers and admins to preview uploaded media content. The player should be available in two locations:
1. **Content Details page** (`/admin/content` → View Details)
2. **Manage Lessons dialog** (when adding lessons to programs)

## Motivation

- **Content Verification**: Teachers/admins need to verify uploaded content before adding to programs
- **Quality Control**: Preview videos/audio to ensure correct upload and quality
- **Better UX**: Visual confirmation of what lesson users will see
- **Time Saving**: No need to download files to check content
- **Program Management**: Preview lessons before adding them to programs

## Current State

### Existing Infrastructure
- ✅ Lessons store `renditions` (video) and `audio_variants` in Firestore
- ✅ Lessons have `thumbnail_url` for video previews
- ✅ Lessons have `storage_path_original` for original media files
- ✅ Media files stored in Firebase Storage
- ✅ UI already shows media type icons (video/audio/article)

### Missing Functionality
- ❌ No player component to preview videos
- ❌ No player component to preview audio
- ❌ Content Details page doesn't show media preview
- ❌ Manage Lessons dialog doesn't allow preview before adding

## Proposed Solution

### 1. Create Reusable Media Player Component

**File**: `components/media/media-player.tsx` (NEW)

Features:
- Video player with native HTML5 controls
- Audio player with custom UI
- Play/pause, seek, volume controls
- Time display (current/duration)
- Responsive design
- Error handling for missing media

### 2. Update Content Details View

**File**: `app/admin/content/[id]/page.tsx` (NEW or UPDATE)

Add media player to lesson details page with:
- Full-width video player for videos
- Compact audio player for audio files
- Display lesson metadata below player

### 3. Update Manage Lessons Dialog

**File**: `app/admin/programs/_components/ManageLessonsDialog.tsx`

Add preview functionality:
- Eye icon button next to each lesson
- Preview modal with MediaPlayer
- Preview before adding to program

### 4. Update LessonPickerDialog

**File**: `app/admin/programs/_components/LessonPickerDialog.tsx`

Add preview button in lesson selection list

## Implementation Plan

### Phase 1: Core Player Component (Priority: High)
- [ ] Create `components/media/media-player.tsx`
- [ ] Implement video player with controls
- [ ] Implement audio player with controls
- [ ] Add play/pause functionality
- [ ] Add seek/scrub functionality
- [ ] Add volume controls
- [ ] Add time display (current/duration)
- [ ] Add fullscreen support (video only)
- [ ] Test with sample video/audio files

### Phase 2: Content Details Integration (Priority: High)
- [ ] Create or update `app/admin/content/[id]/page.tsx`
- [ ] Fetch lesson details by ID
- [ ] Integrate MediaPlayer component
- [ ] Handle video renditions (high/medium/low quality)
- [ ] Handle audio variants (high/medium/low quality)
- [ ] Add loading states
- [ ] Add error handling (media not found)
- [ ] Test with real uploaded content

### Phase 3: Manage Lessons Integration (Priority: Medium)
- [ ] Update `ManageLessonsDialog.tsx`
- [ ] Add preview button to lesson list items
- [ ] Create preview modal with MediaPlayer
- [ ] Implement getMediaUrl helper function
- [ ] Handle preview modal open/close
- [ ] Test preview in "Current Lessons" tab
- [ ] Update `LessonPickerDialog.tsx`
- [ ] Add preview button to picker items
- [ ] Share preview modal between components

### Phase 4: UI/UX Polish (Priority: Medium)
- [ ] Add keyboard shortcuts (Space = play/pause)
- [ ] Add loading spinner while media loads
- [ ] Add error state for failed media load
- [ ] Add thumbnail preview before play (video)
- [ ] Optimize player size for mobile/tablet
- [ ] Add quality selector (high/medium/low)
- [ ] Add playback speed controls

### Phase 5: Testing (Priority: High)
- [ ] Test video playback with uploaded videos
- [ ] Test audio playback with uploaded audio
- [ ] Test different video formats (mp4, webm)
- [ ] Test different audio formats (mp3, aac, ogg)
- [ ] Test on different browsers
- [ ] Test responsive design
- [ ] Test with slow network
- [ ] Test with invalid/missing media URLs

## Technical Considerations

### Media URL Strategy
Priority order for selecting best quality:
1. High quality rendition/variant
2. Medium quality rendition/variant
3. Low quality rendition/variant
4. Original storage path

### Firestore Storage URLs
- URLs should include Firebase Storage signed URLs with tokens
- Consider URL expiration and refresh mechanism

### Performance Optimization
- Use video `poster` attribute for faster load
- Preload metadata only, not entire video
- Lazy load player component when not visible

### Browser Compatibility
- Test HTML5 video/audio support
- Provide fallback message for unsupported browsers
- Use standard formats: MP4 (H.264) for video, MP3/AAC for audio

### Accessibility
- Add ARIA labels to all controls
- Ensure keyboard navigation works
- Provide text alternatives for media content

## Success Criteria

- ✅ Video player displays and plays uploaded videos
- ✅ Audio player displays and plays uploaded audio
- ✅ Player works in Content Details page
- ✅ Player works in Manage Lessons dialog
- ✅ Player works in Lesson Picker dialog
- ✅ Play/pause controls work correctly
- ✅ Seek/scrub timeline works
- ✅ Volume controls work
- ✅ Time display shows current/total duration
- ✅ Fullscreen mode works for videos
- ✅ Player handles loading states gracefully
- ✅ Player handles errors gracefully
- ✅ Player is responsive on all screen sizes
- ✅ Player works across major browsers

## Related Files

### New Files
- `components/media/media-player.tsx` (NEW)
- `app/admin/content/[id]/page.tsx` (NEW or UPDATE)

### Modified Files
- `app/admin/programs/_components/ManageLessonsDialog.tsx`
- `app/admin/programs/_components/LessonPickerDialog.tsx`
- `app/admin/programs/_components/DraggableLessonList.tsx` (optional)

### Related Types
- `types/lesson.ts` (already has renditions/audioVariants)

## Future Enhancements (Out of Scope)

- Picture-in-picture mode
- Download media button
- Playback speed controls
- Subtitle/caption support
- Waveform visualization for audio
- Thumbnail preview on hover
- Media analytics (view count, watch time)

---

**Priority**: High
**Effort**: Large (8-12 hours)
**Dependencies**: Issue #10 (description field - optional)
**Breaking Changes**: None

🤖 Generated with [Claude Code](https://claude.com/claude-code)
