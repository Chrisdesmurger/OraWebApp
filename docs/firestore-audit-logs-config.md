# Firestore Configuration for Audit Logs

## Security Rules

Add these rules to your `firestore.rules` file:

```javascript
// Firestore Security Rules for audit_logs collection

match /audit_logs/{logId} {
  // Only admins can read audit logs
  allow read: if request.auth != null
              && request.auth.token.role == 'admin';

  // Only backend (Firebase Admin SDK) can write audit logs
  // Client writes are blocked - this prevents tampering
  allow write: if false;

  // Note: Server-side writes using Firebase Admin SDK bypass these rules
}
```

### Explanation

- **Read Access**: Only authenticated users with `admin` role can read audit logs
- **Write Access**: Blocked for all clients (logs are written server-side only)
- **Server Writes**: Firebase Admin SDK (used in API routes) bypasses rules

---

## Firestore Indexes

### Required Composite Indexes

Add these indexes to `firestore.indexes.json` or create them in the Firebase Console:

```json
{
  "indexes": [
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "resource_type", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "action", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actor_id", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "resource_id", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "resource_type", "order": "ASCENDING" },
        { "fieldPath": "action", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### Why These Indexes?

1. **resource_type + timestamp**: Filter by resource (user/program/lesson) with time sorting
2. **action + timestamp**: Filter by action type (create/update/delete) with time sorting
3. **actor_id + timestamp**: View all actions by a specific admin/teacher
4. **resource_id + timestamp**: View all changes to a specific resource
5. **resource_type + action + timestamp**: Combined filter (e.g., "all program updates")

---

## Creating Indexes via Firebase Console

### Method 1: Automatic (Recommended)

1. Make your first filtered query in the app (e.g., filter by "Program" resource type)
2. Check browser console for Firebase error with index creation link
3. Click the link → Firebase Console opens → Click "Create Index"
4. Repeat for each filter combination you want to use

### Method 2: Manual

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Indexes** tab
4. Click **Add Index**
5. Fill in:
   - **Collection ID**: `audit_logs`
   - **Fields**:
     - Field 1: `resource_type` (Ascending)
     - Field 2: `timestamp` (Descending)
   - **Query scope**: Collection
6. Click **Create**
7. Repeat for other index combinations

---

## Collection Structure

```
firestore/
  audit_logs/           # Collection (created automatically)
    {auto-id-1}/        # Document (auto-generated ID)
      action: "create"
      resource_type: "program"
      resource_id: "prog-abc123"
      actor_id: "user-xyz789"
      actor_email: "admin@ora.com"
      changes: { ... }
      ip_address: "192.168.1.1"
      user_agent: "Mozilla/5.0..."
      timestamp: "2025-10-29T12:34:56.789Z"

    {auto-id-2}/
      action: "update"
      resource_type: "lesson"
      ...
```

---

## Data Retention Policy (Optional)

If you want to automatically delete old audit logs:

### Option 1: Firestore TTL (Time-To-Live)

```javascript
// Set TTL when creating audit log (example: 90 days retention)
await firestore.collection('audit_logs').add({
  ...auditLogData,
  expireAt: admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  )
});

// Then create a TTL policy in Firestore settings
```

### Option 2: Cloud Function (Scheduled)

```typescript
// functions/src/cleanupAuditLogs.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const cleanupOldAuditLogs = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const firestore = admin.firestore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

    const snapshot = await firestore
      .collection('audit_logs')
      .where('timestamp', '<', cutoffDate.toISOString())
      .limit(500) // Batch size
      .get();

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    console.log(`Deleted ${snapshot.size} old audit logs`);
    return null;
  });
```

---

## Backup Strategy (Recommended)

### Option 1: Firebase Scheduled Backup

1. Go to Firebase Console → **Firestore** → **Backups**
2. Create scheduled backup (e.g., daily)
3. Set retention period (e.g., 30 days)

### Option 2: Export to BigQuery

```bash
# Enable BigQuery export for audit_logs collection
gcloud firestore databases export gs://[BUCKET_NAME] \
  --collection-ids='audit_logs' \
  --project=[PROJECT_ID]
