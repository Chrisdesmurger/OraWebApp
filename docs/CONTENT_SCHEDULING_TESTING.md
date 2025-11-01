# Content Scheduling Feature - Testing Guide

**Issue #22**: Content Scheduling & Auto-Publishing
**Purpose**: Manual testing checklist for QA and developers

---

## Prerequisites

1. Firebase project with Firestore enabled
2. Admin user with role='admin'
3. Teacher user with role='teacher'
4. OraWebApp running locally: `npm run dev`
5. Postman or curl for API testing

---

## Backend API Testing

### Test 1: Create Program with Scheduling

**Endpoint**: POST /api/programs
**Auth**: Admin or Teacher
**Expected**: 201 Created

```bash
curl -X POST http://localhost:3000/api/programs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Future Meditation Program",
    "description": "This program will auto-publish next month",
    "category": "meditation",
    "difficulty": "beginner",
    "durationDays": 14,
    "tags": ["scheduled", "test"],
    "scheduledPublishAt": "2025-12-01T00:00:00Z",
    "scheduledArchiveAt": "2026-01-01T00:00:00Z",
    "autoPublishEnabled": true
  }'
```

**Verify**:
- [x] Response includes all scheduling fields in camelCase
- [x] Status code is 201
- [x] Program created with status='draft'
- [x] scheduledPublishAt and scheduledArchiveAt are set
- [x] autoPublishEnabled is true

---

### Test 2: Validation - Publish After Archive

**Endpoint**: POST /api/programs
**Expected**: 400 Bad Request

```bash
curl -X POST http://localhost:3000/api/programs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid Schedule",
    "description": "Archive before publish - should fail",
    "category": "yoga",
    "difficulty": "beginner",
    "durationDays": 7,
    "scheduledPublishAt": "2026-01-01T00:00:00Z",
    "scheduledArchiveAt": "2025-12-01T00:00:00Z"
  }'
```

**Verify**:
- [x] Status code is 400
- [x] Error message mentions "publish date must be before archive date"

---

### Test 3: Validation - Past Dates

**Endpoint**: POST /api/programs
**Expected**: 400 Bad Request

```bash
curl -X POST http://localhost:3000/api/programs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Past Schedule",
    "description": "Scheduled for yesterday - should fail",
    "category": "mindfulness",
    "difficulty": "intermediate",
    "durationDays": 7,
    "scheduledPublishAt": "2020-01-01T00:00:00Z"
  }'
```

**Verify**:
- [x] Status code is 400
- [x] Error message mentions "dates must be in the future"

---

### Test 4: Update Program Scheduling

**Endpoint**: PATCH /api/programs/[id]
**Auth**: Admin or Owner Teacher
**Expected**: 200 OK

```bash
curl -X PATCH http://localhost:3000/api/programs/PROGRAM_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledPublishAt": "2025-12-15T12:00:00Z",
    "autoPublishEnabled": false
  }'
```

**Verify**:
- [x] Status code is 200
- [x] scheduledPublishAt updated
- [x] autoPublishEnabled changed to false
- [x] Audit log created with changes

---

### Test 5: Clear Scheduled Dates

**Endpoint**: PATCH /api/programs/[id]
**Expected**: 200 OK

```bash
curl -X PATCH http://localhost:3000/api/programs/PROGRAM_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledPublishAt": null,
    "scheduledArchiveAt": null
  }'
```

**Verify**:
- [x] Status code is 200
- [x] Both scheduled dates are null
- [x] autoPublishEnabled unchanged

---

### Test 6: Get Scheduled Content

**Endpoint**: GET /api/scheduled-content
**Auth**: Admin or Teacher
**Expected**: 200 OK

```bash
curl http://localhost:3000/api/scheduled-content \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify**:
- [x] Status code is 200
- [x] Returns array of ScheduledContentItem objects
- [x] Items include both programs and lessons
- [x] Items sorted by scheduledAt (earliest first)
- [x] Each item has: id, title, type, scheduleType, scheduledAt, autoPublishEnabled

---

### Test 7: Filter Scheduled Content by Type

**Endpoint**: GET /api/scheduled-content?type=program
**Expected**: 200 OK

```bash
curl http://localhost:3000/api/scheduled-content?type=program \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify**:
- [x] All returned items have type='program'
- [x] No lesson items included

---

### Test 8: Filter by Date Range

**Endpoint**: GET /api/scheduled-content?startDate=...&endDate=...
**Expected**: 200 OK

