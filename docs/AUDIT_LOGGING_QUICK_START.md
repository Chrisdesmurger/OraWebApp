# Audit Logging Quick Start Guide

> Quick reference for developers working with the audit logging system

## TL;DR

**Every** create, update, delete, role change, or status change in the admin portal is **automatically logged** with who did it, what changed, and when.

---

## How to Log an Action

### 1. Import the Logger

```typescript
import { logCreate, logUpdate, logDelete, logRoleChange, logStatusChange } from '@/lib/audit/logger';
```

### 2. Use in Your API Route

#### Create
```typescript
export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);

  // Create resource
  const newDoc = await firestore.collection('programs').add(data);

  // Log it (fire-and-forget)
  logCreate({
    resourceType: 'program',
    resourceId: newDoc.id,
    actorId: user.uid,
    actorEmail: user.email || 'unknown',
    resource: data,
    request,
  });

  return apiSuccess({ id: newDoc.id });
}
```

#### Update
```typescript
export async function PATCH(request: NextRequest) {
  const user = await authenticateRequest(request);

  // IMPORTANT: Capture before state
  const before = (await docRef.get()).data();

  // Update resource
  await docRef.update(updates);

  // IMPORTANT: Capture after state
  const after = (await docRef.get()).data();

  // Log it
  logUpdate({
    resourceType: 'program',
    resourceId: docId,
    actorId: user.uid,
    actorEmail: user.email || 'unknown',
    before,
    after,
    request,
  });

  return apiSuccess({ updated: true });
}
```

#### Delete
```typescript
export async function DELETE(request: NextRequest) {
  const user = await authenticateRequest(request);

  // IMPORTANT: Capture before deletion
  const resource = (await docRef.get()).data();

  // Delete resource
  await docRef.delete();

  // Log it
  logDelete({
    resourceType: 'lesson',
    resourceId: docId,
    actorId: user.uid,
    actorEmail: user.email || 'unknown',
    resource,
    request,
  });

  return apiSuccess({ deleted: true });
}
```

#### Role Change
```typescript
// Special case for user role changes
logRoleChange({
  resourceId: targetUserId,
  actorId: user.uid,
  actorEmail: user.email || 'unknown',
  before: { role: 'viewer' },
  after: { role: 'admin' },
  request,
});
```

#### Status Change
```typescript
// Special case for status changes (programs/lessons)
logStatusChange({
  resourceType: 'program',
  resourceId: programId,
  actorId: user.uid,
  actorEmail: user.email || 'unknown',
  before: { status: 'draft' },
  after: { status: 'published' },
  request,
});
```

---

## Important Notes

### ✅ DO
- **Always** pass the `request` object (needed for IP/user-agent)
- **Capture** before state BEFORE modifying
- **Capture** after state AFTER modifying
- **Use** fire-and-forget (don't `await` - it's async but won't block)
- **Include** full email (`user.email || 'unknown'`)

### ❌ DON'T
- Don't log sensitive data (passwords, tokens, API keys)
- Don't await the log functions (they're fire-and-forget)
- Don't skip logging (every action should be logged)
- Don't forget to capture before/after states for updates

---

## What Gets Logged?

### Automatic
- **Who**: Actor ID, actor email
- **When**: ISO timestamp
- **Where**: IP address, user-agent
- **What**: Action type, resource type, resource ID

### You Provide
- **Changes**: Before/after states for updates, full object for create/delete

---

## Viewing Logs

### Admin Portal
1. Navigate to `/admin/audit-logs`
2. Filter by resource, action, date range, etc.
3. Click "Details" to see before/after diff

### Firestore Console
Collection: `audit_logs`

```
Document ID: auto-generated
{
  action: "update",
  resource_type: "program",
  resource_id: "prog-abc123",
  actor_id: "user-xyz789",
  actor_email: "admin@ora.com",
  changes: {
    title: {
      before: "Old Title",
      after: "New Title"
    },
    status: {
      before: "draft",
      after: "published"
    }
  },
  ip_address: "192.168.1.1",
  user_agent: "Mozilla/5.0...",
  timestamp: "2025-10-29T12:34:56.789Z"
}
```

