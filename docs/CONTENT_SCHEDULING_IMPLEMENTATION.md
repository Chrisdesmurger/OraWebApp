# Content Scheduling & Auto-Publishing Implementation Guide

**Issue**: #22
**Feature**: Content Scheduling & Auto-Publishing
**Status**: Backend Complete, Frontend Components Needed
**Date**: 2025-10-30

---

## Overview

This feature allows admins and teachers to schedule programs and lessons for automatic publishing and archiving at specific dates and times.

## Completed Work

### 1. Type System Updates ✅

#### Updated Files:
- `types/program.ts` - Added scheduling fields to Program and ProgramDocument interfaces
- `types/lesson.ts` - Added scheduling fields to Lesson and LessonDocument interfaces
- `types/scheduled-content.ts` - NEW: Calendar view types and helper functions

#### New Fields (all interfaces):
```typescript
// Firestore (snake_case)
scheduled_publish_at: string | null;  // ISO timestamp
scheduled_archive_at: string | null;  // ISO timestamp
auto_publish_enabled: boolean;

// Frontend (camelCase)
scheduledPublishAt: string | null;
scheduledArchiveAt: string | null;
autoPublishEnabled: boolean;
```

### 2. Validation Updates ✅

#### Updated Files:
- `lib/validators/program.ts` - Added scheduling field validation with:
  - ISO 8601 timestamp validation
  - Publish date must be before archive date
  - Dates must be in the future (for new schedules)
  - Both createProgramSchema and updateProgramSchema updated

### 3. Backend API Updates ✅

#### Updated Files:
- `app/api/programs/route.ts` - POST endpoint now accepts scheduling fields
- `app/api/programs/[id]/route.ts` - PATCH endpoint now accepts scheduling fields
- `app/api/scheduled-content/route.ts` - NEW: Calendar view API

#### API Endpoints:

**GET /api/scheduled-content**
- Returns all scheduled publish/archive events
- Filters: type, scheduleType, startDate, endDate, authorId
- RBAC: Admins see all, teachers see only their own
- Response: Array of ScheduledContentItem objects

**POST /api/programs**
- New fields: scheduledPublishAt, scheduledArchiveAt, autoPublishEnabled
- Validation ensures proper dates

**PATCH /api/programs/[id]**
- Can update scheduling fields
- Audit logging includes schedule changes

---

## Remaining Work

### 4. Frontend UI Components (NOT IMPLEMENTED YET)

The following components need to be created or updated:

#### A. DateTime Picker Component

Create: `components/ui/datetime-picker.tsx`

```typescript
/**
 * DateTimePicker component using HTML5 datetime-local input
 * Styled with shadcn/ui design system
 */
interface DateTimePickerProps {
  value: string | null;  // ISO timestamp
  onChange: (value: string | null) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  minDate?: string;  // ISO timestamp
  maxDate?: string;  // ISO timestamp
}
```

**Implementation Notes**:
- Use HTML5 `<input type="datetime-local">` for cross-browser support
- Convert between ISO 8601 (API) and datetime-local format (browser)
- Style with shadcn/ui patterns (see existing Input component)
- Add clear button to reset to null
- Show timezone information

**Helper Functions Needed**:
```typescript
// Convert ISO 8601 to datetime-local format (YYYY-MM-DDTHH:mm)
function isoToDateTimeLocal(iso: string | null): string;

// Convert datetime-local to ISO 8601
function dateTimeLocalToIso(local: string): string;
```

#### B. Update CreateProgramDialog

File: `app/admin/programs/_components/CreateProgramDialog.tsx`

**Changes Needed**:
1. Import DateTimePicker component
2. Add scheduling section after tags
3. Add form fields:
   - `scheduledPublishAt` (DateTimePicker)
   - `scheduledArchiveAt` (DateTimePicker)
   - `autoPublishEnabled` (Checkbox)
4. Add collapsible section for scheduling (optional)
5. Show validation errors for date conflicts

**UI Layout**:
```tsx
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label>Content Scheduling (Optional)</Label>
    <Badge variant="secondary">NEW</Badge>
  </div>

  <FormField name="autoPublishEnabled">
    <Checkbox label="Enable automatic publishing" />
    <FormDescription>
      Content will automatically publish/archive at scheduled times
    </FormDescription>
  </FormField>

  <FormField name="scheduledPublishAt">
    <DateTimePicker
      label="Schedule Publish Date"
      minDate={new Date().toISOString()}
    />
  </FormField>

  <FormField name="scheduledArchiveAt">
    <DateTimePicker
      label="Schedule Archive Date"
      minDate={form.watch('scheduledPublishAt') || new Date().toISOString()}
    />
  </FormField>
</div>
```

#### C. Update EditProgramDialog

File: `app/admin/programs/_components/EditProgramDialog.tsx`

**Changes Needed**:
- Same as CreateProgramDialog
- Pre-fill existing scheduling values
- Allow clearing scheduled dates (set to null)
- Show "Scheduled" badge if dates are set
- Warn if trying to set past dates

