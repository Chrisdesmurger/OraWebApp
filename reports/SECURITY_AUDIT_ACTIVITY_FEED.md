# Security Audit Report: Recent Activity Feed Feature

**Feature**: Recent Activity Feed (Feature #19)
**Audit Date**: 2025-10-27
**Auditor**: Security Auditor Agent
**Status**: ⚠️ CONDITIONAL APPROVAL (with recommendations)

---

## Executive Summary

**Overall Security Score: 72/100**

The Recent Activity Feed feature implements basic authentication and authorization controls but has several medium-severity security concerns that should be addressed before production deployment. The feature is functional and reasonably secure for internal admin use, but requires improvements for production-grade security.

### Key Findings
- ✅ **PASSED**: Authentication implementation
- ✅ **PASSED**: Basic RBAC authorization
- ⚠️ **WARNING**: Missing input validation on POST endpoint
- ⚠️ **WARNING**: No rate limiting (DoS vulnerability)
- ⚠️ **WARNING**: Potential for log injection attacks
- ⚠️ **WARNING**: Missing Firestore security rules for activities collection
- ⚠️ **WARNING**: Excessive logging of sensitive data
- ✅ **PASSED**: No SQL/NoSQL injection vulnerabilities detected
- ✅ **PASSED**: XSS protection via React's automatic escaping

---

## Detailed Security Analysis

### 1. Authentication ✅ PASS
**Score: 10/10**

**Implementation:**
```typescript
// app/api/activity/route.ts
const user = await authenticateRequest(request);
```

**Analysis:**
- ✅ Uses `authenticateRequest()` middleware for token verification
- ✅ Firebase ID token properly validated
- ✅ All endpoints protected (GET and POST)
- ✅ Client-side uses `fetchWithAuth()` for automatic token inclusion

**Recommendation:** No changes needed. Authentication is properly implemented.

---

### 2. Authorization ⚠️ WARNING
**Score: 7/10**

**Implementation:**
```typescript
// GET /api/activity
if (!requireRole(user, ['admin', 'teacher'])) {
  return apiError('Insufficient permissions', 403);
}

// POST /api/activity
if (!requireRole(user, ['admin', 'teacher'])) {
  return apiError('Insufficient permissions', 403);
}
```

**Issues Identified:**

#### Medium Severity: Insufficient Granular Authorization
- **Issue**: Teachers can view ALL activities, including those from admins and other teachers
- **Risk**: Teachers can see sensitive admin actions (user deletions, role changes, etc.)
- **Impact**: Information disclosure, privacy violation

**Current Permission Model:**
```
admin → View/Create ALL activities ✅
teacher → View/Create ALL activities ⚠️ (Too permissive)
viewer → No access ✅
```

**Recommended Permission Model:**
```
admin → View/Create ALL activities ✅
teacher → View/Create ONLY OWN activities ✅
viewer → No access ✅
```

#### Medium Severity: No Resource-Level Authorization
- **Issue**: POST endpoint doesn't verify if the actor creating the activity matches the authenticated user
- **Risk**: Teachers could impersonate other users by setting arbitrary `actorId`, `actorName`, `actorEmail`
- **Impact**: Spoofing, audit trail tampering

**Vulnerable Code:**
```typescript
// POST /api/activity - Lines 79-90
const {
  actorId,      // ⚠️ User-controlled
  actorName,    // ⚠️ User-controlled
  actorEmail,   // ⚠️ User-controlled
  // ...
} = body;

// Lines 102-104 - Fallback to authenticated user, but user input takes precedence!
actor_id: actorId || user.uid,
actor_name: actorName || user.name || user.email?.split('@')[0] || 'Unknown',
actor_email: actorEmail || user.email || '',
```

**Recommendation:**
```typescript
// SECURE: Always use authenticated user's info
actor_id: user.uid,  // Never trust client input
actor_name: user.name || user.email?.split('@')[0] || 'Unknown',
actor_email: user.email || '',
```

---

### 3. Input Validation ⚠️ CRITICAL
**Score: 4/10**

**Issues Identified:**

#### High Severity: Insufficient Input Validation
**Vulnerable Code:**
```typescript
// POST /api/activity - Lines 92-94
if (!type || !category || !description) {
  return apiError('Type, category, and description are required', 400);
}
```

**Missing Validations:**

1. **Type Safety** - No validation that `type` is a valid `ActivityType`
   ```typescript
   // ❌ Current: Accepts ANY string
   type: "malicious_type_injected"

   // ✅ Should validate against enum
   const validTypes: ActivityType[] = [
     'user_created', 'user_updated', 'user_deleted',
     'program_created', 'program_updated', 'program_deleted',
     // ...
   ];
   if (!validTypes.includes(type as ActivityType)) {
     return apiError('Invalid activity type', 400);
   }
   ```

2. **Category Safety** - No validation against enum
   ```typescript
   const validCategories: ActivityCategory[] = ['user', 'program', 'lesson', 'content', 'auth'];
   ```

3. **String Length Validation** - No maximum length checks
   - **Risk**: Database bloat, DoS via large payloads
   - **Example Attack**:
     ```typescript
     description: "A".repeat(1000000) // 1MB string
     ```

4. **Resource Type Validation** - No validation when provided
   ```typescript
   resourceType: "../../etc/passwd" // Path traversal attempt
   ```

5. **Metadata Injection** - No validation or sanitization of `metadata` object
   - **Risk**: NoSQL injection, prototype pollution
   - **Example Attack**:
     ```typescript
     metadata: {
       "__proto__": { "isAdmin": true }
     }
     ```

**Recommendation:**
```typescript
// Comprehensive input validation
function validateActivityInput(body: any): { valid: boolean; error?: string } {
  const validTypes = ['user_created', 'user_updated', /* ... */];
  const validCategories = ['user', 'program', 'lesson', 'content', 'auth'];
  const validResourceTypes = ['user', 'program', 'lesson', 'content'];

  if (!validTypes.includes(body.type)) {
    return { valid: false, error: 'Invalid activity type' };
  }

  if (!validCategories.includes(body.category)) {
    return { valid: false, error: 'Invalid category' };
  }

  if (typeof body.description !== 'string' || body.description.length > 500) {
    return { valid: false, error: 'Description must be a string (max 500 chars)' };
  }

  if (body.resourceType && !validResourceTypes.includes(body.resourceType)) {
    return { valid: false, error: 'Invalid resource type' };
  }

  if (body.resourceTitle && body.resourceTitle.length > 200) {
    return { valid: false, error: 'Resource title too long' };
  }

  if (body.metadata && typeof body.metadata !== 'object') {
    return { valid: false, error: 'Metadata must be an object' };
  }

  return { valid: true };
}
```

---

### 4. SQL/NoSQL Injection Protection ✅ PASS
**Score: 10/10**

**Analysis:**
```typescript
// GET /api/activity
activitiesSnapshot = await firestore
  .collection('activities')
  .orderBy('created_at', 'desc')
  .limit(50)
  .get();
```

**Security Assessment:**
- ✅ Uses Firebase Admin SDK (parameterized queries)
- ✅ No string concatenation for queries
- ✅ `.limit(50)` prevents resource exhaustion
- ✅ No user input directly in query parameters

**Recommendation:** No changes needed.

---

### 5. XSS Protection ✅ PASS
**Score: 9/10**

**Implementation:**
```typescript
// RecentActivityFeed.tsx
<span className="font-medium">{activity.actorName}</span>
<span className="font-medium">{activity.resourceTitle}</span>
<p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
```

**Security Assessment:**
- ✅ React automatically escapes JSX content
- ✅ No `dangerouslySetInnerHTML` usage
- ✅ No `innerHTML` manipulation
- ✅ User-generated content properly escaped

**Minor Issue:**
- Activity descriptions stored as plain text (no sanitization on storage)
- While React escapes on render, stored XSS payloads could be problematic if data is exported/used elsewhere

**Recommendation:**
```typescript
// Optional: Sanitize on input (defense in depth)
import DOMPurify from 'isomorphic-dompurify';

description: DOMPurify.sanitize(description, { ALLOWED_TAGS: [] }),
```

---

### 6. CSRF Protection ✅ PASS
**Score: 10/10**

**Analysis:**
- ✅ Uses Firebase ID tokens (short-lived, cryptographically signed)
- ✅ Tokens bound to user session
- ✅ No cookie-based authentication
- ✅ Same-origin policy enforced

**Recommendation:** No changes needed. Token-based auth inherently CSRF-resistant.

---

### 7. Rate Limiting ⚠️ CRITICAL
**Score: 0/10**

**Issues Identified:**

#### High Severity: No Rate Limiting
- **Risk**: Denial of Service (DoS) attack
- **Attack Scenario**:
  ```javascript
  // Attacker floods activity logs
  for (let i = 0; i < 10000; i++) {
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer <valid_token>' },
      body: JSON.stringify({
        type: 'user_login',
        category: 'auth',
        description: 'Spam attack ' + i
      })
    });
  }
  ```
- **Impact**:
  - Database bloat (Firestore write costs)
  - Performance degradation
  - Log pollution (obscures legitimate activity)
  - Cost escalation ($$$)

**Recommendation:**
Implement rate limiting middleware:

```typescript
// lib/api/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  analytics: true,
});

export async function checkRateLimit(userId: string): Promise<boolean> {
  const { success } = await ratelimit.limit(`activity_${userId}`);
  return success;
}

// In route.ts
const rateLimitOk = await checkRateLimit(user.uid);
if (!rateLimitOk) {
  return apiError('Rate limit exceeded', 429);
}
```

---

### 8. Sensitive Data Exposure ⚠️ WARNING
**Score: 6/10**

**Issues Identified:**

#### Medium Severity: Excessive Logging
**Vulnerable Code:**
```typescript
// Lines 23, 34, 44, 50, 55 in route.ts
console.log('[GET /api/activity] Fetching activities from Firestore...');
console.log('[GET /api/activity] Found', activitiesSnapshot.size, 'activities');
console.log('[GET /api/activity] Activity doc:', doc.id, 'has fields:', Object.keys(data));
console.log('[GET /api/activity] Returning', activities.length, 'activities');
```

**Risk:**
- Console logs may contain sensitive information
- Logs persisted in cloud logging (CloudWatch, Stackdriver)
- Potential data leakage if logging system compromised

**Sensitive Data in Activities:**
- `actorEmail` - PII (email addresses)
- `metadata` - Arbitrary data (could contain passwords, tokens, etc.)

#### Medium Severity: Email Exposure
**Current Implementation:**
```typescript
// Activities expose actor email addresses
actor_email: actorEmail || user.email || '',
```

**Risk:**
- Email addresses are PII
- Could be used for phishing/social engineering
- GDPR/privacy concerns

**Recommendation:**
```typescript
// Option 1: Redact emails for non-admins
const sanitizedActivities = activities.map(activity => ({
  ...activity,
  actorEmail: user.role === 'admin' ? activity.actorEmail : '[redacted]'
}));

// Option 2: Don't store/expose emails at all (use IDs only)
// Fetch user details on-demand when admin views activity
```

#### High Severity: No Metadata Sanitization
**Current Implementation:**
```typescript
metadata: metadata || {},
```

**Risk:**
- Metadata can contain ANYTHING
- No validation or sanitization
- Could store credentials, tokens, API keys

**Example Attack:**
```typescript
// Accidentally (or maliciously) logging sensitive data
metadata: {
  userPassword: "hunter2",
  apiKey: "sk_live_123456",
  creditCard: "4111-1111-1111-1111"
}
```

**Recommendation:**
```typescript
// Validate and sanitize metadata
function sanitizeMetadata(metadata: any): Record<string, any> {
  if (!metadata || typeof metadata !== 'object') return {};

  const dangerous = ['password', 'token', 'key', 'secret', 'credential'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Block dangerous keys
    if (dangerous.some(term => key.toLowerCase().includes(term))) {
      continue;
    }

    // Limit string length
    if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = value.substring(0, 1000) + '... (truncated)';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

---

### 9. Error Message Leakage ⚠️ WARNING
**Score: 7/10**

**Issues Identified:**

#### Medium Severity: Stack Traces in Error Responses
**Vulnerable Code:**
```typescript
// Lines 57-59, 135-137
catch (error: any) {
  console.error('[GET /api/activity] Error:', error);
  return apiError(error.message || 'Failed to fetch activities', 401);
}
```

**Risk:**
- `error.message` may contain sensitive info:
  - Database connection strings
  - File paths
  - Internal IP addresses
  - Stack traces

**Example Leaked Info:**
```
Error: ECONNREFUSED firestore.googleapis.com:443 at /var/app/lib/firebase/admin.ts:42
```

**Recommendation:**
```typescript
catch (error: any) {
  console.error('[GET /api/activity] Error:', error); // OK for server logs

  // Generic error for client
  const clientMessage = process.env.NODE_ENV === 'production'
    ? 'Failed to fetch activities'
    : error.message; // Detailed errors in dev only

  return apiError(clientMessage, 500);
}
```

---

### 10. Security Logging ⚠️ WARNING
**Score: 5/10**

**Issues Identified:**

#### Medium Severity: Insufficient Security Event Logging
**Current Logging:**
- ✅ Activity creation logged
- ✅ Query success/failure logged
- ❌ Failed authentication attempts NOT logged
- ❌ Authorization failures NOT logged
- ❌ Suspicious activity NOT logged

**Missing Security Events:**
- Failed authentication attempts (potential brute force)
- Authorization failures (potential privilege escalation attempts)
- Rate limit violations
- Invalid input attempts (potential attack probing)

**Recommendation:**
```typescript
// Log security events
if (!requireRole(user, ['admin', 'teacher'])) {
  console.warn('[SECURITY] Authorization failed:', {
    userId: user.uid,
    role: user.role,
    endpoint: '/api/activity',
    timestamp: Date.now(),
  });
  return apiError('Insufficient permissions', 403);
}

// Log suspicious activity
if (body.metadata && Object.keys(body.metadata).length > 20) {
  console.warn('[SECURITY] Suspicious metadata size:', {
    userId: user.uid,
    metadataKeys: Object.keys(body.metadata).length,
  });
}
```

---

### 11. Firestore Security Rules ⚠️ CRITICAL
**Score: 0/10**

**CRITICAL ISSUE: Missing Security Rules for Activities Collection**

**Current State:**
```firestore
// firestore.rules - Line 250-252
match /{document=**} {
  allow read, write: if false;  // Default deny
}
```

**Analysis:**
- ✅ Default deny is good
- ❌ No explicit rules for `activities` collection
- ⚠️ Activities collection is **inaccessible** from client-side
- ✅ Server-side (Admin SDK) bypasses rules (OK for this use case)

**Risk:**
While this is currently "secure" (deny all), it's not intentional security. If anyone adds client-side Firestore access or changes the default rule, activities could be exposed.

**Recommendation:**
Add explicit security rules:

```firestore
// ==========================================
// COLLECTION: activities/{activityId}
// Admin Web: Activity logs (Admin/Teacher read, Server write)
// ==========================================
match /activities/{activityId} {
  // Read: Admin can read all, teachers can read only their own
  allow read: if isAdmin() ||
                 (isTeacher() && resource.data.actor_id == request.auth.uid);

  // Write: Server-side only (Admin SDK)
  allow write: if false;

  // Note: Activities should only be created via API routes
  // using Admin SDK which bypasses these rules
}
```

---

## Vulnerability Summary

### Critical Vulnerabilities (Requires Immediate Fix)
1. **Missing Rate Limiting** - DoS vulnerability, cost escalation risk
2. **Missing Firestore Security Rules** - No defense-in-depth
3. **Insufficient Input Validation** - Type safety, injection risks

### High Vulnerabilities (Fix Before Production)
1. **Actor Impersonation** - Users can spoof identity in POST requests
2. **Metadata Injection** - No sanitization of arbitrary metadata

### Medium Vulnerabilities (Should Fix)
1. **Overly Permissive Authorization** - Teachers can view all activities
2. **Sensitive Data Logging** - Email addresses exposed, excessive logging
3. **Error Message Leakage** - Stack traces in production errors

### Low Vulnerabilities (Nice to Have)
1. **Insufficient Security Logging** - Missing audit trail for security events

---

## Recommendations Priority

### P0 (Critical - Fix Immediately)
1. ✅ Add input validation for `type`, `category`, string lengths
2. ✅ Implement rate limiting (10-20 requests/minute per user)
3. ✅ Add Firestore security rules for activities collection

### P1 (High - Fix Before Production)
4. ✅ Force `actorId`, `actorName`, `actorEmail` from authenticated user (don't trust client)
5. ✅ Sanitize and validate `metadata` object
6. ✅ Restrict teachers to viewing only their own activities

### P2 (Medium - Fix Soon)
7. ✅ Redact sensitive data (emails) for non-admin users
8. ✅ Add security event logging (auth failures, suspicious activity)
9. ✅ Generic error messages in production

### P3 (Low - Nice to Have)
10. ✅ Consider adding DOMPurify for description sanitization
11. ✅ Add monitoring/alerting for unusual activity patterns

---

## Secure Code Example

Here's a secure implementation of the POST endpoint:

```typescript
import { z } from 'zod';
import { checkRateLimit } from '@/lib/api/rate-limiter';

// Input validation schema
const ActivityInputSchema = z.object({
  type: z.enum([
    'user_created', 'user_updated', 'user_deleted',
    'program_created', 'program_updated', 'program_deleted',
    'lesson_created', 'lesson_updated', 'lesson_deleted',
    'content_created', 'content_updated', 'content_deleted',
    'user_login'
  ]),
  category: z.enum(['user', 'program', 'lesson', 'content', 'auth']),
  resourceId: z.string().max(100).optional(),
  resourceType: z.enum(['user', 'program', 'lesson', 'content']).optional(),
  resourceTitle: z.string().max(200).optional(),
  description: z.string().min(1).max(500),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await authenticateRequest(request);

    // 2. Check permissions
    if (!requireRole(user, ['admin', 'teacher'])) {
      console.warn('[SECURITY] Authorization failed for activity creation:', user.uid);
      return apiError('Insufficient permissions', 403);
    }

    // 3. Rate limiting
    const rateLimitOk = await checkRateLimit(user.uid);
    if (!rateLimitOk) {
      console.warn('[SECURITY] Rate limit exceeded:', user.uid);
      return apiError('Rate limit exceeded. Please try again later.', 429);
    }

    // 4. Parse and validate input
    const body = await request.json();
    const validationResult = ActivityInputSchema.safeParse(body);

    if (!validationResult.success) {
      return apiError('Invalid input: ' + validationResult.error.message, 400);
    }

    const { type, category, resourceId, resourceType, resourceTitle, description, metadata } = validationResult.data;

    // 5. Sanitize metadata
    const sanitizedMetadata = sanitizeMetadata(metadata);

    const firestore = getFirestore();

    // 6. Create activity - ALWAYS use authenticated user info
    const activityDoc = {
      type,
      category,
      actor_id: user.uid,  // NEVER trust client input
      actor_name: user.name || user.email?.split('@')[0] || 'Unknown',
      actor_email: user.email || '',
      resource_id: resourceId || null,
      resource_type: resourceType || null,
      resource_title: resourceTitle || null,
      description,
      metadata: sanitizedMetadata,
      created_at: Date.now(),
    };

    const docRef = await firestore.collection('activities').add(activityDoc);

    console.log('[POST /api/activity] Activity created:', docRef.id, 'by user:', user.uid);

    return apiSuccess(
      {
        id: docRef.id,
        type,
        category,
        actorId: activityDoc.actor_id,
        actorName: activityDoc.actor_name,
        // Redact email for non-admins
        actorEmail: user.role === 'admin' ? activityDoc.actor_email : '[redacted]',
        resourceId: activityDoc.resource_id,
        resourceType: activityDoc.resource_type,
        resourceTitle: activityDoc.resource_title,
        description,
        metadata: activityDoc.metadata,
        createdAt: activityDoc.created_at,
      },
      201
    );
  } catch (error: any) {
    console.error('[POST /api/activity] Error:', error);

    // Generic error message in production
    const clientMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to create activity'
      : error.message;

    return apiError(clientMessage, 500);
  }
}

function sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> {
  if (!metadata || typeof metadata !== 'object') return {};

  const dangerous = ['password', 'token', 'key', 'secret', 'credential', 'apikey'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (dangerous.some(term => key.toLowerCase().includes(term))) {
      continue; // Skip dangerous keys
    }

    if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = value.substring(0, 1000) + '... (truncated)';
    } else if (typeof value === 'object' && value !== null) {
      // Prevent nested object injection
      sanitized[key] = '[object]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

---

## Testing Recommendations

### Security Test Cases

1. **Authentication Tests**
   - ✅ Request without token → 401
   - ✅ Request with expired token → 401
   - ✅ Request with invalid token → 401

2. **Authorization Tests**
   - ✅ Viewer role → 403
   - ✅ Teacher viewing other teacher's activities → 403 (after fix)
   - ✅ Teacher creating activity → 200

3. **Input Validation Tests**
   - ✅ Invalid activity type → 400
   - ✅ Description > 500 chars → 400
   - ✅ Missing required fields → 400
   - ✅ Metadata with dangerous keys → Keys filtered

4. **Rate Limiting Tests**
   - ✅ 11 requests in 1 minute → 429 on 11th request

5. **Injection Tests**
   - ✅ XSS in description → Escaped on render
   - ✅ NoSQL injection in metadata → No effect

---

## Compliance Considerations

### GDPR
- ⚠️ Activity logs contain PII (email addresses)
- ⚠️ No data retention policy
- ⚠️ No "right to be forgotten" implementation

**Recommendation:**
- Add automatic log expiration (e.g., 90 days)
- Implement data export for user activities
- Add deletion handler when user accounts are deleted

### SOC 2
- ⚠️ Insufficient access logging
- ⚠️ No activity log integrity verification

**Recommendation:**
- Add cryptographic signatures to activity logs
- Implement append-only audit trail

---

## Final Recommendation

### Status: ⚠️ CONDITIONAL APPROVAL

**Can deploy to staging:** ✅ Yes
**Can deploy to production:** ⚠️ Only after P0 fixes

The Recent Activity Feed feature is **reasonably secure** for internal admin use but requires critical fixes before production deployment. The authentication and basic authorization are solid, but the lack of input validation, rate limiting, and Firestore security rules creates exploitable vulnerabilities.

### Action Items Before Production

1. **Mandatory (P0):**
   - [ ] Add comprehensive input validation (zod schema)
   - [ ] Implement rate limiting middleware
   - [ ] Add Firestore security rules for activities collection
   - [ ] Force actor info from authenticated user (prevent spoofing)

2. **Strongly Recommended (P1):**
   - [ ] Sanitize metadata object
   - [ ] Restrict teacher activity viewing to own activities
   - [ ] Add security event logging

3. **Good to Have (P2):**
   - [ ] Implement data retention policy
   - [ ] Add monitoring for suspicious patterns
   - [ ] Generic error messages in production

### Security Monitoring

Once deployed, monitor for:
- Unusual spike in activity creation
- Failed authentication attempts
- Authorization failures (403 responses)
- Large metadata payloads
- Repeated rate limit violations

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/best-practices)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

---

**Report Generated:** 2025-10-27
**Next Review:** After P0 fixes implemented
**Contact:** Security Team