---

## Common Patterns

### Pattern 1: Simple Create
```typescript
const docRef = firestore.collection('programs').doc();
await docRef.set(data);

logCreate({
  resourceType: 'program',
  resourceId: docRef.id,
  actorId: user.uid,
  actorEmail: user.email || 'unknown',
  resource: data,
  request,
});
```

### Pattern 2: Update with Conditional Status Change
```typescript
const before = (await docRef.get()).data();
await docRef.update(updates);
const after = (await docRef.get()).data();

// Check if status changed
if (updates.status && updates.status !== before.status) {
  logStatusChange({ /* ... */ });
} else {
  logUpdate({ /* ... */ });
}
```

### Pattern 3: Delete with Cleanup
```typescript
const resource = (await docRef.get()).data();

// Delete main resource
await docRef.delete();

// Delete related resources (e.g., media files)
await deleteRelatedResources(docRef.id);

// Log the main deletion
logDelete({
  resourceType: 'lesson',
  resourceId: docRef.id,
  actorId: user.uid,
  actorEmail: user.email || 'unknown',
  resource, // Includes reference to deleted files
  request,
});
```

---

## Troubleshooting

### No Logs Appearing?
1. Check if logger function is imported
2. Verify `request` object is passed correctly
3. Check Firestore console for errors
4. Ensure user is authenticated

### Logs Missing Fields?
- **IP**: Check if behind proxy (x-forwarded-for header)
- **Email**: Fallback to 'unknown' if not available
- **Changes**: Ensure before/after states are captured

### Performance Issues?
- Audit logging is fire-and-forget (shouldn't block)
- If experiencing issues, check Firestore quotas
- Consider batch writes for bulk operations

---

## Example: Complete API Route

```typescript
import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';
import { logCreate, logUpdate, logDelete } from '@/lib/audit/logger';

// CREATE
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const firestore = getFirestore();
    const docRef = firestore.collection('resources').doc();

    const data = {
      ...body,
      author_id: user.uid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await docRef.set(data);

    // Log audit event
    logCreate({
      resourceType: 'program',
      resourceId: docRef.id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource: data,
      request,
    });

    return apiSuccess({ id: docRef.id }, 201);
  } catch (error: any) {
    console.error('POST error:', error);
    return apiError(error.message || 'Failed to create resource', 500);
  }
}

// UPDATE
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const { id } = await params;
    const body = await request.json();
    const firestore = getFirestore();
    const docRef = firestore.collection('resources').doc(id);

    // Capture before state
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      return apiError('Resource not found', 404);
    }
    const beforeState = docSnapshot.data();

    // Update resource
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    };
    await docRef.update(updateData);

    // Capture after state
    const afterState = (await docRef.get()).data();

    // Log audit event
    logUpdate({
      resourceType: 'program',
      resourceId: id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      before: beforeState,
      after: afterState,
      request,
    });

    return apiSuccess({ updated: true });
  } catch (error: any) {
    console.error('PATCH error:', error);
    return apiError(error.message || 'Failed to update resource', 500);
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    if (!requireRole(user, ['admin'])) {
      return apiError('Only admins can delete resources', 403);
    }

    const { id } = await params;
    const firestore = getFirestore();
    const docRef = firestore.collection('resources').doc(id);

    // Capture before deletion
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      return apiError('Resource not found', 404);
    }
    const resource = docSnapshot.data();

    // Delete resource
    await docRef.delete();

    // Log audit event
    logDelete({
      resourceType: 'program',
      resourceId: id,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      resource,
      request,
    });

    return apiSuccess({ deleted: true });
  } catch (error: any) {
    console.error('DELETE error:', error);
    return apiError(error.message || 'Failed to delete resource', 500);
  }
}
```

---

## Need Help?

- **Full Documentation**: See `AUDIT_LOGGING_IMPLEMENTATION.md`
- **Type Definitions**: See `types/audit.ts`
- **Examples**: Check `app/api/programs/[id]/route.ts`
- **UI Components**: See `app/admin/audit-logs/`

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