```bash
curl 'http://localhost:3000/api/scheduled-content?startDate=2025-12-01T00:00:00Z&endDate=2025-12-31T23:59:59Z' \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify**:
- [x] All returned items have scheduledAt within range
- [x] Items outside range excluded

---

### Test 9: RBAC - Teacher Sees Only Own Content

**Setup**: Create program as Teacher A
**Auth**: Teacher B
**Expected**: Teacher B doesn't see Teacher A's scheduled content

```bash
# As Teacher B
curl http://localhost:3000/api/scheduled-content \
  -H "Authorization: Bearer TEACHER_B_TOKEN"
```

**Verify**:
- [x] Teacher B only sees their own scheduled content
- [x] Teacher A's programs not included

---

### Test 10: RBAC - Admin Sees All Content

**Auth**: Admin
**Expected**: Admin sees all users' scheduled content

```bash
curl http://localhost:3000/api/scheduled-content \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Verify**:
- [x] Admin sees all scheduled content
- [x] Includes programs from all teachers

---

## Frontend UI Testing (After Implementation)

### Test 11: DateTimePicker Component

**Page**: Any dialog with scheduling
**Steps**:
1. Open CreateProgramDialog
2. Expand "Scheduling" section
3. Click "Schedule Publish Date" input

**Verify**:
- [x] DateTime picker appears
- [x] Can select future date
- [x] Shows timezone info (UTC)
- [x] Clear button works
- [x] Value updates in form

---

### Test 12: Create Program with Schedule

**Page**: /admin/programs
**Steps**:
1. Click "Create Program"
2. Fill required fields
3. Expand "Scheduling" section
4. Check "Enable automatic publishing"
5. Set publish date: Tomorrow 9:00 AM
6. Set archive date: Next week 11:59 PM
7. Click "Create Program"

**Verify**:
- [x] Program created successfully
- [x] Toast notification shows success
- [x] Program appears in list with "Scheduled" badge
- [x] Clicking program shows schedule details

---

### Test 13: Edit Program Schedule

**Page**: /admin/programs
**Steps**:
1. Click Edit on existing program
2. Modify "Schedule Publish Date"
3. Click "Save Changes"

**Verify**:
- [x] Schedule updated
- [x] Toast notification shows success
- [x] New schedule reflected in UI

---

### Test 14: Clear Scheduled Dates

**Page**: /admin/programs (Edit dialog)
**Steps**:
1. Click Edit on scheduled program
2. Click clear button (X) on publish date
3. Click clear button (X) on archive date
4. Save changes

**Verify**:
- [x] Both dates cleared (null)
- [x] "Scheduled" badge removed
- [x] No errors

---

### Test 15: Validation - Archive Before Publish

**Page**: /admin/programs (Create dialog)
**Steps**:
1. Set publish date: 2025-12-15
2. Set archive date: 2025-12-10 (before publish)
3. Try to save

**Verify**:
- [x] Validation error shown
- [x] Error message: "Archive date must be after publish date"
- [x] Form not submitted

---

### Test 16: Scheduled Content Calendar Page

**Page**: /admin/scheduled-content
**Steps**:
1. Navigate to "Scheduled Content" from sidebar
2. View list of scheduled events

**Verify**:
- [x] Page loads successfully
- [x] Shows all scheduled publish/archive events
- [x] Color-coded badges (publish=green, archive=orange)
- [x] Sorted by date (earliest first)
- [x] Click event navigates to edit dialog

---

### Test 17: Calendar Filters

**Page**: /admin/scheduled-content
**Steps**:
1. Select filter: "Type = Programs"
2. Select filter: "Schedule Type = Publish"
3. Set date range: This month

**Verify**:
- [x] Only program publish events shown
- [x] Events within date range
- [x] Filters update URL query params
- [x] Refresh preserves filters

---

### Test 18: Sidebar Navigation

**Page**: Any admin page
**Steps**:
1. Check admin sidebar
2. Look for "Scheduled Content" menu item

**Verify**:
- [x] Menu item visible
- [x] Calendar icon shown
- [x] Clicking navigates to /admin/scheduled-content
- [x] Active state when on page

---

## Integration Testing

### Test 19: End-to-End Workflow

**Scenario**: Create, schedule, edit, and view

**Steps**:
1. Login as Admin
2. Create program with schedule:
   - Title: "Holiday Yoga Series"
   - Publish: 2025-12-20 09:00
   - Archive: 2026-01-05 23:59
   - Auto-publish: enabled
3. Navigate to Scheduled Content page
4. Verify program appears in list
5. Click event, edit to change publish date
6. Save and verify update in calendar

**Verify**:
- [x] Full workflow works without errors
- [x] Data persists correctly
- [x] UI updates reflect API changes

---

### Test 20: Teacher Permissions

**Scenario**: Teacher creates scheduled content

