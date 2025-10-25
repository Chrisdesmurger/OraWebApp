## 📋 Feature Request: Program Lesson Management

### Summary
Implement a comprehensive lesson management interface that allows admins and teachers to add, reorder, and remove lessons within programs. This feature will replace the current "Coming soon" toast with a fully functional lesson management dialog.

---

## 🎯 Objectives

1. Allow users to **add lessons** to a program from the available lesson library
2. Allow users to **reorder lessons** via drag-and-drop
3. Allow users to **remove lessons** from a program
4. Provide **real-time updates** with optimistic UI
5. Enforce **RBAC** (admins manage all, teachers manage their own)

---

## 🏗️ Technical Specification

### Phase 1: Backend Enhancement
**Goal**: Ensure the API route `/api/programs/[id]/lessons` is fully functional

**Tasks**:
- ✅ Verify `POST /api/programs/[id]/lessons` endpoint exists
- ✅ Ensure it validates lesson IDs exist in Firestore
- ✅ Ensure it updates `lessons` array in program document
- ✅ Add proper error handling and RBAC checks

**Acceptance Criteria**:
- Endpoint accepts `{ lessons: string[] }` body
- Returns updated program with `{ lessons: string[] }`
- Validates all lesson IDs exist before updating
- Teachers can only update their own programs
- Admins can update any program

---

### Phase 2: UI Components
**Goal**: Create/update UI components for lesson management

#### 2.1. Update LessonPickerDialog
**File**: `app/admin/programs/_components/LessonPickerDialog.tsx`

**Current State**: Displays lessons with multi-select checkboxes

**Enhancements**:
- Add **"Add to Program"** button that calls API to update program
- Show **currently selected lessons** from the program
- Display **lesson count** in header
- Add **search/filter** for lessons
- Add **category filter** (meditation, yoga, etc.)

**Props**:
```typescript
interface LessonPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: Program;
  currentLessons: string[]; // Current lesson IDs in program
  onSuccess: () => void; // Refresh program list
}
```

#### 2.2. Update DraggableLessonList
**File**: `app/admin/programs/_components/DraggableLessonList.tsx`

**Current State**: Shows draggable list of lessons

**Enhancements**:
- Add **"Remove" button** for each lesson
- Add **"Save Order"** button to persist changes
- Add **loading state** during API calls
- Add **empty state** when no lessons
- Show **lesson details** (title, duration, category)

**Props**:
```typescript
interface DraggableLessonListProps {
  program: Program;
  lessons: Lesson[]; // Populated lesson details
  onReorder: (newOrder: Lesson[]) => Promise<void>;
  onRemove: (lessonId: string) => Promise<void>;
}
```

#### 2.3. Create ManageLessonsDialog
**File**: `app/admin/programs/_components/ManageLessonsDialog.tsx` (NEW)

**Purpose**: Main dialog container for lesson management

**Features**:
- **Two tabs**: "Current Lessons" and "Add Lessons"
- **Current Lessons tab**: Shows `DraggableLessonList` with reorder/remove
- **Add Lessons tab**: Shows `LessonPickerDialog` to add new lessons
- **Real-time sync**: Fetches program details with populated lessons
- **Optimistic UI**: Updates local state immediately, reverts on error

**Layout**:
```tsx
<Dialog>
  <DialogHeader>
    <DialogTitle>Manage Lessons - {program.title}</DialogTitle>
    <DialogDescription>
      {program.lessons.length} lessons · {program.durationDays} days
    </DialogDescription>
  </DialogHeader>

  <Tabs defaultValue="current">
    <TabsList>
      <TabsTrigger value="current">
        Current Lessons ({program.lessons.length})
      </TabsTrigger>
      <TabsTrigger value="add">
        Add Lessons
      </TabsTrigger>
    </TabsList>

    <TabsContent value="current">
      <DraggableLessonList ... />
    </TabsContent>

    <TabsContent value="add">
      <LessonPickerDialog ... />
    </TabsContent>
  </Tabs>
</Dialog>
```

---

### Phase 3: Integration
**Goal**: Integrate lesson management into programs page

#### 3.1. Update Programs Page
**File**: `app/admin/programs/page.tsx`

**Changes**:
- Replace `handleManageLessons` toast with dialog opening
- Add `ManageLessonsDialog` component with state management
- Fetch program details with populated lessons when dialog opens
- Refresh program list after successful updates

**State**:
```typescript
const [managingProgram, setManagingProgram] = useState<Program | null>(null);
const [manageLessonsOpen, setManageLessonsOpen] = useState(false);
const [lessonDetails, setLessonDetails] = useState<Lesson[]>([]);
```

**Flow**:
1. User clicks "Manage Lessons" on a program
2. Fetch `GET /api/programs/[id]` to get program + populated lessons
3. Open `ManageLessonsDialog` with program and lessons
4. User adds/removes/reorders lessons
5. Call `POST /api/programs/[id]/lessons` with new order
6. Update local state optimistically
7. Show success toast and refresh program list

---

### Phase 4: Testing & Polish
**Goal**: Ensure reliability and good UX