```

### Option 3: Cloud Function Export

```typescript
// Export audit logs to Cloud Storage monthly
export const exportAuditLogs = functions.pubsub
  .schedule('0 0 1 * *') // 1st of each month
  .onRun(async (context) => {
    const firestore = admin.firestore();
    const storage = admin.storage();

    const snapshot = await firestore.collection('audit_logs').get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
    const file = storage.bucket().file(`backups/${filename}`);

    await file.save(JSON.stringify(logs, null, 2), {
      contentType: 'application/json',
    });

    console.log(`Exported ${logs.length} audit logs to ${filename}`);
    return null;
  });
```

---

## Performance Optimization

### Tips for Large Datasets

1. **Pagination**: Always use `limit()` and `startAfter()` for queries
   ```typescript
   const query = firestore
     .collection('audit_logs')
     .orderBy('timestamp', 'desc')
     .limit(50);
   ```

2. **Index Coverage**: Ensure all filter combinations have indexes
   - Firebase will return an error with a link to create missing indexes

3. **Query Limits**:
   - Max documents per query: Unlimited (but use pagination)
   - Max documents per write batch: 500
   - Max composite indexes per query: 200

4. **Caching**: Consider caching recent logs client-side
   ```typescript
   // Cache last 100 logs for 5 minutes
   const cachedLogs = useMemo(() => logs, [logs]);
   ```

---

## Monitoring & Alerts

### Cloud Monitoring Metrics

Monitor these metrics in Firebase Console:

- **Reads per day**: Should match expected admin activity
- **Writes per day**: Should match CRUD operations count
- **Document count**: Should grow linearly with activity

### Alert Examples

```javascript
// Set up alerts for unusual activity
if (logsPerDay > expectedAverage * 3) {
  sendAlert('Unusual audit log activity detected');
}

if (failedWrites > 10) {
  sendAlert('Audit log writes failing');
}
```

---

## Testing

### Test Security Rules

```typescript
// test/firestore-rules.spec.ts
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

test('Admin can read audit logs', async () => {
  const db = getFirestore({ uid: 'admin-uid', role: 'admin' });
  await assertSucceeds(db.collection('audit_logs').get());
});

test('Non-admin cannot read audit logs', async () => {
  const db = getFirestore({ uid: 'teacher-uid', role: 'teacher' });
  await assertFails(db.collection('audit_logs').get());
});

test('Client cannot write audit logs', async () => {
  const db = getFirestore({ uid: 'admin-uid', role: 'admin' });
  await assertFails(
    db.collection('audit_logs').add({ action: 'create' })
  );
});
```

---

## Migration

If you need to backfill audit logs for existing data:

```typescript
// scripts/backfill-audit-logs.ts
import * as admin from 'firebase-admin';

async function backfillProgramAuditLogs() {
  const firestore = admin.firestore();
  const programs = await firestore.collection('programs').get();

  for (const program of programs.docs) {
    const data = program.data();

    // Create audit log for creation event
    await firestore.collection('audit_logs').add({
      action: 'create',
      resource_type: 'program',
      resource_id: program.id,
      actor_id: data.author_id,
      actor_email: 'system@ora.com', // Use system for backfill
      changes: { created: data },
      ip_address: '127.0.0.1',
      user_agent: 'Backfill Script',
      timestamp: data.created_at || new Date().toISOString(),
    });
  }

  console.log(`Backfilled ${programs.size} program audit logs`);
}

backfillProgramAuditLogs();
```

---

## Troubleshooting

### Issue: "Missing index" error

**Solution**: Click the link in the error message to create the index automatically

### Issue: Slow queries

**Solution**:
1. Check if composite index exists for your filter combination
2. Reduce `limit` parameter
3. Use pagination

### Issue: Writes failing silently

**Solution**:
1. Check Firebase Admin SDK is initialized correctly
2. Verify service account has Firestore write permissions
3. Check quota limits in Firebase Console

### Issue: Logs not appearing

**Solution**:
1. Verify logger function is called (check console logs)
2. Ensure `request` object is passed correctly
3. Check Firestore console for error logs
4. Verify Firebase Admin SDK credentials

---

## Quick Reference

```bash
# View indexes
firebase firestore:indexes

# Create index from JSON
firebase deploy --only firestore:indexes

# View security rules
cat firestore.rules

# Deploy security rules
firebase deploy --only firestore:rules

# Check quota usage
firebase projects:get [PROJECT_ID]
```

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