#### D. Update CreateLessonDialog

File: `app/admin/content/_components/CreateLessonDialog.tsx`

**Changes Needed**:
- Same pattern as CreateProgramDialog
- Add scheduling section
- Form field updates needed

#### E. Update EditLessonDialog

File: `app/admin/content/_components/EditLessonDialog.tsx`

**Changes Needed**:
- Same pattern as EditProgramDialog
- Pre-fill and allow editing scheduling fields

#### F. Scheduled Content Calendar Page

Create: `app/admin/scheduled-content/page.tsx`

**Features**:
- Calendar view of all scheduled events
- List view with filters
- Color-coded by type (publish=green, archive=orange)
- Filters:
  - Content type (programs/lessons)
  - Schedule type (publish/archive)
  - Date range
  - Author (for admins to filter by teacher)
- Click event to navigate to edit dialog
- "Overdue" badge for past schedules that haven't executed

**Calendar Library Options**:
1. **react-big-calendar** - Full-featured calendar component
2. **Custom Implementation** - Using shadcn/ui Calendar component + list view

**Recommended Approach** (Custom):
```tsx
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ScheduledContentPage() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [view, setView] = useState<'calendar' | 'list'>('list');

  // Fetch scheduled content
  const { items, isLoading } = useScheduledContent();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1>Scheduled Content</h1>
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScheduledContentFilters />

      {view === 'list' ? (
        <ScheduledContentTable items={items} />
      ) : (
        <ScheduledContentCalendar items={items} />
      )}
    </div>
  );
}
```

**Sub-Components Needed**:
- `ScheduledContentFilters` - Filter UI
- `ScheduledContentTable` - List view with sortable columns
- `ScheduledContentCalendar` - Calendar visualization
- `ScheduledContentItem` - Row/card component

#### G. Update Admin Sidebar

File: `components/admin/admin-sidebar.tsx`

**Changes Needed**:
1. Import Calendar icon from lucide-react
2. Add new nav item:

```tsx
import { Calendar } from 'lucide-react';

const navItems: NavItem[] = [
  // ... existing items
  {
    title: 'Scheduled Content',
    href: '/admin/scheduled-content',
    icon: Calendar,
    permission: 'canViewContent',  // Admins and teachers
  },
  // ... rest of items
];
```

### 5. Utility Hooks

Create: `lib/hooks/use-scheduled-content.ts`

```typescript
/**
 * Custom hook to fetch and filter scheduled content
 */
export function useScheduledContent(filters?: GetScheduledContentQuery) {
  const [items, setItems] = useState<ScheduledContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScheduledContent = async () => {
      try {
        const queryString = new URLSearchParams(filters as any).toString();
        const response = await fetchWithAuth(`/api/scheduled-content?${queryString}`);
        const data = await response.json();
        setItems(data.items);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduledContent();
  }, [filters]);

  return { items, isLoading, error, refetch: fetchScheduledContent };
}
```

---

## Cloud Function for Auto-Publishing (Future Implementation)

**Note**: This should be implemented as a Firebase Cloud Function, not in the Next.js app.

### Proposed Structure

Create: `functions/src/scheduled-publishing.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Cloud Function that runs every 5 minutes
 * Checks for programs/lessons with:
 * - auto_publish_enabled = true
 * - scheduled_publish_at <= now
 * - status = 'draft'
 *
 * Updates status to 'published'
 */
export const autoPublishContent = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = new Date();
    const db = admin.firestore();

    // Process programs
    const programsToPublish = await db.collection('programs')
      .where('auto_publish_enabled', '==', true)
      .where('status', '==', 'draft')
      .where('scheduled_publish_at', '<=', now.toISOString())
      .get();

    for (const doc of programsToPublish.docs) {
      await doc.ref.update({
        status: 'published',
        updated_at: now.toISOString(),
      });
      console.log(`Auto-published program: ${doc.id}`);
      // TODO: Send notification to author
    }

    // Process lessons (similar logic)
    const lessonsToPublish = await db.collection('lessons')
      .where('auto_publish_enabled', '==', true)
      .where('status', '==', 'draft')
      .where('scheduled_publish_at', '<=', now.toISOString())
      .get();

    for (const doc of lessonsToPublish.docs) {
      await doc.ref.update({
        status: 'ready',  // Lesson status
        updated_at: now.toISOString(),
      });
      console.log(`Auto-published lesson: ${doc.id}`);
    }

    // Process archives (similar logic)
    // ...

    return null;
  });
```

### Firestore Indexes Required

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "programs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "auto_publish_enabled", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduled_publish_at", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "programs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "auto_publish_enabled", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduled_archive_at", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "lessons",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "auto_publish_enabled", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduled_publish_at", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

---

## Testing Checklist