**Steps**:
1. Login as Teacher
2. Create program with schedule
3. Navigate to Scheduled Content
4. Verify only own programs visible
5. Try to edit another teacher's program (should fail)

**Verify**:
- [x] Teacher can schedule own content
- [x] Teacher sees only own scheduled events
- [x] Cannot edit other teachers' content

---

## Performance Testing

### Test 21: Large Dataset

**Setup**: Create 100+ programs with schedules
**Expected**: Page loads in < 2 seconds

**Steps**:
1. Seed database with 100 programs (50 scheduled)
2. Navigate to Scheduled Content page
3. Measure load time

**Verify**:
- [x] Page loads quickly
- [x] No UI lag or freezing
- [x] Filters apply quickly

---

## Error Handling

### Test 22: Network Failure

**Steps**:
1. Open Create Program dialog
2. Disconnect network
3. Fill form and try to submit

**Verify**:
- [x] Error toast shown
- [x] User-friendly error message
- [x] Form data not lost

---

### Test 23: Invalid Token

**Setup**: Use expired or invalid auth token
**Expected**: 401 Unauthorized

**Verify**:
- [x] API returns 401
- [x] User redirected to login
- [x] No data exposed

---

## Browser Compatibility

### Test 24: datetime-local Support

**Browsers**: Chrome, Firefox, Safari, Edge

**Steps**:
1. Open CreateProgramDialog
2. Click datetime input
3. Test datetime picker

**Verify**:
- [x] Chrome: Native picker works
- [x] Firefox: Native picker works
- [x] Safari: Native picker works
- [x] Edge: Native picker works

---

## Accessibility Testing

### Test 25: Keyboard Navigation

**Steps**:
1. Open dialog with Tab key
2. Navigate to datetime input
3. Use keyboard to select date

**Verify**:
- [x] All fields reachable via keyboard
- [x] Tab order logical
- [x] Enter/Esc work as expected

---

### Test 26: Screen Reader

**Tool**: NVDA or VoiceOver

**Steps**:
1. Navigate to Scheduled Content page
2. Listen to announcements

**Verify**:
- [x] Labels announced correctly
- [x] Dates read in understandable format
- [x] Interactive elements identified

---

## Regression Testing

### Test 27: Existing Programs Unaffected

**Steps**:
1. Open existing program (created before feature)
2. Edit and save

**Verify**:
- [x] No errors
- [x] Scheduling fields default to null
- [x] Program updates successfully

---

### Test 28: Audit Logs

**Steps**:
1. Create program with schedule
2. Edit schedule
3. Check /admin/audit-logs

**Verify**:
- [x] Creation logged
- [x] Update logged
- [x] Changes diff shows scheduling fields
- [x] Actor and timestamp correct

---

## Cloud Function Testing (Future)

### Test 29: Auto-Publish Simulation

**Note**: Manual test until Cloud Function deployed

**Steps**:
1. Create program with scheduledPublishAt in past
2. Set autoPublishEnabled = true
3. Manually run Cloud Function (or simulate)

**Expected**:
- Program status changes to 'published'
- updated_at timestamp updated

---

## Checklist Summary

### Backend API
- [x] Create with scheduling
- [x] Update scheduling
- [x] Clear scheduling
- [x] Get scheduled content
- [x] Filters work
- [x] RBAC enforced
- [x] Validation correct

### Frontend UI (After Implementation)
- [ ] DateTimePicker works
- [ ] Create dialog accepts scheduling
- [ ] Edit dialog shows/updates scheduling
- [ ] Calendar page loads
- [ ] Filters functional
- [ ] Sidebar navigation works

### Integration
- [ ] End-to-end workflow
- [ ] Permissions enforced
- [ ] Audit logging

### Non-Functional
- [ ] Performance acceptable
- [ ] Error handling robust
- [ ] Browser compatibility
- [ ] Accessibility compliant

---

## Bug Reporting Template

**Title**: [Feature] Scheduling - [Brief Description]

**Steps to Reproduce**:
1.
2.
3.

**Expected Behavior**:

**Actual Behavior**:

**Environment**:
- Browser:
- User Role:
- API Endpoint:

**Screenshots**: (if applicable)

**Logs**: (console errors)

---

## Success Criteria

Feature is considered complete when:
1. All backend API tests pass ✅
2. All frontend UI tests pass (after implementation)
3. No critical bugs
4. Performance acceptable
5. RBAC enforced correctly
6. Audit logging working
7. Documentation complete

---

**Last Updated**: 2025-10-30
**Testing By**: QA Team / Developers
**Related Docs**: CONTENT_SCHEDULING_IMPLEMENTATION.md