**Tasks**:
- [ ] Manual QA: Add lessons to program
- [ ] Manual QA: Remove lessons from program
- [ ] Manual QA: Reorder lessons via drag-and-drop
- [ ] Manual QA: Verify RBAC (teacher vs admin)
- [ ] Manual QA: Test with empty program (0 lessons)
- [ ] Manual QA: Test with large program (50+ lessons)
- [ ] Add loading states and skeletons
- [ ] Add error handling with toast notifications
- [ ] Add optimistic UI updates
- [ ] Update README with lesson management docs

---

## 📊 Data Model

### Program Document (Firestore)
```typescript
{
  id: string;
  title: string;
  // ... other fields
  lessons: string[];  // Array of lesson IDs in order
}
```

### Lesson Document (Firestore)
```typescript
{
  id: string;
  title: string;
  description: string;
  duration: number;  // in minutes
  category: string;  // meditation, yoga, etc.
  type: string;      // video, audio, article
  mediaUrl: string;
  // ... other fields
}
```

### API Request/Response

**POST /api/programs/[id]/lessons**
```typescript
// Request
{
  lessons: ["lesson-1", "lesson-2", "lesson-3"]
}

// Response
{
  lessons: ["lesson-1", "lesson-2", "lesson-3"]
}
```

**GET /api/programs/[id]**
```typescript
// Response
{
  program: { ... },
  lessonDetails: [
    { id: "lesson-1", title: "Intro to Meditation", ... },
    { id: "lesson-2", title: "Breathing Exercises", ... },
    ...
  ]
}
```

---

## 🎨 UI Mockup

### Manage Lessons Dialog

```
┌─────────────────────────────────────────────┐
│ Manage Lessons - 7-Day Meditation Starter  │
│ 5 lessons · 7 days                          │
├─────────────────────────────────────────────┤
│ [Current Lessons] [Add Lessons]             │
├─────────────────────────────────────────────┤
│                                             │
│ Current Lessons Tab:                        │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ ☰ 1. Intro to Meditation (10 min)  │   │
│ │                              [Remove]│   │
│ ├─────────────────────────────────────┤   │
│ │ ☰ 2. Breathing Basics (15 min)     │   │
│ │                              [Remove]│   │
│ ├─────────────────────────────────────┤   │
│ │ ☰ 3. Body Scan (20 min)            │   │
│ │                              [Remove]│   │
│ └─────────────────────────────────────┘   │
│                                             │
│           [Cancel]  [Save Order]            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Manage Lessons - 7-Day Meditation Starter  │
│ 5 lessons · 7 days                          │
├─────────────────────────────────────────────┤
│ [Current Lessons] [Add Lessons]             │
├─────────────────────────────────────────────┤
│                                             │
│ Add Lessons Tab:                            │
│                                             │
│ Search: [___________________] 🔍           │
│ Category: [All ▼]                          │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ ☐ Advanced Meditation (25 min)     │   │
│ │ ☑ Mindful Walking (30 min)         │   │
│ │ ☐ Sleep Meditation (20 min)        │   │
│ └─────────────────────────────────────┘   │
│                                             │
│      [Cancel]  [Add Selected (1)]           │
└─────────────────────────────────────────────┘
```

---

## 🔒 RBAC & Permissions

| Action | Admin | Teacher (Own) | Teacher (Other) | Viewer |
|--------|-------|---------------|-----------------|--------|
| View program lessons | ✅ | ✅ | ✅ | ❌ |
| Add lessons to program | ✅ | ✅ | ❌ | ❌ |
| Remove lessons from program | ✅ | ✅ | ❌ | ❌ |
| Reorder lessons | ✅ | ✅ | ❌ | ❌ |

---

## 📝 Implementation Checklist

### Phase 1: Backend
- [ ] Verify `POST /api/programs/[id]/lessons` works
- [ ] Add lesson ID validation
- [ ] Add RBAC checks
- [ ] Add error handling

### Phase 2: UI Components
- [ ] Update `LessonPickerDialog` with add functionality
- [ ] Update `DraggableLessonList` with remove/save
- [ ] Create `ManageLessonsDialog` with tabs

### Phase 3: Integration
- [ ] Update `handleManageLessons` in programs page
- [ ] Add state management for dialog
- [ ] Fetch program details with lessons
- [ ] Implement optimistic UI updates

### Phase 4: Testing & Documentation
- [ ] Manual QA all flows
- [ ] Add JSDoc comments
- [ ] Update README
- [ ] Deploy Firestore rules if needed

---

## 🚀 Success Criteria

- ✅ Users can open lesson management dialog from programs table
- ✅ Users can see current lessons in a program
- ✅ Users can add lessons from lesson library
- ✅ Users can remove lessons from a program
- ✅ Users can reorder lessons via drag-and-drop
- ✅ Changes persist to Firestore
- ✅ RBAC enforced (teachers only manage own programs)
- ✅ Optimistic UI with proper error handling
- ✅ Toast notifications for all actions
- ✅ No console errors or warnings

---

## 📚 Related

- Issue #6 - Program CRUD Implementation
- PR #7 - Program CRUD with Lessons Management (structure)

---

**Labels**: `enhancement`, `feature`, `programs`, `ui`, `backend`

**Priority**: High

🤖 Generated with [Claude Code](https://claude.com/claude-code)