### Backend API Tests
- [ ] POST /api/programs with scheduling fields
- [ ] PATCH /api/programs/[id] to update scheduling
- [ ] GET /api/scheduled-content returns correct items
- [ ] Date validation (publish before archive)
- [ ] Future date validation
- [ ] RBAC: Teachers only see own content
- [ ] Clear scheduled dates (set to null)

### Frontend Tests
- [ ] CreateProgramDialog accepts scheduling inputs
- [ ] EditProgramDialog shows existing schedules
- [ ] DateTimePicker converts dates correctly
- [ ] Validation errors display properly
- [ ] Scheduled Content page loads
- [ ] Calendar view displays events
- [ ] Filters work correctly
- [ ] Navigation to edit from calendar

### Integration Tests
- [ ] Create program with scheduled publish date
- [ ] Edit scheduling on existing program
- [ ] View scheduled events in calendar
- [ ] Auto-publish cloud function (when implemented)

---

## Usage Guide

### For Admins/Teachers

#### Scheduling a Program to Publish

1. Navigate to Programs page
2. Click "Create Program" or edit existing
3. Fill in program details
4. Expand "Content Scheduling" section
5. Check "Enable automatic publishing"
6. Set "Schedule Publish Date" to future date/time
7. Optionally set "Schedule Archive Date"
8. Save program (status remains 'draft')
9. Program will auto-publish at scheduled time

#### Viewing Scheduled Content

1. Navigate to "Scheduled Content" in sidebar
2. See all upcoming publishes and archives
3. Filter by type, date range, or author
4. Click event to edit program/lesson

#### Manual Override

- Admins can manually publish/archive before scheduled date
- Scheduled dates remain for audit purposes
- Disable auto_publish_enabled to prevent auto-execution

---

## File Summary

### Created Files ✅
1. `types/scheduled-content.ts` - Calendar view types
2. `app/api/scheduled-content/route.ts` - Calendar API endpoint

### Modified Files ✅
3. `types/program.ts` - Added scheduling fields
4. `types/lesson.ts` - Added scheduling fields
5. `lib/validators/program.ts` - Added scheduling validation
6. `app/api/programs/route.ts` - POST with scheduling
7. `app/api/programs/[id]/route.ts` - PATCH with scheduling

### Files to Create/Modify (TODO)
8. `components/ui/datetime-picker.tsx` - NEW
9. `app/admin/programs/_components/CreateProgramDialog.tsx` - MODIFY
10. `app/admin/programs/_components/EditProgramDialog.tsx` - MODIFY
11. `app/admin/content/_components/CreateLessonDialog.tsx` - MODIFY
12. `app/admin/content/_components/EditLessonDialog.tsx` - MODIFY
13. `app/admin/scheduled-content/page.tsx` - NEW
14. `components/admin/admin-sidebar.tsx` - MODIFY
15. `lib/hooks/use-scheduled-content.ts` - NEW
16. `functions/src/scheduled-publishing.ts` - NEW (Cloud Function)

---

## Database Schema Changes

### Firestore Collections

**programs** collection - Add fields:
```
scheduled_publish_at: timestamp | null
scheduled_archive_at: timestamp | null
auto_publish_enabled: boolean
```

**lessons** collection - Add fields:
```
scheduled_publish_at: timestamp | null
scheduled_archive_at: timestamp | null
auto_publish_enabled: boolean
```

### Firestore Security Rules

Update `firestore.rules` to allow admin/teacher write access to scheduling fields:

```javascript
match /programs/{programId} {
  allow update: if request.auth != null
    && (hasRole('admin') ||
        (hasRole('teacher') && resource.data.author_id == request.auth.uid))
    && request.resource.data.keys().hasOnly([
      'title', 'description', 'category', 'difficulty',
      'duration_days', 'cover_image_url', 'status', 'tags',
      'scheduled_publish_at', 'scheduled_archive_at',
      'auto_publish_enabled', 'updated_at'
    ]);
}
```

---

## Next Steps

1. **Implement DateTimePicker component** - Core UI dependency
2. **Update Program Dialogs** - Add scheduling UI
3. **Update Lesson Dialogs** - Add scheduling UI
4. **Create Calendar Page** - Visualization
5. **Update Sidebar** - Add navigation
6. **Test End-to-End** - Full workflow
7. **Deploy Cloud Function** - Auto-publishing (optional for now)
8. **Add Notifications** - Email/in-app when content publishes

---

## Notes

- All scheduling fields are optional (null allowed)
- Admins can schedule all content, teachers only their own
- Audit logs capture scheduling changes
- UI should show clear indicators for scheduled content
- Consider adding "Preview Scheduled Content" feature
- Future: Recurring schedules for series

---

## Support

For questions or issues:
- Check existing programs/lessons API implementation
- Review audit logging pattern for consistency
- Follow shadcn/ui component patterns
- Use existing RBAC helpers for permissions

---

**Implementation Status**: Backend Complete (70%), Frontend Pending (30%)
**Estimated Remaining Effort**: 4-6 hours for frontend components
**Priority**: Medium (Issue #22)
